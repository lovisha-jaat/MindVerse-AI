/**
 * WorkspaceShell.tsx
 * Outer chrome for the MindVerse mobile app — calm cream paper, floating
 * mute toggle, scrollable content well, sticky bottom nav, onboarding overlay.
 */
import { OnboardingModal } from "./OnboardingModal";
import { MuteToggle } from "./MuteToggle";
import { BottomNav } from "./BottomNav";
import { useMindVerse } from "@/context/MindVerseContext";
import { PredictorView } from "./views/PredictorView";
import { HomeView } from "./views/HomeView";
import { BearRoomView, SoundsView, ProfileView } from "./views/StubViews";

export function WorkspaceShell() {
  const { activeTab, effectiveMood } = useMindVerse();

  const ActiveView = (() => {
    switch (activeTab) {
      case "predictor": return <PredictorView />;
      case "bear-room": return <BearRoomView />;
      case "sounds":    return <SoundsView />;
      case "profile":   return <ProfileView />;
      case "home":
      default:          return <HomeView />;
    }
  })();

  return (
    <div
      // Expose the live mood color as a CSS variable so any descendant can
      // tint accents via `var(--mood-color)` (e.g. ring stroke, mission bar).
      style={{ ["--mood-color" as string]: effectiveMood.color }}
      className="relative min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      {/* Soft ambient blobs — extremely faint so the paper feel dominates */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-sage-soft opacity-60 blur-3xl" />
        <div className="absolute right-[-6rem] top-1/3 h-96 w-96 rounded-full bg-peach-soft opacity-60 blur-3xl" />
        <div
          className="absolute left-1/4 bottom-10 h-80 w-80 rounded-full opacity-40 blur-3xl transition-colors duration-700"
          style={{ backgroundColor: effectiveMood.color }}
        />
      </div>

      {/* Content well — responsive for mobile, tablet, and desktop */}
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-20 md:max-w-3xl lg:max-w-5xl">
        {ActiveView}
      </main>

      <BottomNav />
      <OnboardingModal />
    </div>
  );
}
