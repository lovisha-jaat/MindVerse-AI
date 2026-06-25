/**
 * SoundsView.tsx
 * -----------------------------------------------------------------------------
 * The "Sounds & Wellness Tools" tab. Three composable surfaces:
 *
 *   1. AmbientSoundGrid  – 2×3 grid of soundscape cards. Tapping a card toggles
 *                          its `playing` state. Only one card may play at a
 *                          time. When the global `isMuted` flag is true we
 *                          force every card into the paused visual state.
 *   2. BreathingCircle   – CSS-driven 4-4-6 breathing pacer. We use a single
 *                          `phase` state ("inhale" | "hold" | "exhale") and let
 *                          the CSS transition duration match the phase length
 *                          so the animation is the timing source of truth.
 *   3. ZenGarden         – HTML <canvas> that renders fading raked-sand
 *                          strokes following pointer / touch input.
 *
 * Mood-reactive accents come from `currentMood.color` injected as inline
 * style (`--mood-color`) on the local container.
 */

import { useEffect, useRef, useState } from "react";
import { Pause, Play, VolumeX } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";

/* ───────────────────────── Sound catalogue ─────────────────────────────── */
// Spec-mandated 6 entries laid out as a 2 columns × 3 rows responsive grid.
const SOUNDS = [
  { id: "rain",   label: "Rain",   emoji: "🌧",  tone: "var(--sky-soft)" },
  { id: "ocean",  label: "Ocean",  emoji: "🌊",  tone: "var(--sky-soft)" },
  { id: "forest", label: "Forest", emoji: "🌲",  tone: "var(--sage-soft)" },
  { id: "cafe",   label: "Cafe",   emoji: "☕",  tone: "var(--butter-soft)" },
  { id: "piano",  label: "Piano",  emoji: "🎹",  tone: "var(--lavender-soft)" },
  { id: "sleep",  label: "Sleep",  emoji: "🌙",  tone: "var(--peach-soft)" },
] as const;

/* ───────────────────────── Tab frame helper ────────────────────────────── */
function TabFrame({ kicker, title, blurb, children }: {
  kicker: string; title: string; blurb: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">{kicker}</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </header>
      {children}
    </div>
  );
}

/* =========================================================================
 * AMBIENT SOUND GRID
 * ========================================================================= */
