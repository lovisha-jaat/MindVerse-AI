/**
 * MoodJournalCalendar.tsx
 * Calendar-style grid of historical mood entries. Each cell is a soft
 * pastel circle stamped with that day's emoji; today's tile gets a ring.
 */
import { useMindVerse } from "@/context/MindVerseContext";

export function MoodJournalCalendar() {
  const { moodJournal } = useMindVerse();
  const todayIso = new Date().toISOString().slice(0, 10);
  const sorted = [...moodJournal].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-[24px] bg-card p-5 shadow-soft">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-bold text-foreground">Mood Journal</h3>
        <p className="text-xs text-muted-foreground">Last {sorted.length} days</p>
      </header>
      <div className="grid grid-cols-7 gap-2">
        {sorted.map((entry) => {
          const isToday = entry.date === todayIso;
          return (
            <div
              key={entry.date}
              title={`${entry.date} · ${entry.label} (${entry.stressLevel}%)`}
              className="relative grid aspect-square place-items-center rounded-2xl text-lg"
              style={{
                backgroundColor: entry.color + "44",
                boxShadow: isToday ? `0 0 0 2px ${entry.color}` : undefined,
              }}
            >
              <span aria-hidden>{entry.emoji}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
