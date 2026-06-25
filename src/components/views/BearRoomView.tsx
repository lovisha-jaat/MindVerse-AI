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
import { BookOpen, Sparkles, Wind, Music2, X, Send, MessageCircle } from "lucide-react";
import foxImg from "@/assets/fox.png";
import { useMindVerse } from "@/context/MindVerseContext";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Mood feelings + companion suggestions                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type Feeling = "good" | "tense" | "stressed" | "horrible";
type ToolId = "book" | "bubbles" | "breathe" | "sand" | "music";

const FEELINGS: { id: Feeling; label: string; emoji: string; tone: string }[] = [
  { id: "good",     label: "Good",     emoji: "🙂", tone: "var(--butter-soft)"   },
  { id: "tense",    label: "Tense",    emoji: "😅", tone: "var(--peach-soft)"    },
  { id: "stressed", label: "Stressed", emoji: "😔", tone: "var(--lavender-soft)" },
  { id: "horrible", label: "Horrible", emoji: "😞", tone: "var(--sky-soft)"      },
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
/* Therapist chat phrase bank                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

const THERAPY_BANK: { match: RegExp; reply: (name: string) => string }[] = [
  { match: /\b(tired|sleep|exhaust)/i, reply: (n) =>
    `That tiredness is real, ${n}. Even one earlier night will reset your baseline — dim screens, breathe 4 in / 6 out, and let me hold the worry for you.` },
  { match: /\b(anx|panic|nervous|worry|overwhelm)/i, reply: (n) =>
    `Let's slow this down, ${n}. Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste. Anxiety lives in the future — this brings you back.` },
  { match: /\b(sad|down|empty|cry|lonel)/i, reply: (n) =>
    `I hear you, ${n}. Put a hand on your chest, feel it rise, and say: "this is hard and I'm allowed to feel it." Sit with that for a minute.` },
  { match: /\b(angry|mad|frustrat)/i, reply: (n) =>
    `Anger means a boundary was crossed, ${n}. Name it out loud: "I'm frustrated because ___." Then choose the smallest next step.` },
  { match: /\b(focus|study|work)/i, reply: (n) =>
    `Cognitive load is heavy, ${n}. Try 25 minutes of single-task work, then 5 minutes away from the screen. The gap is where focus rebuilds.` },
  { match: /\b(thank|love|good|better|ok)/i, reply: (n) =>
    `That means a lot, ${n}. Noticing what's working teaches your nervous system where safety lives. I'll be right here. 🦊` },
];
const FALLBACK = (n: string) =>
  `I'm here, ${n}. Breathe in 4, hold 4, out 6. Tell me a little more — what's the loudest feeling right now?`;

interface ChatMessage { id: string; from: "user" | "fox"; text: string }

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export function BearRoomView() {
  const { userName, currentMood } = useMindVerse();
  const name = userName ?? "friend";

  // Which room tool is currently open in the modal? `null` means none.
  const [openTool, setOpenTool] = useState<ToolId | null>(null);

  // Which feeling did the user share? Drives Pip's suggestion + highlight.
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const suggestion = feeling ? suggestionFor(name, feeling) : null;

  // Pip's default greeting line if no feeling has been picked yet.
  const greeting = useMemo(
    () => `Hi ${name}, I'm Pip 🦊 — tap how you feel and I'll suggest something from the room.`,
    [name],
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <style>{ROOM_CSS}</style>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Sanctuary</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Pip's Cozy Room</h1>
        <p className="text-sm text-muted-foreground">
          A safe place. Come here for a quick reset any time of day.
        </p>
      </header>

      {/* ── ROOM SCENE ──────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[28px] bg-card p-3 shadow-soft">
        <div className="room-canvas relative h-[420px] overflow-hidden rounded-[24px] sm:h-[460px]">
          {/* Warm wallpaper gradient + window */}
          <div className="room-window" aria-hidden>
            <div className="room-pane room-pane-tl" />
            <div className="room-pane room-pane-tr" />
            <div className="room-pane room-pane-bl" />
            <div className="room-pane room-pane-br" />
            <div className="room-sun" />
          </div>
          {/* Floor rug */}
          <div className="room-rug" aria-hidden />

          {/* ── Bookshelf with the Book of Calm ─────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("book")}
            aria-label="Open the Book of Calm"
            className={`room-item room-item-book ${suggestion?.tool === "book" ? "is-suggested" : ""}`}
          >
            <span className="room-spine room-spine-1" />
            <span className="room-spine room-spine-2" />
            <span className="room-spine room-spine-3" />
            <span className="room-label"><BookOpen className="h-3 w-3" /> Book</span>
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
            <span className="room-label"><Sparkles className="h-3 w-3" /> Bubbles</span>
          </button>

          {/* ── Breathing orb on a small table ──────────────────────── */}
          <button
            type="button"
            onClick={() => setOpenTool("breathe")}
            aria-label="Start the breathing orb"
            className={`room-item room-item-orb ${suggestion?.tool === "breathe" ? "is-suggested" : ""}`}
          >
            <span className="room-orb" />
            <span className="room-label"><Wind className="h-3 w-3" /> Breathe</span>
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
            <span className="room-label"><Music2 className="h-3 w-3" /> Music</span>
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
                  <div className="text-2xl" aria-hidden>{f.emoji}</div>
                  <p className="mt-1 text-[11px] font-bold text-foreground">{f.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── THERAPIST CHAT ──────────────────────────────────────────────── */}
      <ChatConsole name={name} />

      {/* ── Tool modals ──────────────────────────────────────────────────── */}
      {openTool === "book"    && <BookModal    name={name} onClose={() => setOpenTool(null)} />}
      {openTool === "bubbles" && <BubblesModal              onClose={() => setOpenTool(null)} />}
      {openTool === "breathe" && <BreatheModal              onClose={() => setOpenTool(null)} />}
      {openTool === "sand"    && <SandModal                 onClose={() => setOpenTool(null)} />}
      {openTool === "music"   && <MusicModal   mood={currentMood.label} onClose={() => setOpenTool(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Modal shell                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function Modal({
  title, onClose, children, tone = "bg-card",
}: { title: string; onClose: () => void; children: React.ReactNode; tone?: string }) {
  // Close on Escape — modest a11y nicety.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div
        className={`w-full max-w-md overflow-hidden rounded-[28px] ${tone} p-5 shadow-soft-lg animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-soft" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Book of Calm — random soothing quote                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function BookModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * CALM_LINES.length));
  const line = CALM_LINES[idx];
  const next = () => setIdx((i) => (i + 1) % CALM_LINES.length);
  return (
    <Modal title="Book of Calm 📖" onClose={onClose} tone="bg-butter-soft">
      <div className="rounded-[24px] bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">For {name}</p>
        <p className="mt-3 font-display text-xl leading-snug text-foreground">"{line}"</p>
      </div>
      <button
        type="button"
        onClick={next}
        className="mt-4 w-full rounded-full bg-sage py-3 text-sm font-bold text-white shadow-soft transition hover:opacity-90"
      >
        Turn the page →
      </button>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOL: Bubble Pop — tap floating bubbles to release tension                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function BubblesModal({ onClose }: { onClose: () => void }) {
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
    setPopped((n) => n + 1);
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popped: true } : b)));
    window.setTimeout(() => {
      setBubbles((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, popped: false, left: 6 + Math.random() * 88, delay: 0, size: 32 + Math.random() * 36 }
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
      { label: "Breathe in",  ms: 4000, scale: 1.4 },
      { label: "Hold",        ms: 4000, scale: 1.4 },
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
            style={{ transform: `scale(${p.scale})`, transition: `transform ${p.ms}ms ease-in-out` }}
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
        onPointerDown={(e) => { drawing.current = true; paint(e); }}
        onPointerMove={paint}
        onPointerUp={() => { drawing.current = false; }}
        onPointerLeave={() => { drawing.current = false; }}
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
  return (
    <Modal title="Music Box 🎵" onClose={onClose} tone="bg-lavender-soft">
      <div className="grid h-72 place-items-center rounded-[24px] bg-card shadow-soft">
        <div className="text-center">
          <div className="music-pulse mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-lavender to-sky" />
          <p className="mt-6 font-display text-xl font-extrabold text-foreground">A tune for {mood}</p>
          <p className="mt-1 text-xs text-muted-foreground">Open the Sounds tab to pick a soundscape.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Therapist chat console (kept from previous Bear Room)                       */
/* ─────────────────────────────────────────────────────────────────────────── */

function ChatConsole({ name }: { name: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "intro", from: "fox", text: `Hey ${name}, I'm Pip. What's on your mind?` },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "user", text }]);

    const match = THERAPY_BANK.find((b) => b.match.test(text));
    const reply = match ? match.reply(name) : FALLBACK(name);

    setTyping(true);
    const delay = 800 + Math.min(2200, reply.length * 18);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "fox", text: reply }]);
      setTyping(false);
    }, delay);
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-card shadow-soft">
      <header className="flex items-center gap-3 border-b border-border bg-sage-soft/60 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-card text-sage shadow-soft">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Talk to Pip</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sage align-middle" />
            Online · always listening
          </p>
        </div>
      </header>

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
              Pip is typing<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Tell Pip how you feel, ${name}…`}
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
/* Warm cozy room backdrop — soft cream walls + wooden floor */
.room-canvas{
  background:
    linear-gradient(180deg, #fbe9c8 0%, #f7dbb3 55%, #e2b27a 55%, #c98a52 100%);
}
/* Large corner window with golden light */
.room-window{ position:absolute; top:16px; right:14px; width:46%; height:48%; border-radius:18px;
  background: linear-gradient(180deg,#ffe9a8,#ffd07a); border:6px solid #b8825a; box-shadow: inset 0 0 30px rgba(255,200,120,0.6); overflow:hidden; }
.room-pane{ position:absolute; background:transparent; border:3px solid #b8825a; }
.room-pane-tl{ top:0; left:0; width:50%; height:50%; border-right-width:3px; border-bottom-width:3px; }
.room-pane-tr{ top:0; right:0; width:50%; height:50%; border-left-width:3px; border-bottom-width:3px; }
.room-pane-bl{ bottom:0; left:0; width:50%; height:50%; border-right-width:3px; border-top-width:3px; }
.room-pane-br{ bottom:0; right:0; width:50%; height:50%; border-left-width:3px; border-top-width:3px; }
.room-sun{ position:absolute; top:18%; right:18%; width:40px; height:40px; border-radius:9999px;
  background: radial-gradient(circle, #fff7c2, #ffd478 70%); filter: blur(1px); }

/* Patterned rug across the wooden floor */
.room-rug{ position:absolute; left:6%; right:6%; bottom:6%; height:34%; border-radius:24px;
  background:
    repeating-linear-gradient(45deg, #f3d6a2 0 14px, #e8b97a 14px 28px),
    #d99e63;
  box-shadow: 0 -6px 14px rgba(0,0,0,0.05) inset; opacity:.95;
}

/* Generic room item button */
.room-item{ position:absolute; display:flex; flex-direction:column; align-items:center; gap:4px;
  background:transparent; border:0; cursor:pointer; transition: transform .2s; }
.room-item:hover{ transform: translateY(-2px); }
.room-item.is-suggested{ animation: itemPulse 1.6s ease-in-out infinite; }
@keyframes itemPulse{
  0%,100%{ filter: drop-shadow(0 0 0 rgba(168,213,186,0)); transform: translateY(0); }
  50%{ filter: drop-shadow(0 0 14px rgba(168,213,186,0.9)); transform: translateY(-4px); }
}
.room-label{ display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:9999px;
  background: rgba(255,255,255,0.92); font-size:10px; font-weight:800; color:#4a3a22; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }

/* Book — three colourful spines on a shelf, top-left */
.room-item-book{ top:18px; left:14px; }
.room-spine{ display:block; width:14px; height:54px; border-radius:3px; margin: 0 1px; }
.room-item-book{ flex-direction:row; align-items:flex-end; }
.room-item-book .room-label{ position:absolute; bottom:-18px; left:50%; transform: translateX(-50%); white-space:nowrap; }
.room-spine-1{ background: linear-gradient(180deg,#c97a55,#8e4d2e); }
.room-spine-2{ background: linear-gradient(180deg,#7d9b76,#4a6741); height:60px; }
.room-spine-3{ background: linear-gradient(180deg,#c9a84c,#8a6e2a); height:48px; }

/* Bubble jar — left side, mid */
.room-item-jar{ top:46%; left:18px; }
.room-jar{ display:block; width:46px; height:54px; border-radius:14px 14px 18px 18px;
  background: linear-gradient(180deg, rgba(180,220,240,0.7), rgba(140,200,230,0.5)); border:3px solid #b8825a; position:relative; }
.room-jar-bubble{ position:absolute; border-radius:9999px; background: radial-gradient(circle at 30% 30%, #fff, #cfe8f5);
  box-shadow: inset 0 0 6px #fff; }
.room-jar-bubble-1{ width:10px; height:10px; top:48%; left:25%; animation: jarBub 3s ease-in-out infinite; }
.room-jar-bubble-2{ width:8px;  height:8px;  top:55%; left:55%; animation: jarBub 2.4s ease-in-out infinite 0.6s; }
.room-jar-bubble-3{ width:6px;  height:6px;  top:70%; left:40%; animation: jarBub 2.8s ease-in-out infinite 1.1s; }
@keyframes jarBub{ 0%{transform:translateY(0); opacity:.6} 50%{transform:translateY(-14px); opacity:1} 100%{transform:translateY(0); opacity:.6} }

/* Breathing orb on a small side table — right side, mid */
.room-item-orb{ top:42%; right:22px; }
.room-orb{ display:block; width:54px; height:54px; border-radius:9999px;
  background: radial-gradient(circle at 35% 30%, #fff, #a8d5ba 55%, #7d9b76);
  box-shadow: 0 0 24px rgba(125,155,118,0.55); animation: orbBreath 6s ease-in-out infinite; }
@keyframes orbBreath{ 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.12) } }

/* Zen sand tray on the rug — bottom-right */
.room-item-sand{ bottom:14%; right:18%; }
.room-sand-tray{ display:block; width:80px; height:30px; border-radius:8px;
  background: linear-gradient(180deg,#f3e6cf,#e6cfa1); border:3px solid #8b5a2b; box-shadow: inset 0 4px 8px rgba(0,0,0,0.08); }

/* Music box on a low shelf — top-right corner under the window */
.room-item-music{ top:36%; right:46%; }
.room-musicbox{ display:block; width:48px; height:32px; border-radius:6px;
  background: linear-gradient(180deg,#c9a84c,#8a6e2a); border:2px solid #5e4a1a; position:relative; }
.room-musicnote{ position:absolute; top:-12px; right:-6px; font-size:18px; color:#5e4a1a; animation: noteFloat 2.4s ease-in-out infinite; }
@keyframes noteFloat{ 0%,100%{transform:translateY(0); opacity:.7} 50%{transform:translateY(-6px); opacity:1} }

/* Pip the fox — bottom-left, gently floating */
.room-fox{ position:absolute; bottom:6px; left:14px; animation: foxFloat 4s ease-in-out infinite; }
@keyframes foxFloat{ 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-6px) } }

/* Pip's speech bubble */
.room-bubble{ position:absolute; bottom:120px; left:130px; max-width:54%; padding:10px 12px;
  background: rgba(255,255,255,0.95); color: #3b2f1f; font-size:13px; border-radius:16px; box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
.room-bubble::after{ content:""; position:absolute; left:-8px; bottom:14px; width:12px; height:12px; background: rgba(255,255,255,0.95); transform: rotate(45deg); }

/* Bubble pop game animation */
.bubble-float{ animation: bubFloat linear infinite; animation-duration: 6s; }
@keyframes bubFloat{
  0%   { transform: translateY(0); }
  100% { transform: translateY(-360px); }
}

/* Music pulse for the music modal */
.music-pulse{ animation: musicPulse 1.8s ease-in-out infinite; box-shadow: 0 0 40px rgba(176,162,224,0.55); }
@keyframes musicPulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }

/* Typing-dot bounce for chat */
.dot-1{ animation: dotB 1s infinite ease-in-out; }
.dot-2{ animation: dotB 1s infinite ease-in-out 0.15s; }
.dot-3{ animation: dotB 1s infinite ease-in-out 0.3s; }
@keyframes dotB{ 0%,80%,100%{opacity:.2} 40%{opacity:1} }
`;
