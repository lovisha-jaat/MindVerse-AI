/**
 * recoveryMissions.ts
 * -----------------------------------------------------------------------------
 * Canonical definitions for the daily Recovery Missions checklist.
 *
 * These missions are the behavioural "recovery loop" of MindVerse: small,
 * evidence-aligned habits (hydration, movement, breathwork, screen awareness)
 * that the user ticks off throughout the day. Each mission carries a
 * `stressRelief` weight — the number of points subtracted from the user's
 * ML-derived stress score when the mission is marked complete.
 *
 * DATA FLOW (mission check → dashboard metrics):
 *   1. User taps a checklist row in `RecoveryMissionsChecklist`.
 *   2. The row calls `toggleMission(id)` from `MindVerseContext`.
 *   3. Context updates `completedMissions` (add or remove the id).
 *   4. Context recomputes `effectiveMood` via `applyMissionRelief()` below,
 *      summing relief weights for every completed mission id.
 *   5. `HomeView` reads `effectiveMood.stressLevel` and passes it through
 *      `energyFromStress` / `happinessFromStress` / `focusFromStress` in
 *      `dashboardMetrics.ts`, so Energy and Happiness rings rise as stress falls.
 *   6. Unchecking a mission removes its id and *reverses* the relief delta,
 *      restoring the prior stress level and lowering dashboard weights again.
 *
 * Persisted ids survive reloads via the `completedMissions` array in
 * localStorage (`mindverse:v1`).
 */

import { tierFromScore, type MoodResult } from "@/lib/stressModel";

/** A single recoverable daily habit shown in the checklist UI. */
export interface RecoveryMission {
  /** Stable key stored in `completedMissions` and localStorage. */
  id: string;
  /** Human-readable label rendered beside the checkbox. */
  label: string;
  /**
   * Points subtracted from the ML stress score when this mission is complete.
   * Larger values produce a more visible bump on Energy / Happiness bars.
   */
  stressRelief: number;
}

/** The four Recovery Missions surfaced in the checklist panel. */
export const RECOVERY_MISSIONS: readonly RecoveryMission[] = [
  { id: "water", label: "Drink 1 Liter Water", stressRelief: 4 },
  { id: "walk", label: "10 Minute Mindful Walk", stressRelief: 5 },
  { id: "breath", label: "Complete Breathing Circle Exercise", stressRelief: 6 },
  { id: "ml-screen", label: "Log Screen Time in ML Predictor", stressRelief: 3 },
] as const;

/** Sum of relief points for all currently completed mission ids. */
export function totalMissionRelief(completedIds: string[]): number {
  return RECOVERY_MISSIONS.reduce(
    (sum, m) => sum + (completedIds.includes(m.id) ? m.stressRelief : 0),
    0,
  );
}

/**
 * Merge ML-derived mood with mission relief into the mood the dashboard displays.
 *
 * @param baseMood       Raw output from `predictStress()` / ML Predictor tab.
 * @param completedIds   Snapshot of `completedMissions` from context.
 * @returns A new `MoodResult` whose `stressLevel` is reduced by completed missions
 *          and whose label/color/emoji are re-tiered via `tierFromScore`.
 */
export function applyMissionRelief(baseMood: MoodResult, completedIds: string[]): MoodResult {
  const relief = totalMissionRelief(completedIds);
  const adjustedStress = Math.max(0, Math.min(100, baseMood.stressLevel - relief));
  return tierFromScore(adjustedStress);
}

/** Percentage of recovery missions completed today (0–100). */
export function missionCompletionPercent(completedIds: string[]): number {
  const total = RECOVERY_MISSIONS.length;
  if (total === 0) return 0;
  const done = RECOVERY_MISSIONS.filter((m) => completedIds.includes(m.id)).length;
  return Math.round((done / total) * 100);
}
