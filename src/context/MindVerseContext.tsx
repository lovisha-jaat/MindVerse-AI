/**
 * MindVerseContext.tsx
 * -----------------------------------------------------------------------------
 * The single source of truth for the MindVerse AI workspace.
 *
 * Everything that needs to be shared between tabs (the user's name, the
 * currently-predicted mood, the raw ML feature inputs, the ambient audio
 * mute state, and the list of completed daily missions) lives here.
 *
 * Why a custom Context instead of Zustand / Redux?
 *   - The state graph is small and mostly flat.
 *   - We need SSR-safe behaviour (TanStack Start prerenders routes) — Context
 *     is trivially serialisable.
 *   - Persistence is opt-in via localStorage with guarded `typeof window`
 *     checks so the provider stays render-pure during SSR.
 *
 * How state propagates after an ML prediction:
 *   1. ML Predictor view collects slider/dropdown/toggle values.
 *   2. It calls `predictStress(mlInputs)` from `lib/stressModel`.
 *   3. The returned MoodResult is pushed into context via `setCurrentMood`.
 *   4. Any subscriber (BottomNav badge, Home ring, Bear Room weather) reads
 *      `currentMood.color` and re-renders. Because the color value is a hex
 *      string we inject it inline as a CSS custom property `--mood-color`
 *      on the workspace root — see WorkspaceShell.tsx.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { applyMissionRelief } from "@/lib/recoveryMissions";
import {
  predictStress,
  tierFromScore,
  type MlInputs,
  type MoodResult,
} from "@/lib/stressModel";

/** All five primary tabs of the mobile-app shell. */
export type TabId = "home" | "predictor" | "bear-room" | "sounds" | "profile";

/** A single completed mood journal entry — keyed by ISO date string. */
export interface MoodJournalEntry {
  date: string;       // YYYY-MM-DD
  label: string;
  color: string;
  emoji: string;
  stressLevel: number;
}

interface GratitudeEntry {
  id: string;
  date: string;
  text: string;
}

interface MindVerseState {
  // identity / onboarding
  userName: string | null;
  setUserName: (n: string) => void;
  logout: () => void;

  // companion
  companionName: string;
  setCompanionName: (n: string) => void;

  // global audio manager
  playSound: (src: string, id: string) => void;
  stopSound: () => void;
  currentlyPlayingSoundId: string | null;

  // navigation
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;

  // mood
  /** Raw ML-derived mood before mission relief is applied. */
  currentMood: MoodResult;
  setCurrentMood: (m: MoodResult) => void;
  /**
   * Mood after Recovery Mission relief weights are subtracted from stress.
   * HomeView dashboard metrics (Energy / Happiness / Focus) MUST read this
   * value so checklist toggles immediately move the pastel metric bars.
   */
  effectiveMood: MoodResult;

  // settings
  pushReminders: boolean;
  togglePushReminders: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;

  // ML feature vector
  mlInputs: MlInputs;
  setMlInputs: (patch: Partial<MlInputs>) => void;

  // audio
  isMuted: boolean;
  toggleMute: () => void;

  // gamification
  completedMissions: string[];
  toggleMission: (id: string) => void;

  // historical journal (used by the Mood Journal calendar in the predictor)
  moodJournal: MoodJournalEntry[];
  logMoodToJournal: (mood: MoodResult) => void;

  // gratitude journal
  gratitudeJournal: GratitudeEntry[];
  addGratitudeEntry: (text: string) => void;
  removeGratitudeEntry: (id: string) => void;

  // custom calm quotes
  customQuotes: string[];
  addCustomQuote: (text: string) => void;
  removeCustomQuote: (index: number) => void;
}

/** localStorage key namespace — bump the version to invalidate old shapes. */
const LS_KEY = "mindverse:v1";

const MindVerseContext = createContext<MindVerseState | null>(null);

/** Build a deterministic, mildly-randomised demo history for first-run UX. */
function seedJournal(): MoodJournalEntry[] {
  const out: MoodJournalEntry[] = [];
  const today = new Date();
  // 21 trailing days so the calendar grid is comfortably populated.
  for (let i = 20; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // pseudo-random but deterministic per-day score so reloads don't flicker
    const score = Math.round(20 + ((i * 37) % 65));
    const tier = tierFromScore(score);
    out.push({
      date: d.toISOString().slice(0, 10),
      label: tier.label,
      color: tier.color,
      emoji: tier.emoji,
      stressLevel: score,
    });
  }
  return out;
}

// Notification reminder messages
const REMINDER_MESSAGES = [
  "Hey! Time for a quick mood check-in 🌸",
  "Don't forget to take a break and breathe 🧘",
  "How are you feeling today? Let's check in 🦊",
  "Time to complete your recovery missions ✨",
  "Take a moment for yourself — you deserve it 💖",
];

