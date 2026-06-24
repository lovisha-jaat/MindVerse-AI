/**
 * PredictorView.tsx
 * -----------------------------------------------------------------------------
 * The heart of the MindVerse workspace: a two-column biomarker → stress
 * predictor. On mobile the columns stack vertically; on `lg:` screens they
 * sit side-by-side.
 *
 * Data flow:
 *   1. Local form state is mirrored into global `mlInputs` so other tabs can
 *      read the latest biomarker context (e.g. the Profile summary).
 *   2. "Run AI Biomarker Analysis" triggers a 2-second simulated loading
 *      state, then calls `predictStress(mlInputs)` from `lib/stressModel`.
 *   3. The result is:
 *        a) shown in the right-hand readout card with a breakdown,
 *        b) pushed into `currentMood` so the bottom nav, Home ring, and
 *           Bear Room weather instantly retint to the new color, and
 *        c) appended to the Mood Journal calendar via `logMoodToJournal`.
 *
 * The "AI Executive Summary" card at the bottom uses a template literal to
 * address the user by name and weave their inputs into a short paragraph.
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
import { Activity, Brain, Moon, MonitorSmartphone, Coffee, HeartPulse, Sparkles } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";
import { predictStress, type CaffeineLevel } from "@/lib/stressModel";
import { MoodJournalCalendar } from "@/components/MoodJournalCalendar";

/** Small helper for slider rows so the markup stays scannable below. */
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
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/80">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-white">
          {value}
          <span className="ml-1 text-xs font-normal text-white/50">{unit}</span>
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
  const { userName, mlInputs, setMlInputs, currentMood, setCurrentMood, logMoodToJournal } =
    useMindVerse();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ReturnType<typeof predictStress> | null>(null);

  /**
   * Run the simulated Random-Forest prediction. We deliberately introduce a
   * 2-second delay so the skeleton state is visible — in a real product this
   * would be the round-trip to an inference endpoint.
   */
  function runAnalysis() {
    setLoading(true);
    window.setTimeout(() => {
      const result = predictStress(mlInputs);
      setLastResult(result);
      setCurrentMood(result);      // global retint
      logMoodToJournal(result);    // append today's mood
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">ML Predictor</p>
        <h1 className="text-2xl font-semibold text-white">Biomarker Analysis</h1>
        <p className="text-sm text-white/60">
          Tune the inputs to model how today is shaping your stress signal.
        </p>
      </header>

      {/* Two-column grid on lg, stacked on mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ───── COLUMN 1 · Biomarker inputs ───────────────────────────── */}
        <section className="space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <header className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#A8D5BA]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
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

          {/* Caffeine dropdown — ordinal categorical */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-white/80">
              <Coffee className="h-4 w-4" />
              <span className="text-sm font-medium">Caffeine Intake</span>
            </div>
            <Select
              value={mlInputs.caffeine}
              onValueChange={(v) => setMlInputs({ caffeine: v as CaffeineLevel })}
            >
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-white">
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

          {/* HRV wearable toggle */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#A8D5BA]/15 text-[#A8D5BA]">
                <HeartPulse className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">HRV Sensor Link</p>
                <p className="text-xs text-white/50">Stream live heart-rate variability</p>
              </div>
            </div>
            <Switch
              checked={!!mlInputs.hrvLinked}
              onCheckedChange={(v) => setMlInputs({ hrvLinked: v })}
            />
          </div>
        </section>

        {/* ───── COLUMN 2 · Results & Analytics ────────────────────────── */}
        <section className="space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <header className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#FFD66B]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              Results &amp; Analytics
            </h2>
          </header>

          {/* Hero readout */}
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            // Tinted to the *most recent* prediction (or current mood pre-run).
            style={{
              background: `radial-gradient(circle at 30% 20%, ${(lastResult ?? currentMood).color}55, transparent 60%), rgba(255,255,255,0.03)`,
            }}
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3 bg-white/10" />
                <Skeleton className="h-16 w-full bg-white/10" />
                <Skeleton className="h-4 w-1/2 bg-white/10" />
                <p className="pt-1 text-xs text-white/60">
                  AI running Random Forest prediction…
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div
                  className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-4xl"
                  style={{ backgroundColor: (lastResult ?? currentMood).color + "33" }}
                >
                  {(lastResult ?? currentMood).emoji}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-white/50">
                    Predicted Tier
                  </p>
                  <p className="truncate text-2xl font-semibold text-white">
                    {(lastResult ?? currentMood).label}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Stress score:{" "}
                    <span className="font-semibold text-white">
                      {(lastResult ?? currentMood).stressLevel}%
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* The Math: a transparent breakdown so users trust the model */}
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-[11px] leading-relaxed text-white/70">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
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
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#A8D5BA] to-[#FFD66B] text-base font-semibold text-[#1b1330] hover:opacity-90"
          >
            {loading ? "Analyzing…" : "Run AI Biomarker Analysis"}
          </Button>
        </section>
      </div>

      {/* Historical mood calendar */}
      <MoodJournalCalendar />

      {/* AI Executive Summary — template-literal personalization */}
      <ExecutiveSummary />
    </div>
  );
}

/**
 * ExecutiveSummary
 * Premium card that synthesises a human-readable paragraph from the latest
 * inputs + mood. Uses template literals to address the user by name and
 * surface "trends" — in production this is where you'd plug in an LLM call.
 */
function ExecutiveSummary() {
  const { userName, mlInputs, currentMood, moodJournal } = useMindVerse();

  // A trivial trend signal: compare today's score to the 7-day rolling average
  // of the journal. Positive delta = stress is up vs. the recent baseline.
  const recent = moodJournal.slice(-7);
  const avg =
    recent.length > 0
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
    <article className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#1b1330] via-[#241846] to-[#0f0a22] p-6 shadow-2xl">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: currentMood.color + "55" }}
      />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <Sparkles className="h-4 w-4 text-[#FFD66B]" />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
            AI Executive Summary
          </h3>
        </div>
        <p className="text-base leading-relaxed text-white/90">{summary}</p>
      </div>
    </article>
  );
}
