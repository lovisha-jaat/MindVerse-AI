/**
 * BearRoomView.tsx — The Cozy Sanctuary Room
 * -----------------------------------------------------------------------------
 * A warm, interactive virtual room where every object on screen is a tiny
 * stress-relief tool. The user's AI companion (a cute fox named "Pip") sits
 * inside the room and recommends an activity based on how the user feels.
 *
 * Layout of the room (clickable spots):
 *   📖 Book of Calm      → opens a card with a soothing quote that changes
 *   🫧 Bubble Pop        → mini-game; tap floating bubbles to pop them
 *   🌬️ Breathing Orb     → 4-4-6 guided breathing circle
 *   🖌️ Zen Sand           → drag your finger to leave trailing sand patterns
 *   🎵 Music Box         → toggles a soft chime hint and pulses the room
 *   🦊 Pip the Fox       → tap to ask "how are you?" and get a suggestion
 *
 * Mood → Suggestion flow:
 *   1. User taps a feeling chip ("Good / Tense / Stressed / Horrible").
 *   2. `suggestionFor(mood)` returns a personalised line from Pip that names
 *      one of the room's tools and asks the user to try it.
 *   3. The recommended tool gets a soft highlight ring so it's easy to find.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from "react";
import {
  BookOpen,
  Sparkles,
  Wind,
  Music2,
  X,
  Send,
  MessageCircle,
  Mic,
  Heart,
  Plus,
  Trash2,
} from "lucide-react";
import foxImg from "@/assets/fox.png";
import { useMindVerse } from "@/context/MindVerseContext";
import OpenAI from "openai";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Mood feelings + companion suggestions                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type Feeling = "good" | "tense" | "stressed" | "horrible";
type ToolId = "book" | "bubbles" | "breathe" | "sand" | "music" | "gratitude";

const FEELINGS: { id: Feeling; label: string; emoji: string; tone: string }[] = [
  { id: "good", label: "Good", emoji: "🙂", tone: "var(--butter-soft)" },
  { id: "tense", label: "Tense", emoji: "😅", tone: "var(--peach-soft)" },
  { id: "stressed", label: "Stressed", emoji: "😔", tone: "var(--lavender-soft)" },
  { id: "horrible", label: "Horrible", emoji: "😞", tone: "var(--sky-soft)" },
];

/** Pip's recommendation for each feeling — names the exact tool to try. */
function suggestionFor(name: string, f: Feeling): { tool: ToolId; line: string } {
  switch (f) {
    case "good":
      return {
        tool: "music",
        line: `Yay ${name}! Let's keep the good vibe — tap the Music Box and let the room hum with you. 🎵`,
      };
    case "tense":
      return {
        tool: "breathe",
        line: `I feel you, ${name}. Try the Breathing Orb with me — three slow rounds will loosen the knot.`,
      };
    case "stressed":
      return {
        tool: "bubbles",
        line: `Stress lives in the body, ${name}. Pop the bubbles with me — each pop = one worry released. 🫧`,
      };
    case "horrible":
      return {
        tool: "book",
        line: `I'm right here, ${name}. Open the Book of Calm — let one line hold you for a moment. 📖`,
      };
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Calming quotes shown by the Book                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

const CALM_LINES = [
  "You don't have to be productive to be worthy of rest.",
  "This feeling is a visitor, not a tenant. It will move on.",
  "Breathe in for 4, out for 6. Your body is listening.",
  "Soften your jaw. Drop your shoulders. You made it this far.",
  "Small steps in the right direction are still progress.",
  "You are allowed to take up space and to be still.",
  "The wave of stress rises — and it always, always falls.",
  "Be as kind to yourself as you would be to a tired friend.",
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* Enhanced chat phrase bank with app knowledge and mood-based actions        */
/* ─────────────────────────────────────────────────────────────────────────── */

interface ActionType {
  type: "openTool" | "navigate" | "openSound";
  data?: any;
}

const THERAPY_BANK: {
  match: RegExp;
  reply: (name: string, companionName: string) => string;
  action?: ActionType;
}[] = [
  // Super simple test cases
  {
    match: /^test bubbles$/i,
    reply: (n, c) => `Okay ${n}, opening bubbles! 🎉`,
    action: { type: "openTool", data: "bubbles" },
  },
  {
    match: /^test sounds$/i,
    reply: (n, c) => `Okay ${n}, taking you to sounds! 🎵`,
    action: { type: "navigate", data: "sounds" },
  },
  {
    match: /^test book$/i,
    reply: (n, c) => `Okay ${n}, opening the book! 📖`,
    action: { type: "openTool", data: "book" },
  },
  // Sad/down/unhappy/upset -> Book of Calm (MOST SPECIFIC FIRST!)
  {
    match:
      /(i('m| am)? (sad|down|unhappy|upset|not feeling well|feeling down|depressed|crying|lonely|heartbroken|empty|miserable|gloomy|dejected|broken|heartbroken|gutted|down in the dumps|low|glum))|(feeling sad)|(i feel sad)|(i don't feel good)|(i dont feel good)|(i don't feel well)|(i dont feel well)|(i don't feel fine)|(i dont feel fine)|(i don't feel okay)|(i dont feel okay)|(doesn't feel good)|(doesnt feel good)|(doesn't feel well)|(doesnt feel well)|(not okay)|(i('m| am)? not (good|well|fine|okay|great|alright))|(feels? not good)|(feels? bad)|(i('m| am)? feeling bad)|(i('m| am)? not feeling it)|(i('m| am)? having a bad day)|(i('m| am)? not in a good mood)|(i('m| am)? in a bad mood)|(i('m| am)? feeling low)|(i('m| am)? feeling empty)|(i('m| am)? feeling miserable)|(i('m| am)? feeling lonely)|(i('m| am)? feeling heartbroken)|(having a bad time)|(really sad)|(so sad)|(very sad)|(feeling really down)/i,
    reply: (n, c) =>
      `Oh ${n}, my heart goes out to you 💛. I'm so glad you're sharing this with me — let's look at the Book of Calm together for some gentle words, and the 528 Hz frequency in Sounds tab might help lift your spirits a little. I'm not going anywhere, okay?`,
    action: { type: "openTool", data: "book" },
  },
  // Anxious/worried/stressed/overwhelmed/nervous -> Bubble Pop
  {
    match:
      /(i('m| am)? (anxious|worried|stressed|overwhelmed|nervous|panicking))|(feeling anxious)|(i feel anxious)|(stressed out)|(having anxiety)/i,
    reply: (n, c) =>
      `Hey ${n}, it's okay to feel this way — I'm right here with you 🧘. Let's pop some bubbles together to release that tension, and then the Theta Waves sounds in Sounds tab can help calm your mind. You're not alone in this!`,
    action: { type: "openTool", data: "bubbles" },
  },
  // Tired/sleepy/exhausted -> Breathing Orb
  {
    match:
      /(i('m| am)? (tired|sleepy|exhausted|worn out|wiped out|need sleep|can't sleep))|(feeling tired)|(i feel tired)/i,
    reply: (n, c) =>
      `Oh ${n}, I can feel how tired you are 💜. Let's take a break together — I'm opening the Breathing Orb to help you slow down, and I really recommend the Delta Waves sounds in the Sounds tab for deep relaxation. You deserve this rest!`,
    action: { type: "openTool", data: "breathe" },
  },
  // Angry/mad/frustrated/irritated -> Zen Sand
  {
    match:
      /(i('m| am)? (angry|mad|frustrated|irritated|annoyed|furious))|(feeling angry)|(i feel angry)|(so mad)|(really frustrated)/i,
    reply: (n, c) =>
      `I get it, ${n} — that frustration is valid 🔥. Let's channel that energy into the Zen Sand tray — draw whatever you need to, and the 417 Hz sounds in Sounds tab can help you release that tension in a gentle way.`,
    action: { type: "openTool", data: "sand" },
  },
  // Focus/study/work/concentrate -> Breathing Orb
  {
    match:
      /(i ('m| am)? trying to (focus|study|work|concentrate))|(need to focus)|(can't focus)|(having trouble concentrating)/i,
    reply: (n, c) =>
      `Cognitive load can feel so heavy, ${n} — I see how hard you're trying 💪. Let's do a quick breathing exercise first to reset, and then the Alpha Waves sounds in the Sounds tab can help you get into a focused flow state!`,
    action: { type: "openTool", data: "breathe" },
  },
  // Ask about sounds/music/frequencies -> Navigate to Sounds tab
  {
    match: /(sounds?|music|ambient|frequency|frequencies|listen to something|play music)/i,
    reply: (n, c) =>
      `Absolutely, ${n}! 🎵 I'm taking you straight to the Sounds tab — we have beautiful ambient mixes and healing frequencies for every mood. Let's go explore together!`,
    action: { type: "navigate", data: "sounds" },
  },
  // Ask about games/play -> Bubble Pop
  {
    match: /(game|games|play|fun|want to play|play something)/i,
    reply: (n, c) =>
      `Yes! Let's play! 🎮 I'm opening the Bubble Pop game for you — let's see how many you can pop together!`,
    action: { type: "openTool", data: "bubbles" },
  },
  // Ask to change name
  {
    match: /(change your name|rename|call you|what's your name|your name)/i,
    reply: (n, c) =>
      `Of course, ${n}! 💖 You can change my name anytime in the Profile tab — whatever feels right to you! I'm so glad you want to make our space even more personal.`,
  },
  // Greetings
  {
    match: /(hi|hello|hey|good morning|good afternoon|good evening|what's up|sup)/i,
    reply: (n, c) =>
      `Hey ${n}! So glad you're here 🤗. How are you feeling today? I'm ready to help with whatever you need — whether it's a breathing exercise, some bubble popping, or just a listening ear.`,
  },
  // Ask how are you
  {
    match: /(how are you|how r u|how you doing)/i,
    reply: (n, c) =>
      `I'm doing wonderful, ${n} — especially now that you're here! 🥰 But enough about me — how are YOU doing? Tell me what's on your mind or how you're feeling right now.`,
  },
  // Thank you/positive feedback (NOW MORE SPECIFIC, AT END!)
  {
    match: /(thank|thanks|thank you|that's better|i feel better|that helped)/i,
    reply: (n, c) =>
      `You're so welcome, ${n}! 🦊 It makes my heart happy to see you feeling a little better. Noticing what's working teaches your nervous system where safety lives. I'll always be right here whenever you need me!`,
  },
];

const FALLBACK = (n: string, c: string) =>
  `I'm so glad you're talking to me, ${n} 💖! I'm here for whatever you need — whether you want to try one of our cozy tools, listen to some calming sounds, or just chat about how you're feeling. Take your time — what would feel most helpful right now?`;

interface ChatMessage {
  id: string;
  from: "user" | "fox";
  text: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export function BearRoomView() {
  const { userName, currentMood, setActiveTab, companionName } = useMindVerse();
  const name = userName ?? "friend";

  // Which room tool is currently open in the modal? `null` means none.
  const [openTool, setOpenTool] = useState<ToolId | null>(null);

  // Which feeling did the user share? Drives Pip's suggestion + highlight.
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const suggestion = feeling ? suggestionFor(name, feeling) : null;

  // Coco's default greeting line if no feeling has been picked yet.
  const greeting = useMemo(
    () =>
      `Hey ${name}, I'm ${companionName} 🦊 — tap how you feel and I'll suggest something cozy, or just chat with me!`,
    [name, companionName],
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <style>{ROOM_CSS}</style>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Sanctuary</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          {companionName}'s Cozy Room
        </h1>
        <p className="text-sm text-muted-foreground">
          A safe place. Come here for a quick reset any time of day.
        </p>
      </header>

      {/* ── ROOM SCENE ──────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[28px] bg-card p-3 shadow-soft">
        <div className="room-canvas relative h-[420px] overflow-hidden rounded-[24px] sm:h-[460px]">
          {/* Ambient room lighting overlay */}
          <div className="room-lighting" aria-hidden />

          {/* Warm wallpapered walls */}
          <div className="room-walls" aria-hidden />

          {/* Framed picture on wall */}
          <div className="room-picture" aria-hidden />

          {/* Cozy curtains */}
          <div className="room-curtain room-curtain-left" aria-hidden />
          <div className="room-curtain room-curtain-right" aria-hidden />

          {/* Large corner window with sky and clouds */}
          <div className="room-window" aria-hidden>
            <div className="room-sky" aria-hidden />
            <div className="room-cloud room-cloud-1" aria-hidden />
            <div className="room-cloud room-cloud-2" aria-hidden />
            <div className="room-cloud room-cloud-3" aria-hidden />
            <div className="room-pane room-pane-tl" aria-hidden />
            <div className="room-pane room-pane-tr" aria-hidden />
            <div className="room-pane room-pane-bl" aria-hidden />
            <div className="room-pane room-pane-br" aria-hidden />
            <div className="room-sun" aria-hidden />
            <div className="room-window-sill" aria-hidden />
          </div>

          {/* Wooden floor */}
          <div className="room-floor" aria-hidden />

          {/* Cozy patterned rug */}
          <div className="room-rug" aria-hidden />

          {/* Potted plant */}
          <div className="room-plant" aria-hidden />

          {/* Side table for the orb */}
          <div className="room-side-table" aria-hidden>
            <span></span>
          </div>

          {/* Table lamp on side table */}
          <div className="room-lamp" aria-hidden />

          {/* Cozy floor pillows near Pip */}
          <div className="room-pillow room-pillow-1" aria-hidden />
          <div className="room-pillow room-pillow-2" aria-hidden />

          {/* Small stack of books */}
          <div className="room-book-stack" aria-hidden />

          {/* ── Bookshelf with the Book of Calm ─────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("book")}
            aria-label="Open the Book of Calm"
            className={`room-item room-item-book ${suggestion?.tool === "book" ? "is-suggested" : ""}`}
          >
            <span className="room-bookshelf">
              <span className="room-spine room-spine-1" />
              <span className="room-spine room-spine-2" />
              <span className="room-spine room-spine-3" />
              <span className="room-spine room-spine-4" />
              <span className="room-spine room-spine-5" />
            </span>
            <span className="room-label">
              <BookOpen className="h-3 w-3" /> Book
            </span>
          </button>

          {/* ── Bubble jar (mini-game) ──────────────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("bubbles")}
            aria-label="Play the bubble pop game"
            className={`room-item room-item-jar ${suggestion?.tool === "bubbles" ? "is-suggested" : ""}`}
          >
            <span className="room-jar" />
            <span className="room-jar-bubble room-jar-bubble-1" />
            <span className="room-jar-bubble room-jar-bubble-2" />
            <span className="room-jar-bubble room-jar-bubble-3" />
            <span className="room-label">
              <Sparkles className="h-3 w-3" /> Bubbles
            </span>
          </button>

          {/* ── Breathing orb on a small table ──────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("breathe")}
            aria-label="Start the breathing orb"
            className={`room-item room-item-orb ${suggestion?.tool === "breathe" ? "is-suggested" : ""}`}
          >
            <span className="room-orb" />
            <span className="room-label">
              <Wind className="h-3 w-3" /> Breathe
            </span>
          </button>

          {/* ── Zen sand tray on the floor ──────────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("sand")}
            aria-label="Open the Zen sand tray"
            className={`room-item room-item-sand ${suggestion?.tool === "sand" ? "is-suggested" : ""}`}
          >
            <span className="room-sand-tray" />
            <span className="room-label">✦ Zen Sand</span>
          </button>

          {/* ── Music box on the shelf ──────────────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("music")}
            aria-label="Open the music box"
            className={`room-item room-item-music ${suggestion?.tool === "music" ? "is-suggested" : ""}`}
          >
            <span className="room-musicbox" />
            <span className="room-musicnote">♪</span>
            <span className="room-label">
              <Music2 className="h-3 w-3" /> Music
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpenTool("gratitude")}
            aria-label="Open gratitude journal"
            className={`room-item room-item-gratitude ${suggestion?.tool === "gratitude" ? "is-suggested" : ""}`}
          >
            <span className="text-2xl">💖</span>
            <span className="room-label">Gratitude</span>
          </button>

          {/* ── Pip the Fox — companion ─────────────────────────────── */}
          <div className="room-fox">
            <img
              src={foxImg}
              alt="Pip the fox companion"
              width={160}
              height={160}
              className="h-32 w-32 select-none object-contain drop-shadow-[0_18px_24px_rgba(140,80,30,0.35)] sm:h-36 sm:w-36"
              draggable={false}
            />
          </div>

          {/* Pip's floating speech bubble */}
          <div className="room-bubble">
            <p className="leading-snug">{suggestion?.line ?? greeting}</p>
          </div>
        </div>

        {/* ── Mood selector strip (the 4 feelings) ─────────────────── */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            How do you feel right now?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FEELINGS.map((f) => {
              const active = feeling === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFeeling(f.id)}
                  className={`rounded-2xl p-3 text-center transition shadow-soft ${
                    active ? "ring-2 ring-sage scale-[1.02]" : "hover:-translate-y-0.5"
                  }`}
                  style={{ background: f.tone }}
                >
                  <div className="text-2xl" aria-hidden>
                    {f.emoji}
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-foreground">{f.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ENHANCED CHAT ───────────────────────────────────────────────── */}
      <ChatConsole name={name} setOpenTool={setOpenTool} />

      {/* ── Tool modals ──────────────────────────────────────────────────── */}
      {openTool === "book" && <BookModal name={name} onClose={() => setOpenTool(null)} />}
      {openTool === "bubbles" && <BubblesModal onClose={() => setOpenTool(null)} />}
      {openTool === "breathe" && <BreatheModal onClose={() => setOpenTool(null)} />}
      {openTool === "sand" && <SandModal onClose={() => setOpenTool(null)} />}
      {openTool === "music" && (
        <MusicModal mood={currentMood.label} onClose={() => setOpenTool(null)} />
      )}
      {openTool === "gratitude" && <GratitudeModal onClose={() => setOpenTool(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Modal shell                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function Modal({
  title,
  onClose,
  children,
  tone = "bg-card",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  tone?: string;
}) {
  // Close on Escape — modest a11y nicety.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Prevent background scrolling when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 pb-24 overflow-y-auto"
      onClick={onClose}
      style={{ touchAction: "auto" }}
    >
      <div
        className={`w-full max-w-md rounded-[28px] ${tone} p-5 shadow-soft-lg animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "auto" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-extrabold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-soft"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="overflow-y-auto"
          style={{ touchAction: "auto", WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Book of Calm — random soothing quote                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function BookModal({ name, onClose }: { name: string; onClose: () => void }) {
  const { customQuotes, addCustomQuote, removeCustomQuote } = useMindVerse();
  const allQuotes = [...CALM_LINES, ...customQuotes];
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * allQuotes.length));
  const line = allQuotes[idx];
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [newQuote, setNewQuote] = useState("");

  const next = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIdx((i) => (i + 1) % allQuotes.length);
  };

  const addQuote = () => {
    if (newQuote.trim()) {
      addCustomQuote(newQuote);
      setNewQuote("");
      setShowAddQuote(false);
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoicesLoaded(true);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    // Auto-speak when voices are loaded and modal opens, or when page changes
    if (voicesLoaded) {
      speak();
    }
  }, [voicesLoaded, idx]);

  const speak = () => {
    if (typeof window.speechSynthesis === "undefined") {
      alert("Text-to-speech is not supported in this browser!");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(line);
    const voices = window.speechSynthesis.getVoices();

    // Try to find a soft, female-sounding voice
    const preferredVoices = voices.filter(
      (voice) =>
        voice.name.toLowerCase().includes("female") ||
        voice.name.toLowerCase().includes("zira") ||
        voice.name.toLowerCase().includes("sara") ||
        voice.name.toLowerCase().includes("serena") ||
        voice.name.toLowerCase().includes("victoria") ||
        voice.name.toLowerCase().includes("samantha") ||
        voice.name.toLowerCase().includes("kate") ||
        voice.name.toLowerCase().includes("uk english"),
    );

    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    utterance.rate = 0.85; // Slightly slower for relaxation
    utterance.pitch = 1.05; // Slightly higher pitch for softness
    utterance.volume = 0.9; // Nice volume
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error("Speech error:", event);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Modal title="Book of Calm 📖" onClose={onClose} tone="bg-butter-soft">
      <div className="rounded-[24px] bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">For {name}</p>
        <p className="mt-3 font-display text-xl leading-snug text-foreground">"{line}"</p>
        {idx >= CALM_LINES.length && (
          <button
            type="button"
            onClick={() => removeCustomQuote(idx - CALM_LINES.length)}
            className="mt-2 text-xs text-red-500 hover:text-red-600"
          >
            Remove this custom quote
          </button>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={speak}
          className="flex-1 rounded-full bg-sky-500 py-3 text-sm font-bold text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
          disabled={!voicesLoaded}
        >
          {isSpeaking ? "Stop Speaking" : "Speak"}
        </button>
        <button
          type="button"
          onClick={next}
          className="flex-1 rounded-full bg-sage py-3 text-sm font-bold text-white shadow-soft transition hover:opacity-90"
        >
          Turn the page →
        </button>
      </div>

      {!showAddQuote ? (
        <button
          type="button"
          onClick={() => setShowAddQuote(true)}
          className="mt-4 w-full rounded-full bg-card py-3 text-sm font-bold text-foreground shadow-soft transition hover:bg-muted/50"
        >
          + Add your own calming quote
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Your calming quote..."
            className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowAddQuote(false)}
              className="flex-1 rounded-full bg-muted py-3 text-sm font-bold text-foreground shadow-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addQuote}
              disabled={!newQuote.trim()}
              className="flex-1 rounded-full bg-sage py-3 text-sm font-bold text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
            >
              Add Quote
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Bubble Pop — tap floating bubbles to release tension                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function BubblesModal({ onClose }: { onClose: () => void }) {
  const { playPopSound } = useMindVerse();
  // Each bubble has a left% + delay so they stagger up the play area.
  const [bubbles, setBubbles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: 6 + Math.random() * 88,
      delay: Math.random() * 4,
      size: 32 + Math.random() * 36,
      popped: false,
    })),
  );
  const [popped, setPopped] = useState(0);

  // Recycle bubbles after they're popped so the game keeps flowing.
  function pop(id: number) {
    playPopSound();
    setPopped((n) => n + 1);
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popped: true } : b)));
    window.setTimeout(() => {
      setBubbles((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                popped: false,
                left: 6 + Math.random() * 88,
                delay: 0,
                size: 32 + Math.random() * 36,
              }
            : b,
        ),
      );
    }, 600);
  }

  return (
    <Modal title="Bubble Pop 🫧" onClose={onClose} tone="bg-sky-soft">
      <p className="mb-3 text-sm text-foreground/80">
        Each pop = one worry released. Popped: <strong>{popped}</strong>
      </p>
      <div className="relative h-72 overflow-hidden rounded-[24px] bg-card shadow-soft">
        {bubbles.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => !b.popped && pop(b.id)}
            aria-label="Pop bubble"
            className="bubble-float absolute bottom-[-60px] rounded-full"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              animationDelay: `${b.delay}s`,
              opacity: b.popped ? 0 : 1,
              transform: b.popped ? "scale(1.6)" : undefined,
              transition: "opacity 0.3s, transform 0.3s",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(173,216,230,0.55) 60%, rgba(110,180,210,0.35))",
              boxShadow: "0 6px 16px rgba(80,140,180,0.25), inset 0 0 12px rgba(255,255,255,0.6)",
            }}
          />
        ))}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Breathing Orb — 4-4-6 guided                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

function BreatheModal({ onClose }: { onClose: () => void }) {
  const phases = useMemo(
    () => [
      { label: "Breathe in", ms: 4000, scale: 1.4 },
      { label: "Hold", ms: 4000, scale: 1.4 },
      { label: "Breathe out", ms: 6000, scale: 1.0 },
    ],
    [],
  );
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setI((n) => (n + 1) % phases.length), phases[i].ms);
    return () => window.clearTimeout(t);
  }, [i, phases]);
  const p = phases[i];

  return (
    <Modal title="Breathing Orb 🌬️" onClose={onClose} tone="bg-sage-soft">
      <div className="grid h-72 place-items-center rounded-[24px] bg-card shadow-soft">
        <div className="text-center">
          <div
            className="mx-auto h-32 w-32 rounded-full bg-gradient-to-br from-sage to-sky shadow-[0_0_60px_rgba(125,155,118,0.4)]"
            style={{
              transform: `scale(${p.scale})`,
              transition: `transform ${p.ms}ms ease-in-out`,
            }}
          />
          <p className="mt-6 font-display text-xl font-extrabold text-foreground">{p.label}</p>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Zen Sand — drag to leave calming trails                               */
/* ─────────────────────────────────────────────────────────────────────────── */

function SandModal({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Fill with warm sand background once on mount.
    ctx.fillStyle = "#f3e6cf";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  function paint(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(140,100,55,0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function clear() {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#f3e6cf";
    ctx.fillRect(0, 0, c.width, c.height);
  }

  return (
    <Modal title="Zen Sand ✦" onClose={onClose} tone="bg-peach-soft">
      <p className="mb-3 text-sm text-foreground/80">Drag your finger to draw calming patterns.</p>
      <canvas
        ref={canvasRef}
        width={520}
        height={320}
        onPointerDown={(e) => {
          drawing.current = true;
          paint(e);
        }}
        onPointerMove={paint}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerLeave={() => {
          drawing.current = false;
        }}
        className="h-72 w-full touch-none rounded-[24px] shadow-soft"
        style={{ background: "#f3e6cf" }}
      />
      <button
        type="button"
        onClick={clear}
        className="mt-3 w-full rounded-full bg-card py-3 text-sm font-bold text-foreground shadow-soft"
      >
        Smooth the sand
      </button>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Music Box — gentle visual hum                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

function MusicModal({ mood, onClose }: { mood: string; onClose: () => void }) {
  const { setActiveTab, playSound, stopSound, currentlyPlayingSoundId } = useMindVerse();
  const isPlaying = currentlyPlayingSoundId === "music-box-sweet";

  useEffect(() => {
    // Stop the sound when the modal closes
    return () => {
      if (currentlyPlayingSoundId === "music-box-sweet") {
        stopSound();
      }
    };
  }, [currentlyPlayingSoundId, stopSound]);

  const goToSounds = () => {
    onClose();
    setActiveTab("sounds");
  };

  const toggleSound = () => {
    if (isPlaying) {
      stopSound();
    } else {
      playSound("/sounds/Sweet_sound.mp3", "music-box-sweet");
    }
  };

  return (
    <Modal title="Music Box 🎵" onClose={onClose} tone="bg-lavender-soft">
      <div className="rounded-[24px] bg-card shadow-soft p-4">
        <div className="text-center">
          <div
            className={`music-pulse mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-lavender to-sky cursor-pointer ${isPlaying ? "animate-pulse" : ""}`}
            onClick={toggleSound}
          />
          <p className="mt-6 font-display text-xl font-extrabold text-foreground">
            A tune for {mood}
          </p>
          <p className="mt-1 text-xs text-muted-foreground mb-4">
            {isPlaying ? "Click the orb to pause the music" : "Click the orb to play calming music"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={toggleSound}
              className="rounded-full bg-gradient-to-r from-lavender to-sky px-6 py-3 text-sm font-bold text-white shadow-soft"
            >
              {isPlaying ? "Pause Sound" : "Play Sound"} ✨
            </button>
            <button
              onClick={goToSounds}
              className="rounded-full bg-card px-6 py-3 text-sm font-bold text-foreground shadow-soft"
            >
              Browse Sounds
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Gratitude Journal — write things you're grateful for                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function GratitudeModal({ onClose }: { onClose: () => void }) {
  const { gratitudeJournal, addGratitudeEntry, removeGratitudeEntry } = useMindVerse();
  const [newEntry, setNewEntry] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newEntry.trim()) {
      addGratitudeEntry(newEntry);
      setNewEntry("");
    }
  };

  return (
    <Modal title="Gratitude Journal 💖" onClose={onClose} tone="bg-lavender-soft">
      <p className="mb-4 text-sm text-foreground/80">
        Write down something you're grateful for today — it can be small or big!
      </p>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="I'm grateful for..."
            className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-lavender"
          />
          <button
            type="submit"
            disabled={!newEntry.trim()}
            className="rounded-full bg-sage px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="max-h-64 overflow-y-auto rounded-[24px] bg-card p-4 shadow-soft space-y-2">
        {gratitudeJournal.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            No entries yet — add your first one above! ✨
          </p>
        ) : (
          [...gratitudeJournal].reverse().map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-2 p-3 rounded-xl bg-lavender-soft/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {entry.date}
                </p>
                <p className="text-sm text-foreground break-words">{entry.text}</p>
              </div>
              <button
                type="button"
                onClick={() => removeGratitudeEntry(entry.id)}
                className="text-muted-foreground hover:text-red-500 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Enhanced chat console with voice chat and app actions                       */
/* ─────────────────────────────────────────────────────────────────────────── */

function ChatConsole({
  name,
  setOpenTool,
}: {
  name: string;
  setOpenTool: (tool: ToolId | null) => void;
}) {
  const { companionName, setActiveTab } = useMindVerse();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "intro",
      from: "fox",
      text: `Hey ${name}! I'm ${companionName} 🦊 — so glad you're here! Whether you want to try one of our cozy tools, listen to some calming sounds, or just chat about how you're feeling, I'm here for you! What's on your mind today?`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize OpenAI client
  const openai = useMemo(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      setApiKeyError(true);
      return null;
    }
    setApiKeyError(false);
    return new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for browser-side calls (note: for production, use a backend!)
    });
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDraft(transcript);
        setRecording(false);
      };

      recognition.onerror = () => setRecording(false);
      recognition.onend = () => setRecording(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  async function handleSend(e?: FormEvent) {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");

    // Add user message to chat
    const newUserMessage: ChatMessage = { id: crypto.randomUUID(), from: "user", text };
    setMessages((prev) => [...prev, newUserMessage]);

    // First check for action triggers in THERAPY_BANK
    const match = THERAPY_BANK.find((b) => {
      const matches = b.match.test(text);
      if (matches) console.log("Matched pattern:", b.match);
      return matches;
    });

    // Perform action immediately if found
    if (match?.action) {
      console.log("Performing action NOW:", match.action);
      if (match.action.type === "openTool") {
        console.log("Calling setOpenTool with:", match.action.data);
        setOpenTool(match.action.data);
      } else if (match.action.type === "navigate") {
        console.log("Calling setActiveTab with:", match.action.data);
        setActiveTab(match.action.data as any);
      }
    }

    setTyping(true);

    try {
      // If API key is not set, fall back to predefined responses
      if (!openai) {
        const fallbackReply = match
          ? match.reply(name, companionName)
          : FALLBACK(name, companionName);
        const delay = 800 + Math.min(2200, fallbackReply.length * 18);
        window.setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), from: "fox", text: fallbackReply },
          ]);
          setTyping(false);
        }, delay);
        return;
      }

      // Build conversation history for GPT
      const conversationHistory = [
        {
          role: "system",
          content: `You are ${companionName}, a warm, empathetic, and gentle wellness companion in the MindVerse app. Your personality is kind, supportive, and understanding. You help the user with stress management, mindfulness, and emotional well-being.

The app has several tools available:
- Book of Calm: Shows soothing quotes
- Bubble Pop: A stress-relief game
- Breathing Orb: Guided breathing exercises
- Zen Sand: Drawing for relaxation
- Music Box: Plays calming music
- Sounds Tab: Ambient sounds and healing frequencies
- Predictor Tab: Mood tracking
- Home Tab: Dashboard
- Profile Tab: Settings

You can also mention these tools when appropriate. Keep responses concise, warm, and use emojis sparingly. The user's name is ${name}.`,
        },
        ...messages.map((msg) => ({
          role: msg.from === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: text },
      ];

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // or "gpt-3.5-turbo" for cheaper option
        messages: conversationHistory,
        temperature: 0.7, // Creativity level
        max_tokens: 500,
      });

      const aiReply = completion.choices[0].message.content || FALLBACK(name, companionName);

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "fox", text: aiReply }]);
    } catch (error) {
      console.error("OpenAI API error:", error);
      // Fall back to predefined responses on error
      const fallbackReply = match
        ? match.reply(name, companionName)
        : FALLBACK(name, companionName);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from: "fox", text: fallbackReply },
      ]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-card shadow-soft">
      <header className="flex items-center gap-3 border-b border-border bg-sage-soft/60 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-card text-sage shadow-soft">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Talk to {companionName}</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sage align-middle" />
            {apiKeyError ? "⚠️ Add API key in .env" : "Online · always listening"}
          </p>
        </div>
      </header>

      {apiKeyError && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
          ⚠️ To use AI responses, set your OpenAI API key in the{" "}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">.env</code> file!
        </div>
      )}

      <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug shadow-soft ${
                m.from === "user" ? "bg-sage text-white" : "bg-sage-soft text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-sage-soft px-3 py-2 text-sm text-foreground/70 shadow-soft">
              {companionName} is typing<span className="dot-1">.</span>
              <span className="dot-2">.</span>
              <span className="dot-3">.</span>
            </div>
          </div>
        )}
        {recording && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-red-100 px-3 py-2 text-sm text-red-800 shadow-soft flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              Listening…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border bg-card px-3 py-3"
      >
        {recognitionRef.current && (
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={recording ? "Stop recording" : "Start voice recording"}
            className={`grid h-10 w-10 place-items-center rounded-full shadow-soft transition hover:opacity-90 ${
              recording ? "bg-red-500 text-white" : "bg-sage-soft text-sage"
            }`}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Tell ${companionName} how you feel, ${name}…`}
          className="flex-1 rounded-full bg-sage-soft/60 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-sage"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid h-10 w-10 place-items-center rounded-full bg-sage text-white shadow-soft transition hover:opacity-90 disabled:opacity-40"
          disabled={!draft.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Scoped CSS for the room scene + tiny anims                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

const ROOM_CSS = `
/* Realistic cozy room — perfect for all ages */
.room-canvas{
  background: #f0e2ce;
  position: relative;
}

/* Ambient room lighting with warm natural tones */
.room-lighting{
  position: absolute;
  top: 0; left:0; right:0; bottom:0;
  background: radial-gradient(circle at 75% 25%, rgba(255,220,160,0.55), transparent 65%),
              radial-gradient(circle at 25% 85%, rgba(160,120,80,0.18), transparent 55%);
  pointer-events: none;
  z-index: 1;
}

/* Warm textured walls with subtle pattern */
.room-walls{
  position:absolute; top:0; left:0; right:0; height:58%;
  background:
    linear-gradient(180deg, #f5e4cd 0%, #eddcc5 100%),
    repeating-linear-gradient(90deg, rgba(140,100,70,0.025) 0 2px, transparent 2px 45px);
  box-shadow: inset 0 -8px 20px rgba(0,0,0,0.07);
}

/* Framed picture on wall */
.room-picture{ position:absolute; top:24px; left:22px; width:56px; height:44px; z-index:2;
  background: linear-gradient(180deg, #e8f4fc, #c5e1f1);
  border:5px solid #8c6239;
  border-radius:4px;
  box-shadow:0 6px 14px rgba(0,0,0,0.22);
}
.room-picture::before{
  content:""; position:absolute; top:6px; left:8px; width:16px; height:10px; border-radius:2px;
  background:linear-gradient(180deg,#e6a27a,#d07a4f);
}
.room-picture::after{
  content:""; position:absolute; top:12px; left:18px; width:20px; height:14px; border-radius:50% 50% 40% 40%;
  background:linear-gradient(180deg,#7ab66d,#4e9a43);
}

/* Cozy elegant curtains */
.room-curtain{ position:absolute; top:12px; width:15%; height:54%;
  background: linear-gradient(90deg, rgba(150,85,70,0.92), rgba(170,100,85,0.95));
  border-radius: 0 0 24px 24px;
  box-shadow: inset -10px 0 16px rgba(0,0,0,0.12),
              0 10px 24px rgba(0,0,0,0.15);
  z-index: 2;
}
.room-curtain-left{ right: calc(44% + 16px); }
.room-curtain-right{ right: 10px; }
.room-curtain::before{
  content: ""; position:absolute; top:0; left:0; right:0; height:16px;
  background: linear-gradient(180deg, #995c48, #7f4a3a);
  border-radius: 3px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* Large corner window with realistic sky */
.room-window{ position:absolute; top:14px; right:32px; width:44%; height:52%; border-radius:14px;
  background: #a1d6ff; border:10px solid #7a5230;
  box-shadow: 0 10px 32px rgba(0,0,0,0.25), inset 0 0 24px rgba(255,255,255,0.25);
  overflow:hidden; z-index: 3;
}

/* Realistic sky with soft clouds */
.room-sky{ position:absolute; top:0; left:0; right:0; bottom:0;
  background: linear-gradient(180deg, #82c8ec 0%, #afdcf8 50%, #d0effe 100%);
}
.room-cloud{ position:absolute; border-radius:9999px;
  background: radial-gradient(ellipse at center, #fff, rgba(255,255,255,0.85));
  filter: blur(0.3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.room-cloud-1{ top:14%; left:12%; width:56px; height:30px; animation: cloudDrift 18s linear infinite; }
.room-cloud-2{ top:30%; left:55%; width:76px; height:38px; animation: cloudDrift 24s linear infinite 4s; }
.room-cloud-3{ top:8%; left:70%; width:44px; height:24px; animation: cloudDrift 20s linear infinite 8s; }
@keyframes cloudDrift{
  0% { transform: translateX(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(44px); opacity: 0; }
}

/* Window panes */
.room-pane{ position:absolute; background:transparent; border:3px solid rgba(120,80,40,0.85); }
.room-pane-tl{ top:0; left:0; width:50%; height:50%; border-right-width:3px; border-bottom-width:3px; }
.room-pane-tr{ top:0; right:0; width:50%; height:50%; border-left-width:3px; border-bottom-width:3px; }
.room-pane-bl{ bottom:0; left:0; width:50%; height:50%; border-right-width:3px; border-top-width:3px; }
.room-pane-br{ bottom:0; right:0; width:50%; height:50%; border-left-width:3px; border-top-width:3px; }

/* Sun outside with soft glow */
.room-sun{ position:absolute; top:20%; right:22%; width:48px; height:48px; border-radius:9999px;
  background: radial-gradient(circle, #fffbe0, #ffd54f 55%, #f5c033 90%);
  box-shadow: 0 0 34px rgba(255,210,80,0.7), 0 0 70px rgba(255,190,60,0.4);
  animation: sunGlow 7s ease-in-out infinite;
}
@keyframes sunGlow{ 0%,100%{ transform: scale(1); opacity:1; } 50%{ transform: scale(1.05); opacity:0.95; } }

/* Window sill */
.room-window-sill{ position:absolute; bottom:-14px; left:-10px; right:-10px; height:18px;
  background: linear-gradient(180deg, #946640, #7a5230);
  border-radius:4px; box-shadow: 0 8px 16px rgba(0,0,0,0.32);
}

/* Realistic wooden floor with warm tones */
.room-floor{ position:absolute; bottom:0; left:0; right:0; height:45%;
  background:
    repeating-linear-gradient(90deg,
      #be875e 0 26px,
      #b97f52 26px 52px,
      #cd9568 52px 78px,
      #c58a5c 78px 104px
    ),
    linear-gradient(180deg, #d0a270 0%, #9f663d 100%);
  box-shadow: inset 0 8px 20px rgba(0,0,0,0.12);
}
.room-floor::before{
  content:""; position:absolute; top:0; left:0; right:0; height:100%;
  background: repeating-linear-gradient(0deg,
    transparent 0 62px,
    rgba(0,0,0,0.02) 62px 64px
  );
}

/* Cozy elegant patterned rug */
.room-rug{ position:absolute; left:9%; right:9%; bottom:9%; height:32%; border-radius:28px;
  background:
    radial-gradient(circle at 22% 32%, rgba(140,100,60,0.17), transparent 52%),
    radial-gradient(circle at 78% 68%, rgba(120,85,50,0.17), transparent 52%),
    repeating-linear-gradient(45deg, #e6c79a 0 11px, #ddb882 11px 22px),
    #d0ab80;
  box-shadow: 0 12px 28px rgba(0,0,0,0.2), inset 0 0 24px rgba(160,120,80,0.25);
  border:4px solid rgba(110,75,45,0.45);
}
.room-rug::before{
  content:""; position:absolute; top:10px; left:10px; right:10px; bottom:10px;
  border-radius:20px; border:2px solid rgba(110,75,45,0.25);
}

/* Potted plant with nice pot */
.room-plant{ position:absolute; bottom:11%; left:11%; width:42px; height:74px; z-index:4; }
.room-plant::before{
  content:""; position:absolute; bottom:0; left:50%; transform: translateX(-50%);
  width:36px; height:32px; border-radius:10px 10px 16px 16px;
  background: linear-gradient(180deg, #c99b6e, #9b704d);
  box-shadow: 0 6px 12px rgba(0,0,0,0.25);
}
.room-plant::after{
  content:""; position:absolute; bottom:28px; left:50%; transform: translateX(-50%);
  width:32px; height:44px; border-radius:45% 45% 55% 55%;
  background: radial-gradient(circle at 50% 30%, #7bc47f, #46a349);
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

/* Side table for breathing orb */
.room-side-table{ position:absolute; top:44%; right:14px; width:78px; height:64px; z-index:4; }
.room-side-table::before{
  content:""; position:absolute; top:0; left:0; width:78px; height:16px; border-radius:10px;
  background: linear-gradient(180deg, #c9a86c, #9e7a44);
  box-shadow: 0 4px 10px rgba(0,0,0,0.25);
}
.room-side-table::after{
  content:""; position:absolute; top:16px; width:11px; height:48px; border-radius:0 0 5px 5px;
  background: linear-gradient(90deg, #9b704d, #7d5a3a);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  left:10px;
}
.room-side-table > span:first-child { display:block; position:absolute; top:16px; right:10px; width:11px; height:48px; border-radius:0 0 5px 5px; background: linear-gradient(90deg, #9b704d, #7d5a3a); box-shadow:0 4px 8px rgba(0,0,0,0.2); }

/* Table lamp on side table */
.room-lamp{ position:absolute; top:33%; right:26px; width:28px; height:34px; z-index:12; }
.room-lamp::before{
  content:""; position:absolute; top:0; left:50%; transform: translateX(-50%);
  width:28px; height:16px; border-radius:8px 8px 4px 4px;
  background: linear-gradient(180deg, #f7e2c0, #e6c890);
  box-shadow:0 0 24px rgba(255,210,120,0.45);
}
.room-lamp::after{
  content:""; position:absolute; bottom:0; left:50%; transform: translateX(-50%);
  width:12px; height:20px; border-radius:3px 3px 5px 5px;
  background: linear-gradient(180deg, #967340, #785630);
}

/* Cozy floor pillows */
.room-pillow{ position:absolute; border-radius:14px; z-index:4;
  box-shadow: 0 6px 14px rgba(0,0,0,0.18);
}
.room-pillow-1{
  bottom:14%; left:30%; width:36px; height:26px;
  background: linear-gradient(180deg, #e8c7b0, #d4a88e);
}
.room-pillow-2{
  bottom:16%; left:38%; width:32px; height:24px;
  background: linear-gradient(180deg, #c8d8e4, #a8c2d4);
}

/* Small stack of books */
.room-book-stack{ position:absolute; bottom:13%; left:22%; z-index:4; }
.room-book-stack::before{
  content:""; position:absolute; bottom:0; width:32px; height:10px; border-radius:2px;
  background: linear-gradient(180deg, #7d9a73, #587a4f);
  box-shadow: 0 4px 10px rgba(0,0,0,0.18);
}
.room-book-stack::after{
  content:""; position:absolute; bottom:10px; left:3px; width:28px; height:9px; border-radius:2px;
  background: linear-gradient(180deg, #c98a6b, #a0634a);
}

/* Generic room item button */
.room-item{ position:absolute; display:flex; flex-direction:column; align-items:center; gap:4px;
  background:transparent; border:0; cursor:pointer; transition: transform .2s; z-index:10; }
.room-item:hover{ transform: translateY(-2px); }
.room-item.is-suggested{ animation: itemPulse 1.6s ease-in-out infinite; }
@keyframes itemPulse{
  0%,100%{ filter: drop-shadow(0 0 0 rgba(168,213,186,0)); transform: translateY(0); }
  50%{ filter: drop-shadow(0 0 16px rgba(168,213,186,0.95)); transform: translateY(-4px); }
}
.room-label{ display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:9999px;
  background: rgba(255,255,255,0.98); font-size:10px; font-weight:800; color:#3f3a22;
  box-shadow: 0 4px 10px rgba(0,0,0,0.14);
  backdrop-filter: blur(5px);
}

/* Bookshelf with more books */
.room-item-book{ top:18px; left:20px; z-index:5; }
.room-bookshelf{ display:flex; align-items:flex-end; gap:2px; padding:8px 6px;
  background: linear-gradient(180deg, #a8784d, #7a5230);
  border-radius:8px;
  box-shadow: 0 8px 18px rgba(0,0,0,0.25), inset 0 2px 6px rgba(255,255,255,0.1);
}
.room-spine{ display:block; width:12px; border-radius:2px 2px 3px 3px; box-shadow: inset 1px 0 2px rgba(0,0,0,0.15); }
.room-spine-1{ background: linear-gradient(180deg,#e07b5a,#b35537); height:50px; }
.room-spine-2{ background: linear-gradient(180deg,#7fb076,#4a7a41); height:56px; }
.room-spine-3{ background: linear-gradient(180deg,#d4b05a,#a3832a); height:46px; }
.room-spine-4{ background: linear-gradient(180deg,#88a3c9,#5474a0); height:52px; }
.room-spine-5{ background: linear-gradient(180deg,#c48bb8,#975b8b); height:48px; }
.room-item-book .room-label{ position:absolute; bottom:-20px; left:50%; transform: translateX(-50%); white-space:nowrap; }

/* Bubble jar */
.room-item-jar{ top:48%; left:22px; z-index:5; }
.room-jar{ display:block; width:50px; height:58px; border-radius:18px 18px 22px 22px;
  background: linear-gradient(135deg, rgba(210,230,250,0.85), rgba(150,200,230,0.65));
  border:3px solid #7a5230;
  position:relative;
  box-shadow: 0 10px 22px rgba(0,0,0,0.24), inset 0 0 16px rgba(255,255,255,0.45);
}
.room-jar::before{
  content:""; position:absolute; top:-9px; left:50%; transform: translateX(-50%);
  width:30px; height:13px; border-radius:7px 7px 0 0;
  background: linear-gradient(180deg, #967340, #785630);
  border:2px solid #6a4a28;
}
.room-jar-bubble{ position:absolute; border-radius:9999px; background: radial-gradient(circle at 30% 30%, #fff, #dcefff);
  box-shadow: inset 0 0 7px rgba(255,255,255,0.85); }
.room-jar-bubble-1{ width:10px; height:10px; top:46%; left:24%; animation: jarBub 3.2s ease-in-out infinite; }
.room-jar-bubble-2{ width:8px;  height:8px;  top:54%; left:56%; animation: jarBub 2.6s ease-in-out infinite 0.7s; }
.room-jar-bubble-3{ width:6px;  height:6px;  top:68%; left:40%; animation: jarBub 3s ease-in-out infinite 1.3s; }
@keyframes jarBub{ 0%{transform:translateY(0); opacity:.55} 50%{transform:translateY(-16px); opacity:1} 100%{transform:translateY(0); opacity:.55} }

/* Breathing orb */
.room-item-orb{ top:36%; right:26px; z-index:15; }
.room-orb{ display:block; width:58px; height:58px; border-radius:9999px;
  background: radial-gradient(circle at 35% 30%, #ffffff, #cbf0dd 35%, #a3d4b7 60%, #769970);
  box-shadow: 0 0 34px rgba(118,153,112,0.7), 0 0 70px rgba(118,153,112,0.38);
  animation: orbBreath 7s ease-in-out infinite;
}
@keyframes orbBreath{ 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.16) } }

/* Zen sand tray */
.room-item-sand{ bottom:15%; right:22%; z-index:5; }
.room-sand-tray{ display:block; width:86px; height:34px; border-radius:11px;
  background: linear-gradient(180deg,#f3e6cf,#e6cfa1);
  border:4px solid #7a5030;
  box-shadow: 0 10px 22px rgba(0,0,0,0.25), inset 0 5px 12px rgba(0,0,0,0.08);
}

/* Music box */
.room-item-music{ top:40%; right:50%; z-index:5; }
.room-musicbox{ display:block; width:52px; height:36px; border-radius:9px;
  background: linear-gradient(180deg,#ccaa4e,#a08030);
  border:3px solid #604818;
  position:relative;
  box-shadow: 0 10px 22px rgba(0,0,0,0.25), inset 0 3px 6px rgba(255,255,255,0.25);
}
.room-musicbox::before{
  content:""; position:absolute; top:7px; left:50%; transform: translateX(-50%);
  width:24px; height:18px; border-radius:5px;
  background: linear-gradient(180deg,#e6ca6c,#c4a040);
  border:2px solid #705020;
}
.room-musicnote{ position:absolute; top:-17px; right:-9px; font-size:21px; color:#604818; animation: noteFloat 2.5s ease-in-out infinite; text-shadow: 0 3px 6px rgba(0,0,0,0.18); }
@keyframes noteFloat{ 0%,100%{transform:translateY(0); opacity:.65} 50%{transform:translateY(-9px); opacity:1} }

/* Pip the fox */
.room-fox{ position:absolute; bottom:12px; left:20px; animation: foxFloat 4s ease-in-out infinite; z-index:20; }
@keyframes foxFloat{ 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-9px) } }

/* Pip's speech bubble */
.room-bubble{ position:absolute; bottom:135px; left:145px; max-width:50%; padding:13px 15px;
  background: rgba(255,255,255,0.98); color: #362b1f; font-size:13px;
  border-radius:20px; box-shadow: 0 12px 30px rgba(0,0,0,0.22);
  z-index:25;
}
.room-bubble::after{ content:""; position:absolute; left:-11px; bottom:17px; width:17px; height:17px; background: rgba(255,255,255,0.98); transform: rotate(45deg); box-shadow: -5px 5px 10px rgba(0,0,0,0.1); }

/* Bubble pop game animation */
.bubble-float{ animation: bubFloat linear infinite; animation-duration: 6s; }
@keyframes bubFloat{
  0%   { transform: translateY(0); }
  100% { transform: translateY(-360px); }
}

/* Music pulse for the music modal */
.music-pulse{ animation: musicPulse 1.8s ease-in-out infinite; box-shadow: 0 0 44px rgba(176,162,224,0.6); }
@keyframes musicPulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.09)} }

/* Typing-dot bounce for chat */
.dot-1{ animation: dotB 1s infinite ease-in-out; }
.dot-2{ animation: dotB 1s infinite ease-in-out 0.15s; }
.dot-3{ animation: dotB 1s infinite ease-in-out 0.3s; }
@keyframes dotB{ 0%,80%,100%{opacity:.2} 40%{opacity:1} }
`;
