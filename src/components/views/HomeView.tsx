/**
 * HomeView.tsx — Calm pastel dashboard
 * -----------------------------------------------------------------------------
 * Mirrors the reference inspiration: a soft cream paper page with a hero
 * Stress Level card (circular ring), a row of pastel metric cards with
 * sparklines, an "AI Companion" bear card, and a Today's Mission tracker.
 *
 * Data is *all* derived from the global MindVerse context:
 *   effectiveMood.stressLevel → ring %, metric bars (mission relief applied)
 *   completedMissions         → Recovery Missions checklist + progress ring
 *   userName                    → personalized greeting (client-only to avoid SSR mismatch)
 *
 * Mission → dashboard pipeline:
 *   Checklist toggles update `completedMissions` in context, which recomputes
 *   `effectiveMood` (lower stress). Energy / Happiness / Focus bars read that
 *   adjusted stress via helpers in `lib/dashboardMetrics.ts`.
 */
import { useEffect, useState } from "react";
import { ArrowRight, Bell } from "lucide-react";
import bearImg from "@/assets/bear.png";
import { RecoveryMissionsChecklist } from "@/components/RecoveryMissionsChecklist";
import { useMindVerse } from "@/context/MindVerseContext";
import { energyFromStress, happinessFromStress, focusFromStress } from "@/lib/dashboardMetrics";

/* ─────────────── helpers ──────────────────────────────────────────────── */

/** Time-of-day → greeting. Called only on the client (see useEffect below). */
function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

// Inverse score helpers live in lib/dashboardMetrics.ts — imported above.

/* ─────────────── hero stress ring ─────────────────────────────────────── */

/**
 * StressRing — SVG circle with an animated stroke-dashoffset trail. The ring
 * is tinted to the live mood color; the inner number reads the stress %.
 */
function StressRing({ value, color }: { value: number; color: string }) {
  const size = 150;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate from 0 on mount / when value changes.
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1), stroke 0.6s ease",
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-extrabold tabular-nums text-foreground">
            {value}
            <span className="text-lg text-muted-foreground">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── tiny sparkline (decorative) ──────────────────────────── */

function Sparkline({ color, seed = 0 }: { color: string; seed?: number }) {
  // Deterministic pseudo-random wave so the line doesn't reflow each render.
  const pts = Array.from({ length: 14 }, (_, i) => {
    const v = 0.5 + 0.35 * Math.sin((i + seed) * 0.9) + 0.08 * Math.cos((i + seed) * 2.1);
    return [i * (80 / 13), 28 - v * 24] as const;
  });
  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 80 32" className="h-8 w-full" preserveAspectRatio="none">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────── main view ────────────────────────────────────────────── */

export function HomeView() {
  const { userName, effectiveMood, setActiveTab } = useMindVerse();

  const energy = energyFromStress(effectiveMood.stressLevel);
  const happiness = happinessFromStress(effectiveMood.stressLevel);
  const focus = focusFromStress(effectiveMood.stressLevel);

  // Greeting depends on the local clock — only know it client-side, so we
  // render a stable placeholder on first paint to avoid React hydration
  // mismatches between the SSR HTML and the browser.
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    setGreeting(greetingFor(new Date()));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {greeting}, <span className="text-foreground">{userName ?? "friend"}</span>{" "}
            <span aria-hidden>🌿</span>
          </p>
          <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground">
            MindVerse <span className="text-sage">AI</span>
          </h1>
          <p className="text-xs text-muted-foreground">Your Personal Mental Wellness Companion</p>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="grid h-10 w-10 place-items-center rounded-full bg-card text-muted-foreground shadow-soft transition hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* ─── HERO ROW: Stress (large) + Energy/Happiness/Focus (stacked) ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {/* Stress Level card — peach pastel, ring inside */}
        <article className="sm:col-span-2 rounded-[28px] bg-peach-soft p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Stress Level
          </p>
          <div className="mt-4 flex justify-center">
            <StressRing value={effectiveMood.stressLevel} color={effectiveMood.color} />
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-foreground/80">
            {effectiveMood.emoji} {effectiveMood.label}
          </p>
        </article>

        {/* Metric stack: Energy / Happiness / Focus */}
        <div className="sm:col-span-3 grid grid-cols-1 gap-3">
          <MetricRow label="Energy" value={energy} color="var(--butter)" seed={1} />
          <MetricRow label="Happiness" value={happiness} color="var(--lavender)" seed={3} />
          <MetricRow label="Focus" value={focus} color="var(--sky)" seed={5} />
        </div>
      </section>

      {/* ─── AI COMPANION BANNER ───────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[28px] bg-card p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-sage">AI Companion</p>
            <p className="text-sm leading-relaxed text-foreground/85">
              Hi {userName ?? "friend"} 👋 <br />
              You've been doing amazing today. Let's take a 3-min breathing break?
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("bear-room")}
              className="inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-sage/90"
            >
              Start Now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <img
            src={bearImg}
            alt=""
            aria-hidden
            width={120}
            height={120}
            loading="lazy"
            className="h-28 w-28 shrink-0 object-contain drop-shadow-[0_8px_20px_rgba(120,90,60,0.18)]"
          />
        </div>
      </section>

      {/* ─── RECOVERY MISSIONS CHECKLIST ─────────────────────────────── */}
      <RecoveryMissionsChecklist />
    </div>
  );
}

/* ─────────────── sub-components ───────────────────────────────────────── */

function MetricRow({
  label,
  value,
  color,
  seed,
}: {
  label: string;
  value: number;
  color: string;
  seed: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] bg-card p-4 shadow-soft">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-foreground">
          {value}
          <span className="ml-0.5 text-base text-muted-foreground">%</span>
        </p>
      </div>
      <div className="w-24 shrink-0">
        <Sparkline color={color} seed={seed} />
      </div>
    </div>
  );
}
