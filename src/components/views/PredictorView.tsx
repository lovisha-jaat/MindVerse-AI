/**
 * PredictorView.tsx — calm pastel restyle
 * -----------------------------------------------------------------------------
 * Two-column biomarker → stress predictor. On mobile the columns stack;
 * on `lg:` they sit side-by-side.
 *
 * Flow:
 *   1. Local form changes mirror into global mlInputs.
 *   2. Tapping "Run AI Biomarker Analysis" shows a 2s skeleton, then calls
 *      predictStress() and pushes the result into currentMood + journal.
 */
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Brain,
  Moon,
  MonitorSmartphone,
  Coffee,
  HeartPulse,
  Sparkles,
  Download,
} from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";
import { predictStress, type CaffeineLevel } from "@/lib/stressModel";
import { MoodJournalCalendar } from "@/components/MoodJournalCalendar";

function SliderRow({
  icon: Icon,
  label,
  value,
  min,
  max,
  step = 0.5,
  unit,
  onChange,
}: {
  icon: typeof Moon;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-muted/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground/80">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {value}
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0]!)}
      />
    </div>
  );
}

export function PredictorView() {
  const { mlInputs, setMlInputs, currentMood, setCurrentMood, logMoodToJournal, moodJournal } =
    useMindVerse();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ReturnType<typeof predictStress> | null>(null);

  const exportCSV = () => {
    if (moodJournal.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Label", "Emoji", "Stress Level (%)"];
    const rows = moodJournal.map((entry) =>
      [entry.date, entry.label, entry.emoji, entry.stressLevel]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csvContent = [headers.join(","), ...rows].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `mindverse-mood-journal-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function runAnalysis() {
    setLoading(true);
    window.setTimeout(() => {
      const result = predictStress(mlInputs);
      setLastResult(result);
      setCurrentMood(result);
      logMoodToJournal(result);
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">ML Predictor</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Biomarker Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Tune the inputs to model how today is shaping your stress signal.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── Column 1 · Biomarker inputs ──────────────────────────────── */}
        <section className="space-y-3 rounded-[28px] bg-card p-5 shadow-soft">
          <header className="mb-1 flex items-center gap-2">
            <Brain className="h-4 w-4 text-sage" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">
              Biomarker Inputs
            </h2>
          </header>

          <SliderRow
            icon={Moon}
            label="Sleep Hours"
            value={mlInputs.sleepHours}
            min={0}
            max={12}
            unit="h"
            onChange={(v) => setMlInputs({ sleepHours: v })}
          />
          <SliderRow
            icon={Brain}
            label="Study / Work Hours"
            value={mlInputs.studyHours}
            min={0}
            max={16}
            unit="h"
            onChange={(v) => setMlInputs({ studyHours: v })}
          />
          <SliderRow
            icon={MonitorSmartphone}
            label="Screen Time"
            value={mlInputs.screenTime}
            min={0}
            max={16}
            unit="h"
            onChange={(v) => setMlInputs({ screenTime: v })}
          />

          <div className="space-y-3 rounded-2xl bg-muted/60 p-4">
            <div className="flex items-center gap-2 text-foreground/80">
              <Coffee className="h-4 w-4" />
              <span className="text-sm font-semibold">Caffeine Intake</span>
            </div>
            <Select
              value={mlInputs.caffeine}
              onValueChange={(v) => setMlInputs({ caffeine: v as CaffeineLevel })}
            >
              <SelectTrigger className="h-11 rounded-xl border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-sage-soft text-sage">
                <HeartPulse className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">HRV Sensor Link</p>
                <p className="text-xs text-muted-foreground">Stream live heart-rate variability</p>
              </div>
            </div>
            <Switch
              checked={!!mlInputs.hrvLinked}
              onCheckedChange={(v) => setMlInputs({ hrvLinked: v })}
            />
          </div>
        </section>

        {/* ── Column 2 · Results & Analytics ───────────────────────────── */}
        <section className="space-y-4 rounded-[28px] bg-card p-5 shadow-soft">
          <header className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-peach" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">
              Results &amp; Analytics
            </h2>
          </header>

          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${(lastResult ?? currentMood).color}55, transparent 60%), var(--sage-soft)`,
            }}
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <p className="pt-1 text-xs text-muted-foreground">
                  AI running Random Forest prediction…
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-4xl shadow-soft"
                  style={{ backgroundColor: (lastResult ?? currentMood).color + "55" }}
                >
                  {(lastResult ?? currentMood).emoji}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Predicted Tier
                  </p>
                  <p className="truncate text-2xl font-extrabold text-foreground">
                    {(lastResult ?? currentMood).label}
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    Stress score:{" "}
                    <span className="font-bold text-foreground">
                      {(lastResult ?? currentMood).stressLevel}%
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Math breakdown — keeps the model transparent */}
          <div className="space-y-1 rounded-2xl bg-muted/60 p-4 font-mono text-[11px] leading-relaxed text-foreground/70">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Math Breakdown
            </p>
            <p>baseline = 25</p>
            <p>sleep_delta = (8 − {mlInputs.sleepHours}) × 6</p>
            <p>study_load = max(0, {mlInputs.studyHours} − 4) × 3</p>
            <p>screen_load = max(0, {mlInputs.screenTime} − 3) × 2</p>
            <p>caffeine[{mlInputs.caffeine}] contribution</p>
            <p>
              interaction = max(0, 8 − {mlInputs.sleepHours}) × {mlInputs.studyHours} × 0.6
            </p>
            {mlInputs.hrvLinked && <p>hrv_bonus = −4</p>}
          </div>

          <Button
            onClick={runAnalysis}
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-sage text-base font-bold text-white shadow-soft hover:bg-sage/90"
          >
            {loading ? "Analyzing…" : "Run AI Biomarker Analysis"}
          </Button>
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportCSV}
          disabled={moodJournal.length === 0}
          className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-foreground shadow-soft transition hover:bg-muted/50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export Journal CSV
        </button>
      </div>
      <MoodJournalCalendar />
      <ExecutiveSummary />
    </div>
  );
}

function ExecutiveSummary() {
  const { userName, mlInputs, currentMood, moodJournal } = useMindVerse();

  // Trend signal: today's stress vs 7-day rolling average.
  const recent = moodJournal.slice(-7);
  const avg = recent.length
    ? Math.round(recent.reduce((s, e) => s + e.stressLevel, 0) / recent.length)
    : currentMood.stressLevel;
  const delta = currentMood.stressLevel - avg;
  const direction =
    delta > 4 ? "trending higher" : delta < -4 ? "easing downward" : "holding steady";

  const summary = `Hey ${userName ?? "friend"} — your stress signal is currently ${currentMood.stressLevel}% (${currentMood.label}), ${direction} versus your 7-day average of ${avg}%. With ${mlInputs.sleepHours}h sleep, ${mlInputs.studyHours}h of focus work, ${mlInputs.screenTime}h screen time and ${mlInputs.caffeine.toLowerCase()} caffeine intake today, the model suggests ${
    currentMood.stressLevel > 60
      ? "carving out a 10-minute decompression break in the Bear Room."
      : currentMood.stressLevel > 40
        ? "queueing a calming soundscape and a short walk."
        : "keeping this rhythm — your biomarkers look balanced."
  }`;

  return (
    <article className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-sage-soft via-butter-soft to-peach-soft p-6 shadow-soft">
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/70 backdrop-blur">
            <Sparkles className="h-4 w-4 text-butter" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/70">
            AI Executive Summary
          </h3>
        </div>
        <p className="text-base leading-relaxed text-foreground/90">{summary}</p>
      </div>
    </article>
  );
}
