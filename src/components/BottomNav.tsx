/**
 * BottomNav.tsx
 * Sticky bottom navigation. Tabs are *state-driven* (not URL-driven) because
 * MindVerse is a single-screen mobile shell; we swap views inside the
 * workspace container rather than navigating routes. Each tab gets a
 * Lucide icon, label, and an animated dot when active.
 */
import { Home, Activity, Cloud, Music2, User } from "lucide-react";
import { useMindVerse, type TabId } from "@/context/MindVerseContext";

interface NavItem {
  id: TabId;
  label: string;
  Icon: typeof Home;
}

// Order matters — this is left-to-right on the bar.
const ITEMS: NavItem[] = [
  { id: "home",      label: "Home",      Icon: Home },
  { id: "predictor", label: "Predictor", Icon: Activity },
  { id: "bear-room", label: "Bear",      Icon: Cloud },
  { id: "sounds",    label: "Sounds",    Icon: Music2 },
  { id: "profile",   label: "Profile",   Icon: User },
];

export function BottomNav() {
  const { activeTab, setActiveTab, currentMood } = useMindVerse();

  return (
    /*
     * Layout: fixed to viewport bottom, full width, safe-area inset padding
     * for iOS notch devices. The blur+gradient gives the floating-glass feel.
     */
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0f0a22]/80 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={active ? "page" : undefined}
                className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition"
                style={active ? { color: currentMood.color } : { color: "rgba(255,255,255,0.55)" }}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
                {/* Active indicator pill — tinted to the live mood color */}
                <span
                  className={`h-1 w-6 rounded-full transition ${active ? "opacity-100" : "opacity-0"}`}
                  style={{ backgroundColor: currentMood.color }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
