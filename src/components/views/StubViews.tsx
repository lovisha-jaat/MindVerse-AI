/**
 * Stub views for tabs other than Home + Predictor.
 * Pastel calm-sanctuary styling matches the rest of the workspace.
 */
import { Play, Pause, Award, Flame } from "lucide-react";
import { useState } from "react";
import { useMindVerse } from "@/context/MindVerseContext";

/* ─────────── shared frame ─────────── */

function TabFrame({ kicker, title, blurb, children }: {
  kicker: string; title: string; blurb: string; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">{kicker}</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </header>
      {children}
    </div>
  );
}

/* ─────────── Bear Room ─────────── */
// BearRoomView lives in its own file — re-export keeps the existing
// `import { BearRoomView } from "./StubViews"` chain in WorkspaceShell working.
export { BearRoomView } from "./BearRoomView";

/* ─────────── Sounds + Wellness Tools ─────────── */
export { SoundsView } from "./SoundsView";

/* ─────────── Profile ─────────── */

export function ProfileView() {
  const { userName, completedMissions, currentMood, moodJournal } = useMindVerse();
  const streak = Math.min(moodJournal.length, 21);

  return (
    <TabFrame
      kicker="Profile"
      title={userName ?? "Anonymous traveller"}
      blurb="Your streaks and records."
    >
      {/* Identity card */}
      <section className="flex items-center gap-4 rounded-[28px] bg-card p-5 shadow-soft">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-sage-soft text-2xl font-bold text-sage">
          {userName?.[0]?.toUpperCase() ?? "M"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-foreground">{userName ?? "friend"}</p>
          <p className="text-xs text-muted-foreground">Member since today · MindVerse AI</p>
        </div>
        <div
          className="rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ backgroundColor: currentMood.color + "55", color: "#3b2f1f" }}
        >
          {currentMood.emoji} {currentMood.label}
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-peach-soft p-4 shadow-soft">
          <div className="flex items-center gap-2 text-foreground/70">
            <Flame className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Streak</p>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground">{streak} <span className="text-base text-muted-foreground">days</span></p>
        </div>
        <div className="rounded-[24px] bg-butter-soft p-4 shadow-soft">
          <div className="flex items-center gap-2 text-foreground/70">
            <Award className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Missions</p>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground">{completedMissions.length}</p>
        </div>
      </section>

      {/* Mood spread */}
      <section className="rounded-[24px] bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent moods</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {moodJournal.slice(-14).map((e) => (
            <span
              key={e.date}
              className="grid h-9 w-9 place-items-center rounded-xl text-base"
              style={{ backgroundColor: e.color + "44" }}
              title={`${e.date} · ${e.label}`}
            >
              {e.emoji}
            </span>
          ))}
        </div>
      </section>
    </TabFrame>
  );
}
