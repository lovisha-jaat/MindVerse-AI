/**
 * stressModel.ts
 * -----------------------------------------------------------------------------
 * A *simulated* Random-Forest style biomarker → stress predictor.
 *
 * The real model lives only in our imagination — what we ship here is a
 * deterministic, well-documented heuristic that mimics the *shape* of the
 * predictions a tree ensemble might output. We use it to drive the global
 * `currentMood` state (color, emoji, label) and the stressLevel ring in the UI.
 *
 * Why a heuristic instead of a real ML call?
 *  - Zero network/latency cost — perfect for an on-device wellness demo.
 *  - Transparent: every feature has an explicit, inspectable weight.
 *  - Stable: identical inputs always return identical outputs (great for QA).
 *
 * Feature contributions (intentionally aligned with sleep-science literature):
 *   sleep        → strong negative contributor (more sleep = less stress)
 *   study/work   → strong positive contributor (more grind = more stress)
 *   screenTime   → moderate positive contributor (blue light + cognitive load)
 *   caffeine     → discrete positive contributor (sympathetic activation)
 *   hrvLinked    → small negative bias when wearable signal is available
 *                  (acts as a "we trust the data more" calmness offset)
 *
 * The non-linear `study/sleep` interaction term is the key behavioural rule
 * the product spec calls out: "if study hours are high AND sleep is low,
 * scale the stress level high". We multiply the deficit between expected
 * sleep (8h) and actual sleep by the study/work load, then add it on top.
 */

export type CaffeineLevel = "None" | "Low" | "Medium" | "High";

export interface MlInputs {
  sleepHours: number;   // 0-12
  studyHours: number;   // 0-16
  screenTime: number;   // 0-16
  caffeine: CaffeineLevel;
  heartRate: number;    // resting bpm (used in summary)
  hrvLinked?: boolean;  // wearable connected toggle
}

export type MoodTier = "Happy" | "Calm" | "Neutral" | "Stress" | "High Stress";

export interface MoodResult {
  label: MoodTier;
  color: string;   // exact hex from product palette
  emoji: string;
  stressLevel: number; // clamped 0-100
}

/**
 * Numeric weighting for the caffeine dropdown. We treat caffeine as an
 * ordinal categorical variable rather than a continuous one — the steps
 * roughly match cup counts (None=0, Low≈1, Medium≈2-3, High≈4+).
 */
const CAFFEINE_WEIGHT: Record<CaffeineLevel, number> = {
  None: 0,
  Low: 4,
  Medium: 9,
  High: 16,
};

/**
 * Map a numeric 0-100 stress score onto a discrete mood tier.
 * The hex values here are the *canonical* product palette — do NOT alter
 * them without updating the design tokens in styles.css to match.
 */
export function tierFromScore(score: number): MoodResult {
  if (score < 20)  return { label: "Happy",       color: "#FFD66B", emoji: "😄", stressLevel: score };
  if (score < 40)  return { label: "Calm",        color: "#A8D5BA", emoji: "😌", stressLevel: score };
  if (score < 60)  return { label: "Neutral",     color: "#BFC9D1", emoji: "😐", stressLevel: score };
  if (score < 80)  return { label: "Stress",      color: "#F5A26B", emoji: "😣", stressLevel: score };
  return            { label: "High Stress",  color: "#E5604D", emoji: "😫", stressLevel: score };
}

/**
 * Core "model": maps biomarker inputs → stress score in [0, 100].
 *
 * Step-by-step:
 *   1. Compute a baseline of 25 (everyone has a little baseline stress).
 *   2. Add the sleep deficit penalty: each hour below 8 adds 6 points.
 *      Bonus hours above 8 *subtract* 3 points (capped, sleeping 12h
 *      doesn't make you a zen monk).
 *   3. Add study/work load: 3 points per hour above a 4h baseline.
 *   4. Add screen-time load: 2 points per hour above a 3h baseline.
 *   5. Add caffeine bump via the lookup table.
 *   6. Apply the *interaction* term — the spec's headline rule:
 *        interaction = max(0, 8 - sleep) * studyHours * 0.6
 *      So 3h sleep + 12h study contributes ~36 extra points.
 *   7. If the HRV wearable is linked, subtract 4 — we have richer data so
 *      we down-weight noisy self-reports a touch.
 *   8. Clamp to [0, 100] and round for a clean integer for the UI ring.
 */
export function predictStress(inputs: MlInputs): MoodResult {
  const { sleepHours, studyHours, screenTime, caffeine, hrvLinked } = inputs;

  let score = 25; // (1) baseline

  // (2) sleep deficit / surplus
  const sleepDelta = 8 - sleepHours;
  score += sleepDelta >= 0 ? sleepDelta * 6 : sleepDelta * 3;

  // (3) study/work cognitive load
  score += Math.max(0, studyHours - 4) * 3;

  // (4) screen time load
  score += Math.max(0, screenTime - 3) * 2;

  // (5) caffeine contribution
  score += CAFFEINE_WEIGHT[caffeine];

  // (6) sleep × study interaction — the headline non-linear rule
  const interaction = Math.max(0, 8 - sleepHours) * studyHours * 0.6;
  score += interaction;

  // (7) wearable trust bonus
  if (hrvLinked) score -= 4;

  // (8) clamp + round
  score = Math.round(Math.min(100, Math.max(0, score)));

  return tierFromScore(score);
}
