/**
 * BearRoomView.tsx — The Digital Sanctuary
 * -----------------------------------------------------------------------------
 * A weather-reactive virtual bedroom scene + AI companion bear + therapist chat.
 *
 * Reactive systems at play
 *   1. WEATHER  — driven by `currentMood.stressLevel` from the global context.
 *      ┌───────────────────────────┬─────────────────────────────────────────┐
 *      │ Tier            score     │ Canvas treatment                        │
 *      ├───────────────────────────┼─────────────────────────────────────────┤
 *      │ low   (<40)               │ Golden/mint gradient, blooming flowers, │
 *      │  Happy / Calm             │ soft yellow sunlight particles          │
 *      │                           │                                         │
 *      │ mid   (40–59)             │ Muted dusk palette (gentle in-between)  │
 *      │  Neutral                  │                                         │
 *      │                           │                                         │
 *      │ high  (>=60)              │ Dim slate gradient, animated rain drops │
 *      │  Stress / High Stress     │ down the window, flickering candle glow │
 *      └───────────────────────────┴─────────────────────────────────────────┘
 *
 *   2. BEAR     — infinite CSS `float-soft` keyframe; gently bobs in place.
 *   3. SPEECH   — `buildBearLine()` reads userName + mlInputs + currentMood and
 *                 returns a different sentence depending on the strongest
 *                 driver (sleep deficit, study load, screen time, caffeine).
 *   4. CHAT     — local-only console. The bear "types" via a setTimeout-driven
 *                 mock; responses are picked from a small grounded-therapy
 *                 phrase bank seeded by the user's last message.
 *
 * NOTE: All animations are defined inline via a single <style> block so this
 * file is self-contained — no global CSS changes are required.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Send, Cloud, Sun, MessageCircle } from "lucide-react";
import bearImg from "@/assets/bear.png";
import { useMindVerse } from "@/context/MindVerseContext";
import type { MlInputs, MoodResult } from "@/lib/stressModel";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Weather tier resolution                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

type WeatherTier = "low" | "mid" | "high";

/** Bucket the stress score so the canvas only needs three distinct treatments. */
function weatherFor(score: number): WeatherTier {
  if (score < 40) return "low";
  if (score < 60) return "mid";
  return "high";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Speech bubble copy generator                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Picks the *strongest* stress driver from the current biomarker vector and
 * weaves a personalized one-liner. Direct, gentle, second-person — never
 * generic. Always references `name` so it feels like the bear knows the user.
 */
function buildBearLine(name: string, m: MlInputs, mood: MoodResult): string {
  // Drivers: each gets a "severity" so we can pick the loudest one.
  const drivers = [
    { key: "sleep",  severity: Math.max(0, 8 - m.sleepHours) },
    { key: "study",  severity: Math.max(0, m.studyHours - 6) },
    { key: "screen", severity: Math.max(0, m.screenTime - 4) },
    { key: "caf",    severity: m.caffeine === "High" ? 3 : m.caffeine === "Medium" ? 1.5 : 0 },
  ].sort((a, b) => b.severity - a.severity);

  const top = drivers[0]!;
  // Low-stress, no real driver → celebratory line.
  if (mood.stressLevel < 40 || top.severity === 0) {
    return `Hi ${name}, the room feels bright today — you're holding a steady ${mood.label.toLowerCase()} energy. Stay a while. ✨`;
  }
  switch (top.key) {
    case "sleep":
      return `Hi ${name}, only ${m.sleepHours}h of sleep is making it rain in here. Try a 4-7-8 breath with me — it's the quickest way to dim the storm.`;
    case "study":
      return `Hi ${name}, ${m.studyHours}h of deep work is a lot. Let's take 3 minutes — pet me, look at the window, then come back sharper.`;
    case "screen":
      return `Hi ${name}, your screen time is high. Let's do a breathing session to dim the room's rain! 🌧️`;
    case "caf":
      return `Hi ${name}, that ${m.caffeine.toLowerCase()} caffeine is buzzing through. Swap the next cup for water and a slow exhale.`;
    default:
      return `Hi ${name}, I'm here whenever you need me. 🐻`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Therapist chat phrase bank                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Small grounded-therapy response bank. We pick by simple keyword matching;
 * if nothing matches we fall back to a 5-4-3-2-1 grounding script — the most
 * universally calming response. Each line is a short paragraph so the bubble
 * feels substantive.
 */
const THERAPY_BANK: Array<{ match: RegExp; reply: (name: string) => string }> = [
  {
    match: /\b(tired|sleep|exhaust|insomn)/i,
    reply: (n) =>
      `That tiredness is real, ${n}. Sleep debt compounds — even one earlier night this week will reset your baseline. Tonight: dim screens an hour before bed, breathe 4 in / 6 out for two minutes, and let me hold the worry for you.`,
  },
  {
    match: /\b(anx|panic|nervous|worry|overwhelm)/i,
    reply: (n) =>
      `Let's slow this down together, ${n}. Feet on the floor. Name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, 1 you can taste. Anxiety lives in the future — this brings you back to right now.`,
  },
  {
    match: /\b(sad|down|depress|empty|cry|lonel)/i,
    reply: (n) =>
      `I hear you, ${n}. That heaviness deserves to be witnessed, not fixed. Place a hand on your chest, feel it rise, and just say: "this is hard, and I'm allowed to feel it." Sit with that for one slow minute.`,
  },
  {
    match: /\b(angry|mad|frustrat|annoy)/i,
    reply: (n) =>
      `Anger usually means a boundary was crossed, ${n}. Don't shove it down — name it. "I'm frustrated because ___." Then ask: what's the smallest thing I can change in the next hour? That's where your power is.`,
  },
  {
    match: /\b(focus|study|work|deadline)/i,
    reply: (n) =>
      `Cognitive load is heavy, ${n}. Try the 25/5 rhythm: 25 minutes of single-task work, 5 minutes away from the screen — stretch, water, look at something 20 feet away. Your brain rebuilds focus in those gaps.`,
  },
  {
    match: /\b(thank|love|good|better|okay|ok)/i,
    reply: (n) =>
      `That means a lot, ${n}. Noticing what's *working* is itself a practice — it teaches your nervous system where safety lives. I'll be right here whenever you need the room again. 🐻`,
  },
];

const GROUNDING_FALLBACK = (n: string) =>
  `I'm here, ${n}. Let's ground for a moment: take a slow breath in for 4, hold for 4, out for 6. Whatever you're carrying, you don't have to carry it alone in this room. Tell me a little more — what's the loudest feeling right now?`;

interface ChatMessage { id: string; from: "user" | "bear"; text: string; }

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export function BearRoomView() {
  const { userName, mlInputs, currentMood } = useMindVerse();
  const name = userName ?? "friend";

  // Re-derive every render — cheap, and we *want* immediate retint when
  // currentMood updates via the predictor.
  const tier = weatherFor(currentMood.stressLevel);
  const bearLine = useMemo(
    () => buildBearLine(name, mlInputs, currentMood),
    [name, mlInputs, currentMood],
  );

  /* ── Chat state ──────────────────────────────────────────────────────── */
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "intro", from: "bear", text: `Hey ${name}, I'm here. What's on your mind?` },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever the log grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");

    // 1) Append the user message immediately for optimistic UI.
    const userMsg: ChatMessage = { id: crypto.randomUUID(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    // 2) Pick a bear response from the phrase bank, then simulate typing.
    const match = THERAPY_BANK.find((b) => b.match.test(text));
    const reply = match ? match.reply(name) : GROUNDING_FALLBACK(name);

    setTyping(true);
    // Slight variable delay — feels more human than a fixed beat.
    const delay = 900 + Math.min(2400, reply.length * 22);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "bear", text: reply }]);
      setTyping(false);
    }, delay);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Local <style> — scoped via uniquely-prefixed class names so the
          keyframes don't collide with anything elsewhere in the app. */}
      <style>{BEAR_ROOM_CSS}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Companion</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">My Mood Room</h1>
        <p className="text-sm text-muted-foreground">
          A safe space that breathes with your stress signal.
        </p>
      </header>

      {/* ── ROOM CANVAS ───────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[24px] bg-card p-4 shadow-soft">
        {/*
          The canvas itself: `data-weather` swaps the background gradient via
          the CSS attribute selectors at the bottom of this file. We force
          rounded corners with `rounded-[24px]` per the design spec.
        */}
        <div
          data-weather={tier}
          className="bearroom-canvas relative h-72 overflow-hidden rounded-[24px] sm:h-80"
        >
          {/* ── Window frame — the architectural backbone of the scene.
                Two panes, thick mullions, anchored to the top-right corner
                so the room reads as a cozy bedroom corner. */}
          <div className="bearroom-window">
            <div className="bearroom-pane bearroom-pane-tl" />
            <div className="bearroom-pane bearroom-pane-tr" />
            <div className="bearroom-pane bearroom-pane-bl" />
            <div className="bearroom-pane bearroom-pane-br" />
          </div>

          {/* ── Sun (only visible when weather="low") — soft glowing disc */}
          <div className="bearroom-sun" aria-hidden />

          {/* ── Sunlight particles — float upward; CSS controls visibility */}
          <div className="bearroom-particles" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="bearroom-particle" style={{ ["--i" as string]: i }} />
            ))}
          </div>

          {/* ── Blooming flowers along the sill — only render at low stress */}
          <div className="bearroom-flowers" aria-hidden>
            {["#F4A896", "#F2C97C", "#C9B6DC", "#A8C5DC", "#87A878"].map((c, i) => (
              <span
                key={i}
                className="bearroom-flower"
                style={{ ["--c" as string]: c, ["--i" as string]: i }}
              />
            ))}
          </div>

          {/* ── Rain — many vertical streaks animated downward (high tier) */}
          <div className="bearroom-rain" aria-hidden>
            {Array.from({ length: 26 }).map((_, i) => (
              <span key={i} className="bearroom-drop" style={{ ["--i" as string]: i }} />
            ))}
          </div>

          {/* ── Candle on the windowsill — flickers via keyframe (high tier) */}
          <div className="bearroom-candle" aria-hidden>
            <div className="bearroom-candle-flame" />
            <div className="bearroom-candle-stick" />
          </div>

          {/* ── Floor + bear container, anchored to the bottom-left */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            {/* The bear — float keyframe loop applied via `bearroom-bear-float` */}
            <div className="bearroom-bear-float">
              <img
                src={bearImg}
                alt="MindVerse companion bear"
                width={140}
                height={140}
                className="h-32 w-32 select-none object-contain drop-shadow-[0_12px_22px_rgba(60,40,20,0.35)] sm:h-36 sm:w-36"
                draggable={false}
              />
            </div>

            {/* Dynamic speech bubble — text reflects strongest stress driver */}
            <div className="relative max-w-[60%] rounded-2xl bg-card/95 p-3 text-sm text-foreground shadow-soft-lg backdrop-blur-md">
              <p className="leading-snug">{bearLine}</p>
              {/* Bubble tail pointing toward the bear */}
              <span
                aria-hidden
                className="absolute -left-2 bottom-4 h-3 w-3 rotate-45 bg-card/95"
              />
            </div>
          </div>

          {/* ── Weather label, top-left — a quiet tag for context */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-[11px] font-semibold text-foreground/70 backdrop-blur">
            {tier === "high" ? <Cloud className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            {tier === "low" ? "Sunny" : tier === "high" ? "Stormy" : "Overcast"}
          </div>
        </div>

        {/* Caption strip beneath the canvas */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Room Mood
            </p>
            <p className="truncate text-base font-bold text-foreground">
              {currentMood.emoji} {currentMood.label}
            </p>
          </div>
          <div
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: currentMood.color + "55", color: "#3b2f1f" }}
          >
            Stress {currentMood.stressLevel}%
          </div>
        </div>
      </section>

      {/* ── THERAPIST CHAT CONSOLE ─────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[24px] bg-card shadow-soft">
        <header className="flex items-center gap-3 border-b border-border bg-sage-soft/60 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-card text-sage shadow-soft">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Talk with your Companion</p>
            <p className="text-[11px] text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sage align-middle" />
              Online · always listening
            </p>
          </div>
        </header>

        {/* Scrollable message log — fixed max-height keeps the composer in view */}
        <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <ChatBubble key={m.id} msg={m} />
          ))}
          {typing && <TypingBubble />}
        </div>

        {/* Composer — pill-shaped, with sage send button */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-border bg-muted/40 px-3 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            aria-label="Message your companion"
            className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-sage focus:ring-2 focus:ring-sage/30"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sage text-white shadow-soft transition hover:bg-sage/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sub-components                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.from === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        // Bear avatar — tiny image, matches the room mascot.
        <div className="mr-2 mt-0.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sage-soft">
          <img src={bearImg} alt="" width={32} height={32} className="h-7 w-7 object-contain" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft ${
          isUser
            ? "rounded-br-md bg-sage text-white"
            : "rounded-bl-md bg-muted text-foreground"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start">
      <div className="mr-2 mt-0.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sage-soft">
        <img src={bearImg} alt="" width={32} height={32} className="h-7 w-7 object-contain" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 shadow-soft">
        <div className="flex items-center gap-1">
          {/* Three dots that pulse on a staggered delay — pure CSS in the
              <style> block below. Aria-hidden because it's decorative. */}
          <span className="bearroom-dot" style={{ animationDelay: "0ms" }} />
          <span className="bearroom-dot" style={{ animationDelay: "180ms" }} />
          <span className="bearroom-dot" style={{ animationDelay: "360ms" }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Inline CSS — keyframes + weather-reactive selectors                         */
/* ─────────────────────────────────────────────────────────────────────────── */

const BEAR_ROOM_CSS = `
/* ── Default canvas (mid stress) — gentle overcast dusk ─────────────────── */
.bearroom-canvas {
  background: linear-gradient(170deg, #DEEAF3 0%, #EFE6F5 55%, #FCE0D7 100%);
  transition: background 900ms ease;
}
/* low stress → bright golden + mint warmth */
.bearroom-canvas[data-weather="low"] {
  background: linear-gradient(170deg, #FBEBC9 0%, #DCE8D4 60%, #FCE0D7 100%);
}
/* high stress → dim slate, moody and cold */
.bearroom-canvas[data-weather="high"] {
  background: linear-gradient(170deg, #3a4654 0%, #2a3340 60%, #1f2630 100%);
}

/* ── Corner window — sits at the top-right of the canvas ────────────────── */
.bearroom-window {
  position: absolute;
  top: 6%;
  right: 5%;
  width: 58%;
  height: 65%;
  border-radius: 80px 80px 24px 24px / 80px 80px 24px 24px; /* arched top */
  background: rgba(255,255,255,0.55);
  border: 6px solid rgba(255,255,255,0.85);
  box-shadow: inset 0 0 40px rgba(255,255,255,0.4), 0 8px 30px rgba(0,0,0,0.08);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  overflow: hidden;
  transition: background 900ms ease, border-color 900ms ease;
}
/* Window darkens with high stress */
[data-weather="high"] .bearroom-window {
  background: rgba(30,40,55,0.55);
  border-color: rgba(120,140,170,0.5);
  box-shadow: inset 0 0 40px rgba(120,140,170,0.25), 0 8px 30px rgba(0,0,0,0.3);
}
.bearroom-pane {
  border: 3px solid rgba(255,255,255,0.85);
  transition: border-color 900ms ease;
}
[data-weather="high"] .bearroom-pane { border-color: rgba(140,160,190,0.55); }

/* ── Sun disc — only visible in "low" tier via opacity selector ─────────── */
.bearroom-sun {
  position: absolute;
  top: 12%;
  right: 12%;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: radial-gradient(circle, #FFE9A8 0%, #F2C97C 60%, rgba(242,201,124,0) 75%);
  filter: blur(0.5px);
  opacity: 0;
  transition: opacity 900ms ease;
  animation: bearroom-sun-pulse 4s ease-in-out infinite;
}
.bearroom-canvas[data-weather="low"] .bearroom-sun { opacity: 1; }
@keyframes bearroom-sun-pulse {
  0%, 100% { transform: scale(1);   filter: blur(0.5px); }
  50%      { transform: scale(1.08); filter: blur(1px); }
}

/* ── Sunlight particles — drift upward; only render in low tier ─────────── */
.bearroom-particles {
  position: absolute; inset: 0; pointer-events: none;
  opacity: 0; transition: opacity 900ms ease;
}
.bearroom-canvas[data-weather="low"] .bearroom-particles { opacity: 1; }
.bearroom-particle {
  position: absolute;
  width: 6px; height: 6px; border-radius: 50%;
  background: radial-gradient(circle, #FFE9A8, rgba(255,233,168,0));
  /* Scatter each particle horizontally via --i (set inline 0..11) */
  left: calc(8% + (var(--i) * 7%));
  bottom: -10px;
  animation: bearroom-particle-rise 7s linear infinite;
  animation-delay: calc(var(--i) * -0.6s);
  opacity: 0.85;
}
@keyframes bearroom-particle-rise {
  0%   { transform: translateY(0)     scale(0.6); opacity: 0; }
  20%  { opacity: 0.9; }
  100% { transform: translateY(-260px) scale(1.1); opacity: 0; }
}

/* ── Blooming flowers — sit along an imaginary windowsill ───────────────── */
.bearroom-flowers {
  position: absolute;
  left: 6%; bottom: 8%;
  display: flex; gap: 14px;
  opacity: 0; transform: translateY(10px);
  transition: opacity 900ms ease, transform 900ms ease;
}
.bearroom-canvas[data-weather="low"] .bearroom-flowers {
  opacity: 1; transform: translateY(0);
}
.bearroom-flower {
  width: 18px; height: 18px; border-radius: 50%;
  /* Color set per-instance via --c (inline) — petals + center dot */
  background:
    radial-gradient(circle at 50% 50%, #fff7e0 0 22%, transparent 23%),
    radial-gradient(circle at 50% 50%, var(--c) 0 60%, transparent 61%);
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  animation: bearroom-bloom 3.6s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.4s);
}
@keyframes bearroom-bloom {
  0%, 100% { transform: scale(0.95) rotate(-4deg); }
  50%      { transform: scale(1.1)  rotate(4deg);  }
}

/* ── Rain — only visible at high stress; vertical falling streaks ────────── */
.bearroom-rain {
  position: absolute; inset: 0; pointer-events: none;
  opacity: 0; transition: opacity 900ms ease;
}
.bearroom-canvas[data-weather="high"] .bearroom-rain { opacity: 1; }
.bearroom-drop {
  position: absolute;
  top: -20px;
  /* Spread across full width using --i (0..25) */
  left: calc((var(--i) * 3.85%) + 1%);
  width: 2px; height: 14px;
  background: linear-gradient(180deg, rgba(168,197,220,0), rgba(220,232,212,0.9));
  border-radius: 2px;
  animation: bearroom-drop-fall 1.1s linear infinite;
  animation-delay: calc(var(--i) * -0.07s);
}
@keyframes bearroom-drop-fall {
  0%   { transform: translateY(-20px); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translateY(340px); opacity: 0; }
}

/* ── Candle on the sill — only visible at high stress; flickers ──────────── */
.bearroom-candle {
  position: absolute;
  right: 12%; bottom: 14%;
  width: 24px; height: 48px;
  opacity: 0; transition: opacity 900ms ease;
}
.bearroom-canvas[data-weather="high"] .bearroom-candle { opacity: 1; }
.bearroom-candle-stick {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 14px; height: 30px;
  background: linear-gradient(180deg, #fce0d7, #f2c97c);
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}
.bearroom-candle-flame {
  position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
  width: 14px; height: 22px; border-radius: 50% 50% 45% 45%;
  background: radial-gradient(circle at 50% 70%, #fff4b3, #ffae5a 65%, rgba(255,90,40,0.0) 80%);
  filter: drop-shadow(0 0 16px #ffae5a) drop-shadow(0 0 28px #ff7a3a);
  animation: bearroom-flicker 0.18s ease-in-out infinite;
  transform-origin: 50% 100%;
}
@keyframes bearroom-flicker {
  0%, 100% { transform: translateX(-50%) scale(1)    rotate(-1deg); opacity: 1;   }
  50%      { transform: translateX(-50%) scale(1.08) rotate(2deg);  opacity: 0.85;}
}

/* ── Bear float — infinite, very subtle bob; respects reduced motion ────── */
.bearroom-bear-float {
  animation: bearroom-float 4s ease-in-out infinite;
}
@keyframes bearroom-float {
  0%, 100% { transform: translateY(0)     rotate(-1deg); }
  50%      { transform: translateY(-8px)  rotate(1deg);  }
}
@media (prefers-reduced-motion: reduce) {
  .bearroom-bear-float,
  .bearroom-particle,
  .bearroom-drop,
  .bearroom-candle-flame,
  .bearroom-flower,
  .bearroom-sun { animation: none !important; }
}

/* ── Typing dots inside chat ────────────────────────────────────────────── */
.bearroom-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--sage);
  animation: bearroom-dot-pulse 1.1s ease-in-out infinite;
}
@keyframes bearroom-dot-pulse {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1;   }
}
`;
