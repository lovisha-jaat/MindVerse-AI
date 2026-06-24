/**
 * HomeView.tsx
 * -----------------------------------------------------------------------------
 * The dashboard the user lands on. It is *read-mostly* — everything here
 * derives from the global MindVerse state set by the ML Predictor:
 *
 *   currentMood.stressLevel  →  hero ring percentage + glow color
 *   currentMood.color/label  →  badge pill + ring stroke tint
 *   completedMissions.length →  daily progress bar
 *
 * Energy & Happiness are *inverse functions* of stress (see helpers below)
 * so the three numbers always tell a consistent story.
 */
import { useEffect, useState } from "react";
import { ArrowRight, Cloud, Activity, Zap, Smile, Sparkles } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Time-of-day → greeting copy. Uses the user's *local* hour. */
function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5)  return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

/**
 * Inverse score helpers. Energy decays mostly linearly with stress; Happiness
 * uses a slightly steeper curve so very high stress shows a sharp emotional
 * drop (matches user expectations from wellness apps).
 */
const energyFromStress    = (s: number) => Math.max(0, Math.min(100, Math.round(100 - s * 0.9)));
const happinessFromStress = (s: number) => Math.max(0, Math.min(100, Math.round(100 - s * 1.05)));

/* ─────────────────────────────────────────────────────────────────────────── */
/* Circular hero ring                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * StressRing: an SVG circle whose stroke-dashoffset animates from "empty"
 * to the target percentage on mount and whenever the value changes. The
 * stroke + outer glow are tinted by the live mood color.
 */
function StressRing({ value, color, label, emoji }: { value: number; color: string; label: string; emoji: string }) {
  // Geometry — tuned for a 240px viewport
  const size = 240;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated value: start at 0 on mount so the trail "draws in".
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    // Defer one frame so the transition picks up the change.
    const id = requestAnimationFrame(() => setAnimated(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div
      className="relative grid place-items-center"
      // Outer ambient glow — driven by mood color via inline style.
      style={{ filter: `drop-shadow(0 0 40px ${color}66)` }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Animated progress trail */}
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
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1), stroke 0.6s ease" }}
        />
      </svg>
      {/* Centered numeric readout */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-5xl" aria-hidden>{emoji}</div>
          <div className="mt-1 text-5xl font-bold tabular-nums text-white">{value}<span className="text-2xl text-white/60">%</span></div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">Stress · {label}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main view                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

export function HomeView() {
  const { userName, currentMood, completedMissions, setActiveTab } = useMindVerse();

  // Derived metrics — recomputed every render, cheap.
  const energy    = energyFromStress(currentMood.stressLevel);
  const happiness = happinessFromStress(currentMood.stressLevel);

  // Daily missions: pretend the goal is 10 per day.
  const missionsTotal = 10;
  const missionsDone  = Math.min(missionsTotal, completedMissions.length);
  const missionsPct   = (missionsDone / missionsTotal) * 100;

  // Greeting recomputed each render (cheap; no state needed).
  const greeting = greetingFor(new Date());

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">🌱 MindVerse AI</p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          {greeting}, {userName ?? "friend"} <span aria-hidden>✨</span>
        </h1>
        <p className="text-sm text-white/60">Here's how your mind is doing right now.</p>
      </header>

      {/* ─── HERO RING ─────────────────────────────────────────────────── */}
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex justify-center py-2">
          <StressRing
            value={currentMood.stressLevel}
            color={currentMood.color}
            label={currentMood.label}
            emoji={currentMood.emoji}
          />
        </div>

        {/* Active mood pill — large, hex-tinted, sits directly under the ring */}
        <div className="mt-6 flex justify-center">
          <div
            className="flex items-center gap-3 rounded-full px-5 py-3 shadow-lg"
            style={{ backgroundColor: currentMood.color, color: "#1b1330" }}
          >
            <span className="text-2xl" aria-hidden>{currentMood.emoji}</span>
            <span className="text-sm font-semibold uppercase tracking-wider">
              Today · {currentMood.label}
            </span>
          </div>
        </div>
      </section>

      {/* ─── METRIC GRID (Energy + Happiness) ─────────────────────────── */}
      <section className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={Zap}
          label="Energy"
          value={energy}
          accent="#FFD66B"
          caption="Inverse of cognitive load"
        />
        <MetricCard
          icon={Smile}
          label="Happiness"
          value={happiness}
          accent="#A8D5BA"
          caption="Modeled from mood tier"
        />
      </section>

      {/* ─── CALL-TO-ACTION BANNERS ───────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CtaBanner
          onClick={() => setActiveTab("bear-room")}
          icon={Cloud}
          eyebrow="Digital Sanctuary"
          title="Open the Bear Room"
          blurb="A weather-reactive space to decompress."
          gradient="from-[#241846] via-[#2f1d5c] to-[#A8D5BA]/40"
        />
        <CtaBanner
          onClick={() => setActiveTab("predictor")}
          icon={Activity}
          eyebrow="Biomarker Scan"
          title="Launch a fresh AI scan"
          blurb="Re-run the model with today's signal."
          gradient="from-[#241846] via-[#3a1d5c] to-[#FFD66B]/40"
        />
      </section>

      {/* ─── DAILY RECOVERY PROGRESS ──────────────────────────────────── */}
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <header className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FFD66B]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              Daily Recovery
            </h3>
          </div>
          <p className="text-sm font-semibold tabular-nums text-white">
            {missionsDone}/{missionsTotal} Missions Completed
          </p>
        </header>
        {/* Linear progress bar — tinted to the live mood color */}
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${missionsPct}%`,
              background: `linear-gradient(90deg, ${currentMood.color}, #FFD66B)`,
              boxShadow: `0 0 16px ${currentMood.color}88`,
            }}
          />
        </div>
        <p className="mt-3 text-xs text-white/50">
          {missionsDone === missionsTotal
            ? "All missions cleared — well done."
            : `${missionsTotal - missionsDone} small wins left for today.`}
        </p>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sub-components                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function MetricCard({
  icon: Icon, label, value, accent, caption,
}: {
  icon: typeof Zap; label: string; value: number; accent: string; caption: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: accent + "22", color: accent }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs uppercase tracking-wider text-white/50">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-white">
        {value}<span className="ml-0.5 text-lg font-medium text-white/50">%</span>
      </p>
      {/* Mini bar showing the same metric visually */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, backgroundColor: accent }} />
      </div>
      <p className="mt-2 text-[11px] text-white/40">{caption}</p>
    </div>
  );
}

function CtaBanner({
  onClick, icon: Icon, eyebrow, title, blurb, gradient,
}: {
  onClick: () => void; icon: typeof Cloud; eyebrow: string; title: string; blurb: string; gradient: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br ${gradient} p-5 text-left shadow-lg transition hover:scale-[1.01] hover:shadow-2xl`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-5 w-5 text-white/70 transition group-hover:translate-x-1 group-hover:text-white" />
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-white/60">{eyebrow}</p>
      <h4 className="mt-1 text-lg font-semibold text-white">{title}</h4>
      <p className="mt-1 text-xs text-white/70">{blurb}</p>
    </button>
  );
}
