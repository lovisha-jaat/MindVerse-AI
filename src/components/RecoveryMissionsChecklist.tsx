/**
 * RecoveryMissionsChecklist.tsx
 * -----------------------------------------------------------------------------
 * The gamified Recovery Missions panel — a gorgeously spaced checklist with
 * scale-pop check animations, a standalone circular progress ring, and a
 * direct pipe into global dashboard metrics via MindVerse context.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  CHECK → DASHBOARD DATA PIPELINE (read this before modifying)           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. USER ACTION                                                         │
 * │     User taps a mission row → `handleToggle(id)` fires.                 │
 * │                                                                         │
 * │  2. LOCAL ANIMATION (this component)                                     │
 * │     `animatingId` is set so the checkbox plays a scale-pop keyframe.    │
 * │     This is purely cosmetic — no metric math happens here.              │
 * │                                                                         │
 * │  3. CONTEXT MUTATION (MindVerseContext.toggleMission)                    │
 * │     • Adds or removes `id` from the `completedMissions` string array.   │
 * │     • Persists the array to localStorage on the next effect tick.       │
 * │                                                                         │
 * │  4. DERIVED MOOD (MindVerseContext effectiveMood memo)                  │
 * │     `applyMissionRelief(baseMood, completedMissions)` sums each         │
 * │     mission's `stressRelief` weight (see lib/recoveryMissions.ts) and   │
 * │     subtracts the total from the ML stress score, then re-tiers label,  │
 * │     color, and emoji via tierFromScore().                               │
 * │                                                                         │
 * │  5. DASHBOARD RE-RENDER (HomeView subscribers)                          │
 * │     HomeView reads `effectiveMood.stressLevel` and feeds it through     │
 * │     energyFromStress / happinessFromStress / focusFromStress.           │
 * │     Checking "10 Minute Mindful Walk" (−5 stress) visibly raises        │
 * │     Energy ~4.5 pts and Happiness ~5.25 pts; unchecking reverses both.  │
 * │                                                                         │
 * │  6. PROGRESS RING (this component)                                      │
 * │     `missionCompletionPercent(completedMissions)` drives the SVG ring     │
 * │     independently of stress math — it reflects checklist completion only. │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";
import {
  RECOVERY_MISSIONS,
  missionCompletionPercent,
} from "@/lib/recoveryMissions";

/* ─────────────── Circular Progress Ring ───────────────────────────────── */

/**
 * MissionProgressRing — standalone SVG ring showing checklist completion %.
 * Animated stroke-dashoffset mirrors the hero StressRing in HomeView for
 * visual consistency across the dashboard.
 */
function MissionProgressRing({ percent, color }: { percent: number; color: string }) {
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
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
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1), stroke 0.5s ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-2xl font-extrabold tabular-nums text-foreground">
            {percent}<span className="text-sm text-muted-foreground">%</span>
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Complete
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Checklist Item ─────────────────────────────────────────── */

interface MissionItemProps {
  id: string;
  label: string;
  done: boolean;
  animating: boolean;
  onToggle: (id: string) => void;
}

/**
 * MissionCheckItem — one checklist row with a scale-pop animation on toggle.
 * The animation state is local; the completion state flows from context.
 */
function MissionCheckItem({ id, label, done, animating, onToggle }: MissionItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="group flex w-full items-center gap-4 rounded-[20px] border border-transparent bg-muted/50 px-4 py-4 text-left transition-all duration-200 hover:border-sage/20 hover:bg-muted/80 active:scale-[0.99]"
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
            done
              ? "border-sage bg-sage text-white shadow-[0_4px_14px_rgba(135,168,120,0.45)]"
              : "border-border bg-card group-hover:border-sage/40"
          } ${animating ? "animate-mission-pop" : ""}`}
        >
          {done && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
        <span
          className={`flex-1 text-[15px] font-semibold leading-snug transition-colors duration-300 ${
            done ? "text-muted-foreground line-through decoration-sage/40" : "text-foreground"
          }`}
        >
          {label}
        </span>
      </button>
    </li>
  );
}

/* ─────────────── Main Panel ─────────────────────────────────────────────── */

export function RecoveryMissionsChecklist() {
  const { completedMissions, toggleMission, effectiveMood } = useMindVerse();

  /** Tracks which row is mid pop-animation (cleared after 420 ms). */
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const percent = missionCompletionPercent(completedMissions);
  const doneCount = RECOVERY_MISSIONS.filter((m) => completedMissions.includes(m.id)).length;

  /**
   * Bridges the tap gesture to context and triggers the local pop animation.
   * All dashboard metric updates happen downstream in context — not here.
   */
  const handleToggle = useCallback(
    (id: string) => {
      setAnimatingId(id);
      toggleMission(id);
      window.setTimeout(() => setAnimatingId(null), 420);
    },
    [toggleMission],
  );

  return (
    <section className="rounded-[28px] bg-card p-6 shadow-soft">
      {/* Keyframes for the scale-pop check animation */}
      <style>{`
        @keyframes mission-pop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.28); }
          65%  { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        .animate-mission-pop {
          animation: mission-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-butter" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              Recovery Missions
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete habits to boost your energy &amp; happiness
          </p>
        </div>
        <MissionProgressRing percent={percent} color={effectiveMood.color} />
      </header>

      {/* Generously spaced checklist — 14px vertical rhythm between rows */}
      <ul className="space-y-3.5">
        {RECOVERY_MISSIONS.map((mission) => (
          <MissionCheckItem
            key={mission.id}
            id={mission.id}
            label={mission.label}
            done={completedMissions.includes(mission.id)}
            animating={animatingId === mission.id}
            onToggle={handleToggle}
          />
        ))}
      </ul>

      <p className="mt-5 text-center text-xs font-medium text-muted-foreground">
        {doneCount} of {RECOVERY_MISSIONS.length} missions completed today
      </p>
    </section>
  );
}
