/**
 * WorkspaceShell.tsx
 * The outer chrome of the MindVerse mobile app: deep gradient backdrop,
 * floating mute toggle, scrollable content well, sticky bottom nav, and
 * an onboarding modal overlay. The currently-selected tab id from context
 * decides which view component renders inside the well.
 */
import { OnboardingModal } from "./OnboardingModal";
import { MuteToggle } from "./MuteToggle";
import { BottomNav } from "./BottomNav";
import { useMindVerse } from "@/context/MindVerseContext";
import { PredictorView } from "./views/PredictorView";
import { HomeView } from "./views/HomeView";
import { BearRoomView, SoundsView, ProfileView } from "./views/StubViews";

export function WorkspaceShell() {
  const { activeTab, currentMood } = useMindVerse();

  // Pick the active view. Keeping this as a switch (rather than an object
  // map) makes future per-tab transition logic trivial to slot in.
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
      // Inject the live mood color as a CSS custom property so any descendant
      // can reach for `var(--mood-color)` (e.g. animated borders, ring glow).
      style={{ ["--mood-color" as string]: currentMood.color }}
      className="relative min-h-screen overflow-x-hidden bg-[#0f0a22] text-white"
    >
      {/* Decorative ambient blobs — purely cosmetic */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#A8D5BA]/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-1/2 h-96 w-96 rounded-full bg-[#FFD66B]/10 blur-3xl" />
        <div
          className="absolute left-1/3 bottom-0 h-80 w-80 rounded-full blur-3xl transition-colors duration-700"
          style={{ backgroundColor: currentMood.color + "22" }}
        />
      </div>

      <MuteToggle />

      {/*
       * Content well — the bottom padding keeps the final card clear of the
       * sticky nav (safe-area aware). max-w-2xl reads beautifully on tablet
       * while still feeling mobile-native.
       */}
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-20">
        {ActiveView}
      </main>

      <BottomNav />
      <OnboardingModal />
    </div>
  );
}
