/**
 * MoodJournalCalendar.tsx
 * A calendar-style grid of historical mood entries. Each cell is a circular
 * tile filled with that day's mood color and emoji. Today's tile is ringed.
 */
import { useMindVerse } from "@/context/MindVerseContext";

export function MoodJournalCalendar() {
  const { moodJournal } = useMindVerse();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Display in chronological order so the most recent days sit bottom-right.
  const sorted = [...moodJournal].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-white">Mood Journal</h3>
        <p className="text-xs text-white/50">Last {sorted.length} days</p>
      </header>
      <div className="grid grid-cols-7 gap-2">
        {sorted.map((entry) => {
          const isToday = entry.date === todayIso;
          return (
            <div
              key={entry.date}
              title={`${entry.date} · ${entry.label} (${entry.stressLevel}%)`}
              className="relative grid aspect-square place-items-center rounded-2xl text-lg shadow-inner"
              style={{
                backgroundColor: entry.color + "33", // 20% alpha tint
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
