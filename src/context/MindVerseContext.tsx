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
  useState,
  type ReactNode,
} from "react";
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

interface MindVerseState {
  // identity / onboarding
  userName: string | null;
  setUserName: (n: string) => void;

  // navigation
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;

  // mood
  currentMood: MoodResult;
  setCurrentMood: (m: MoodResult) => void;

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

export function MindVerseProvider({ children }: { children: ReactNode }) {
  // --- initial state -------------------------------------------------------
  // We start optimistic: a "Calm" mood at 34% stress matches the spec default.
  const [userName, setUserNameState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("home");
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
  const [isMuted, setIsMuted] = useState(true);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [moodJournal, setMoodJournal] = useState<MoodJournalEntry[]>(seedJournal);

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
      if (parsed.mlInputs) setMlInputsState((p) => ({ ...p, ...parsed.mlInputs }));
      if (parsed.currentMood) setCurrentMood(parsed.currentMood);
      if (Array.isArray(parsed.completedMissions)) setCompletedMissions(parsed.completedMissions);
      if (Array.isArray(parsed.moodJournal) && parsed.moodJournal.length) {
        setMoodJournal(parsed.moodJournal);
      }
      if (typeof parsed.isMuted === "boolean") setIsMuted(parsed.isMuted);
    } catch {
      /* swallow — corrupt storage shouldn't break the app */
    }
  }, []);

  // --- persist on change (client only) -------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      userName,
      mlInputs,
      currentMood,
      completedMissions,
      moodJournal,
      isMuted,
    };
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      /* quota exceeded — silently ignore */
    }
  }, [userName, mlInputs, currentMood, completedMissions, moodJournal, isMuted]);

  // --- stable action creators ---------------------------------------------
  const setUserName = useCallback((n: string) => setUserNameState(n.trim() || null), []);
  const setMlInputs = useCallback(
    (patch: Partial<MlInputs>) => setMlInputsState((prev) => ({ ...prev, ...patch })),
    [],
  );
  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const toggleMission = useCallback((id: string) => {
    setCompletedMissions((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }, []);

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
      activeTab,
      setActiveTab,
      currentMood,
      setCurrentMood,
      mlInputs,
      setMlInputs,
      isMuted,
      toggleMute,
      completedMissions,
      toggleMission,
      moodJournal,
      logMoodToJournal,
    }),
    [
      userName, setUserName,
      activeTab,
      currentMood,
      mlInputs, setMlInputs,
      isMuted, toggleMute,
      completedMissions, toggleMission,
      moodJournal, logMoodToJournal,
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
