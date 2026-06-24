/**
 * Stub placeholder views for tabs other than the Predictor.
 * Each is a minimal scaffold ready for future detail work; layout, padding
 * and design tokens are already wired in so swapping in real content
 * doesn't require touching the shell.
 */
import { useMindVerse } from "@/context/MindVerseContext";

function TabFrame({ kicker, title, blurb, children }: { kicker: string; title: string; blurb: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">{kicker}</p>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-white/60">{blurb}</p>
      </header>
      {children}
    </div>
  );
}

// HomeView now lives in ./HomeView.tsx — re-exported from the shell directly.


export function BearRoomView() {
  return (
    <TabFrame
      kicker="Bear Room"
      title="Your calm companion"
      blurb="Weather canvas + speech bubble system land here."
    >
      <div className="grid h-64 place-items-center rounded-[24px] border border-white/10 bg-white/5 text-sm text-white/60 backdrop-blur-xl">
        Coming soon — interactive bear + dynamic weather.
      </div>
    </TabFrame>
  );
}

export function SoundsView() {
  return (
    <TabFrame
      kicker="Sounds"
      title="Ambient library"
      blurb="2×3 grid of soundscapes with ripple visualizers."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl" />
        ))}
      </div>
    </TabFrame>
  );
}

export function ProfileView() {
  const { userName, completedMissions, currentMood } = useMindVerse();
  return (
    <TabFrame
      kicker="Profile"
      title={userName ?? "Anonymous traveller"}
      blurb="Your streaks and records."
    >
      <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <p className="text-sm text-white/70">Current mood: <span className="font-semibold text-white">{currentMood.label}</span></p>
        <p className="text-sm text-white/70">Missions completed: <span className="font-semibold text-white">{completedMissions.length}</span></p>
      </div>
    </TabFrame>
  );
}