function AmbientSoundGrid({ moodColor }: { moodColor: string }) {
  const { isMuted, toggleMute } = useMindVerse();
  // `playing` is the ID of the currently active card, or null.
  const [playing, setPlaying] = useState<string | null>(null);

  // Toggle handler — also unmutes the global audio bus when the user
  // explicitly starts a soundscape (otherwise the visuals would lie).
  const handleTap = (id: string) => {
    setPlaying((prev) => (prev === id ? null : id));
    if (isMuted) toggleMute();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Ambient Soundscapes</h2>
        {isMuted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-soft">
            <VolumeX className="h-3 w-3" /> muted globally
          </span>
        )}
      </div>

      {/* 2 columns × 3 rows on every breakpoint — the spec is explicit. */}
      <div className="grid grid-cols-2 gap-3">
        {SOUNDS.map((s) => {
          // A card is visually "active" only when it is the selected sound
          // AND the global audio bus is not muted. This keeps the UI honest
          // with respect to what the user can actually hear.
          const active = playing === s.id && !isMuted;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleTap(s.id)}
              aria-pressed={active}
              className={[
                "group relative overflow-hidden rounded-[24px] p-4 text-left",
                "shadow-soft transition-all duration-300 ease-out",
                // `scale-[1.02]` per spec — a subtle "lift" when active.
                active ? "scale-[1.02]" : "hover:-translate-y-0.5",
              ].join(" ")}
              style={{
                background: s.tone,
                // Mood-coloured glowing border ring, only when active.
                boxShadow: active
                  ? `0 0 0 2px ${moodColor}, 0 12px 30px -10px ${moodColor}aa`
                  : undefined,
              }}
            >
              {/* Animated ripple — pure CSS keyframes defined below. */}
              {active && (
                <>
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[24px]"
                    style={{
                      animation: "soundRipple 2.4s ease-out infinite",
                      border: `2px solid ${moodColor}`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[24px]"
                    style={{
                      animation: "soundRipple 2.4s ease-out 1.2s infinite",
                      border: `2px solid ${moodColor}`,
                    }}
                  />
                </>
              )}

              <div className="text-3xl" aria-hidden>{s.emoji}</div>
              <p className="mt-6 text-sm font-bold text-foreground">{s.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {active ? "Playing…" : "Tap to play"}
              </p>

              <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-foreground shadow-soft">
                {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================================
 * BREATHING CIRCLE
 *
 * Phase machine:
 *   inhale (4s) → hold (4s) → exhale (6s) → inhale …
 *
 * The CSS transition `duration` is set per phase so the visual easing
 * naturally lasts the full duration of the phase. We rely on a single
 * setTimeout cascade (cleaned up on unmount or `running` toggle).
 * ========================================================================= */
type Phase = "inhale" | "hold" | "exhale";
const PHASES: Record<Phase, { ms: number; next: Phase; label: string; scale: number }> = {
  inhale: { ms: 4000, next: "hold",   label: "Inhale", scale: 1.0 },
  hold:   { ms: 4000, next: "exhale", label: "Hold",   scale: 1.0 },
  exhale: { ms: 6000, next: "inhale", label: "Exhale", scale: 0.55 },
};

function BreathingCircle({ moodColor }: { moodColor: string }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");

  // The phase scheduler. We re-run the effect whenever the phase or running
  // flag changes — the timeout transitions to the *next* phase, which then
  // schedules the one after that, and so on.
  useEffect(() => {
    if (!running) return;
    const conf = PHASES[phase];
    const id = window.setTimeout(() => setPhase(conf.next), conf.ms);
    return () => window.clearTimeout(id);
  }, [phase, running]);

  const conf = PHASES[phase];
  // For the "hold" phase we keep the inhaled scale (1.0). We compute the
  // visual scale from a base of 0.55 so the contracted circle is small but
  // still legible at typical mobile sizes (~120px).
  const scale = running ? conf.scale : 0.7;

  return (
    <section className="rounded-[28px] bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Breathing Circle</h2>
          <p className="text-xs text-muted-foreground">4·4·6 box-style pacer</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRunning((r) => !r);
            setPhase("inhale");
          }}
          className="rounded-full bg-sage px-4 py-1.5 text-xs font-bold text-white shadow-soft transition hover:opacity-90"
        >
          {running ? "Stop" : "Start"}
        </button>
      </div>

      <div className="relative mx-auto mt-6 grid h-[260px] w-[260px] place-items-center">
        {/* Soft halo — pulses subtly during the hold phase only. */}
        <span
          className="absolute h-full w-full rounded-full opacity-50 blur-2xl"
          style={{
            background: moodColor,
            animation: running && phase === "hold" ? "breathHoldPulse 2s ease-in-out infinite" : undefined,
          }}
        />
        {/* The breathing orb. The transition duration matches the phase
            length so a phase change triggers a perfectly-timed tween. */}
        <span
          className="relative grid h-full w-full place-items-center rounded-full text-foreground"
          style={{
            background: `radial-gradient(circle at 30% 30%, white, ${moodColor})`,
            transform: `scale(${scale})`,
            transition: `transform ${conf.ms}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            boxShadow: `0 20px 60px -10px ${moodColor}aa`,
          }}
        >
          <div className="text-center">
            <p className="font-display text-2xl font-extrabold">{running ? conf.label : "Ready"}</p>
            <p className="text-xs text-muted-foreground">
              {running ? `${conf.ms / 1000}s` : "Tap start"}
            </p>
          </div>
        </span>
      </div>
    </section>
  );
}

/* =========================================================================
 * ZEN GARDEN — pointer-trail canvas
 *
 * Implementation notes:
 *  - We keep a `strokes` ref containing every active line segment along with
 *    its birth timestamp. Each animation frame:
 *      1. Compute `age = now - segment.bornAt`.
 *      2. Derive `alpha = 1 - age / LIFETIME`; drop segments past lifetime.
 *      3. Clear the canvas and redraw each segment with its current alpha.
 *  - DPR-aware: we multiply the backing-store size by `devicePixelRatio`
 *    so strokes stay crisp on retina displays without re-scaling on resize.
 *  - Pointer events handle mouse + touch in a single unified path.
 * ========================================================================= */
interface Segment {
  x1: number; y1: number; x2: number; y2: number; bornAt: number;
}
const STROKE_LIFETIME_MS = 4500; // total fade duration

function ZenGarden({ moodColor }: { moodColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Segment[]>([]);
  // Last pointer coordinate, used to draw a continuous line from frame to
  // frame instead of disconnected dots. Reset to null on pointer-up.
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // ---- canvas sizing (DPR aware, runs once + on resize) -----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      // setTransform avoids compounding scale on resize.
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ---- render loop ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const loop = () => {
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();
      // Soft beige sand base — redrawn each frame so old strokes can fade.
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Filter out any strokes whose lifetime has elapsed. We mutate the ref
      // in-place to avoid React re-renders 60×/sec.
      strokesRef.current = strokesRef.current.filter(
        (s) => now - s.bornAt < STROKE_LIFETIME_MS,
      );

      // Draw remaining strokes with linearly-decaying alpha.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const seg of strokesRef.current) {
        const age = now - seg.bornAt;
        const alpha = Math.max(0, 1 - age / STROKE_LIFETIME_MS);
        ctx.strokeStyle = withAlpha(moodColor, alpha * 0.85);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [moodColor]);

  // ---- pointer handlers -------------------------------------------------
  // Convert a pointer event into canvas-local coordinates. We subtract the
  // canvas bounding rect so the math is independent of page scroll.
  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPtRef.current = toLocal(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!lastPtRef.current) return;
    const next = toLocal(e);
    // Push a new segment from the last point to the current point, stamped
    // with the current time for fade computation.
    strokesRef.current.push({
      x1: lastPtRef.current.x, y1: lastPtRef.current.y,
      x2: next.x,              y2: next.y,
      bornAt: performance.now(),
    });
    lastPtRef.current = next;
  };
  const onUp = () => { lastPtRef.current = null; };

  return (
    <section className="rounded-[28px] bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Zen Garden</h2>
          <p className="text-xs text-muted-foreground">Drag your finger to rake the sand.</p>
        </div>
        <button
          type="button"
          onClick={() => { strokesRef.current = []; }}
          className="rounded-full bg-sage-soft px-3 py-1 text-[11px] font-bold text-foreground shadow-soft"
        >
          Smooth sand
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="mt-4 block h-[220px] w-full touch-none rounded-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, #fdf5e6 0%, #f1e3c8 70%, #e6d3b0 100%)",
          cursor: "crosshair",
        }}
      />
    </section>
  );
}

/* Helper: convert "#RRGGBB" → "rgba(r,g,b,a)". Lets us animate alpha
   without restating the mood hue everywhere. */
function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* =========================================================================
 * Local keyframes — scoped via a <style> tag so we don't touch the global
 * design system. Tailwind v4's `@theme` setup is for tokens, not animations.
 * ========================================================================= */
const LOCAL_CSS = `
  @keyframes soundRipple {
    0%   { transform: scale(1);    opacity: 0.55; }
    100% { transform: scale(1.18); opacity: 0;    }
  }
  @keyframes breathHoldPulse {
    0%, 100% { transform: scale(1);    opacity: 0.45; }
    50%      { transform: scale(1.05); opacity: 0.65; }
  }
`;

/* =========================================================================
 * Public export
 * ========================================================================= */
export function SoundsView() {
  const { currentMood } = useMindVerse();
  return (
    <>
      <style>{LOCAL_CSS}</style>
      <TabFrame
        kicker="Soundscape"
        title="Sounds & Wellness"
        blurb="Ambient mixes, paced breathing, and a zen garden to calm the mind."
      >
        <AmbientSoundGrid moodColor={currentMood.color} />
        <BreathingCircle moodColor={currentMood.color} />
        <ZenGarden moodColor={currentMood.color} />
      </TabFrame>
    </>
  );
}