export function MindVerseProvider({ children }: { children: ReactNode }) {
  // --- initial state -------------------------------------------------------
  // We start optimistic: a "Calm" mood at 34% stress matches the spec default.
  const [userName, setUserNameState] = useState<string | null>(null);
  const [companionName, setCompanionNameState] = useState<string>("Coco");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [currentlyPlayingSoundId, setCurrentlyPlayingSoundId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentlyPlayingIdRef = useRef<string | null>(null);
  const reminderIntervalRef = useRef<number | null>(null);
  const isLoggingOutRef = useRef(false); // Flag to prevent persistence during logout
  const [currentMood, setCurrentMood] = useState<MoodResult>({
    label: "Calm",
    color: "#A8D5BA",
    emoji: "😌",
    stressLevel: 34,
  });
  const [mlInputs, setMlInputsState] = useState<MlInputs>({
    sleepHours: 7,
    studyHours: 4,
    screenTime: 5,
    caffeine: "Medium",
    heartRate: 72,
    hrvLinked: false,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [moodJournal, setMoodJournal] = useState<MoodJournalEntry[]>(seedJournal());
  const [gratitudeJournal, setGratitudeJournal] = useState<GratitudeEntry[]>([]);
  const [customQuotes, setCustomQuotes] = useState<string[]>([]);
  const [pushReminders, setPushReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // --- hydrate from localStorage (client only) -----------------------------
  // We guard with `typeof window` because the provider runs during SSR where
  // `localStorage` is undefined. We only hydrate once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.userName) setUserNameState(parsed.userName);
      // Always set default to "Coco" if no companionName or it's "Pip" (old default)
      if (parsed.companionName && parsed.companionName !== "Pip") setCompanionNameState(parsed.companionName);
      else setCompanionNameState("Coco");
      if (parsed.mlInputs) setMlInputsState((p) => ({ ...p, ...parsed.mlInputs }));
      if (parsed.currentMood) setCurrentMood(parsed.currentMood);
      if (Array.isArray(parsed.completedMissions)) setCompletedMissions(parsed.completedMissions);
      if (Array.isArray(parsed.moodJournal) && parsed.moodJournal.length) {
        setMoodJournal(parsed.moodJournal);
      }
      if (Array.isArray(parsed.gratitudeJournal)) setGratitudeJournal(parsed.gratitudeJournal);
      if (Array.isArray(parsed.customQuotes)) setCustomQuotes(parsed.customQuotes);
      if (typeof parsed.isMuted === "boolean") setIsMuted(parsed.isMuted);
      if (typeof parsed.pushReminders === "boolean") setPushReminders(parsed.pushReminders);
      if (typeof parsed.darkMode === "boolean") setDarkMode(parsed.darkMode);
    } catch {
      /* swallow — corrupt storage shouldn't break the app */
    }
  }, []);

  // --- persist on change (client only) -------------------------------------
  useEffect(() => {
    if (typeof window === "undefined" || isLoggingOutRef.current) return;
    const payload = {
      userName,
      companionName,
      mlInputs,
      currentMood,
      completedMissions,
      moodJournal,
      gratitudeJournal,
      customQuotes,
      isMuted,
      pushReminders,
      darkMode,
    };
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      /* quota exceeded — silently ignore */
    }
  }, [userName, companionName, mlInputs, currentMood, completedMissions, moodJournal, gratitudeJournal, customQuotes, isMuted, pushReminders, darkMode]);

  // Apply / remove the `dark` class on <html> when the user toggles dark mode.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Logout function to reset all state
  const logout = useCallback(() => {
    isLoggingOutRef.current = true; // Disable persistence
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
    }
    setUserName(null);
    setCompanionName("Coco");
    setCurrentMood({
      label: "Calm",
      color: "#A8D5BA",
      emoji: "😌",
      stressLevel: 34,
    });
    setMlInputs({
      sleepHours: 7,
      studyHours: 4,
      screenTime: 5,
      caffeine: "Medium",
      heartRate: 72,
      hrvLinked: false,
    });
    setIsMuted(false);
    setCompletedMissions([]);
    setMoodJournal(seedJournal());
    setGratitudeJournal([]);
    setCustomQuotes([]);
    setPushReminders(true);
    setDarkMode(false);
    setActiveTab("home");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    currentlyPlayingIdRef.current = null;
    setCurrentlyPlayingSoundId(null);
    
    // Re-enable persistence after a short delay
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 500);
  }, []);

  // Update audio's muted state when isMuted changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Send a single notification
  const sendNotification = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const message = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
    new Notification("MindVerse", {
      body: message,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23A8D5BA'/%3E%3Ctext x='50' y='65' font-size='40' text-anchor='middle' fill='white'%3E🦊%3C/text%3E%3C/svg%3E",
    });
  }, []);

  // Start/stop reminders based on pushReminders state
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (reminderIntervalRef.current) {
      window.clearInterval(reminderIntervalRef.current);
      reminderIntervalRef.current = null;
    }

    if (pushReminders && Notification.permission === "granted") {
      // Send reminder every 4 hours (4 * 60 * 60 * 1000 ms)
      reminderIntervalRef.current = window.setInterval(sendNotification, 4 * 60 * 60 * 1000);
    }
  }, [pushReminders, sendNotification]);

  // --- stable action creators ---------------------------------------------
  const setUserName = useCallback((n: string) => setUserNameState(n.trim() || null), []);
  const setCompanionName = useCallback((n: string) => setCompanionNameState(n.trim() || "Coco"), []);
  const setMlInputs = useCallback(
    (patch: Partial<MlInputs>) => setMlInputsState((prev) => ({ ...prev, ...patch })),
    [],
  );
  
  const playSound = useCallback((src: string, id: string) => {
    // If we're already playing this sound, stop it
    if (currentlyPlayingIdRef.current === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      currentlyPlayingIdRef.current = null;
      setCurrentlyPlayingSoundId(null);
      return;
    }
    
    // Stop any currently playing sound first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Create new audio element only if we're playing a new sound
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.7;
    audio.muted = isMuted;
    audioRef.current = audio;
    currentlyPlayingIdRef.current = id;
    setCurrentlyPlayingSoundId(id);
    audio.play().catch((err) => console.error("Error playing sound:", err));
  }, [isMuted]);
  
  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    currentlyPlayingIdRef.current = null;
    setCurrentlyPlayingSoundId(null);
  }, []);
  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const togglePushReminders = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushReminders(false);
      return;
    }

    if (!pushReminders && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushReminders(false);
        return;
      }
    }

    setPushReminders((p) => !p);
  }, [pushReminders]);
  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), []);

  const addGratitudeEntry = useCallback((text: string) => {
    const newEntry: GratitudeEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      text: text.trim(),
    };
    setGratitudeJournal((prev) => [...prev, newEntry]);
  }, []);

  const removeGratitudeEntry = useCallback((id: string) => {
    setGratitudeJournal((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addCustomQuote = useCallback((text: string) => {
    setCustomQuotes((prev) => [...prev, text.trim()]);
  }, []);

  const removeCustomQuote = useCallback((index: number) => {
    setCustomQuotes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Toggle a Recovery Mission id in `completedMissions`.
   *
   * This is the single mutation entry-point for checklist interactions.
   * We intentionally do NOT adjust `currentMood` here — instead,
   * `effectiveMood` is derived in the memo below via `applyMissionRelief`,
   * which sums each mission's `stressRelief` weight and subtracts the total
   * from the ML stress score. HomeView then maps the lowered stress into
   * higher Energy / Happiness percentages through `dashboardMetrics.ts`.
   */
  const toggleMission = useCallback((id: string) => {
    setCompletedMissions((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }, []);

  /** Mission-adjusted mood consumed by dashboard metric subscribers. */
  const effectiveMood = useMemo(
    () => applyMissionRelief(currentMood, completedMissions),
    [currentMood, completedMissions],
  );

  /**
   * Append today's mood to the journal. If today already has an entry we
   * *replace* it — the journal stores only one definitive mood per day.
   */
  const logMoodToJournal = useCallback((mood: MoodResult) => {
    const today = new Date().toISOString().slice(0, 10);
    setMoodJournal((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      return [
        ...filtered,
        { date: today, label: mood.label, color: mood.color, emoji: mood.emoji, stressLevel: mood.stressLevel },
      ];
    });
  }, []);

  // Memoise the context value so consumers don't re-render unless something
  // they actually depend on changed. This is the standard React Context
  // performance pattern when several unrelated state slices co-exist.
  const value = useMemo<MindVerseState>(
    () => ({
      userName,
      setUserName,
      logout,
      companionName,
      setCompanionName,
      playSound,
      stopSound,
      currentlyPlayingSoundId,
      activeTab,
      setActiveTab,
      currentMood,
      setCurrentMood,
      effectiveMood,
      mlInputs,
      setMlInputs,
      isMuted,
      toggleMute,
      completedMissions,
      toggleMission,
      moodJournal,
      logMoodToJournal,
      gratitudeJournal,
      addGratitudeEntry,
      removeGratitudeEntry,
      customQuotes,
      addCustomQuote,
      removeCustomQuote,
      pushReminders,
      togglePushReminders,
      darkMode,
      toggleDarkMode,
    }),
    [
      userName, setUserName,
      companionName, setCompanionName,
      playSound,
      stopSound,
      currentlyPlayingSoundId,
      activeTab,
      currentMood,
      effectiveMood,
      mlInputs, setMlInputs,
      isMuted, toggleMute,
      completedMissions, toggleMission,
      moodJournal, logMoodToJournal,
      gratitudeJournal, addGratitudeEntry, removeGratitudeEntry,
      customQuotes, addCustomQuote, removeCustomQuote,
      pushReminders, togglePushReminders,
      darkMode, toggleDarkMode,
    ],
  );

  return <MindVerseContext.Provider value={value}>{children}</MindVerseContext.Provider>;
}

/** Convenience hook with a friendly error when used outside the provider. */
export function useMindVerse() {
  const ctx = useContext(MindVerseContext);
  if (!ctx) throw new Error("useMindVerse must be used inside <MindVerseProvider>");
  return ctx;
}

/** Re-export the prediction helper so call-sites don't need two imports. */
export { predictStress };
