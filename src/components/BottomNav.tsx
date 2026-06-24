/**
 * BottomNav.tsx
 * Sticky bottom nav. Light glass card floating above cream paper. The active
 * tab is pill-highlighted in sage and the live mood color tints the dot.
 */
import { Home, Activity, Cloud, Music2, User } from "lucide-react";
import { useMindVerse, type TabId } from "@/context/MindVerseContext";

interface NavItem { id: TabId; label: string; Icon: typeof Home; }

const ITEMS: NavItem[] = [
  { id: "home",      label: "Home",      Icon: Home },
  { id: "predictor", label: "Insights",  Icon: Activity },
  { id: "bear-room", label: "Companion", Icon: Cloud },
  { id: "sounds",    label: "Sounds",    Icon: Music2 },
  { id: "profile",   label: "Profile",   Icon: User },
];

export function BottomNav() {
  const { activeTab, setActiveTab, currentMood } = useMindVerse();

  return (
    <nav
      className="fixed bottom-3 left-1/2 z-30 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-[28px] border border-border bg-card/90 px-2 py-2 shadow-soft-lg backdrop-blur-xl"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 gap-1">
        {ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition ${
                  active ? "bg-sage-soft text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.4 : 1.8}
                  style={active ? { color: currentMood.color } : undefined}
                />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
