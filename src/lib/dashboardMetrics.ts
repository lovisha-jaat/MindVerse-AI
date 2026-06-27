/**
 * dashboardMetrics.ts
 * -----------------------------------------------------------------------------
 * Shared inverse transforms that convert a stress score (0–100) into the three
 * pastel metric weights shown on the Home dashboard: Energy, Happiness, Focus.
 *
 * These helpers are intentionally pure functions so both `HomeView` and any
 * future analytics widgets can derive identical numbers from the same
 * `effectiveMood.stressLevel` that mission relief already adjusted upstream.
 *
 * When a Recovery Mission is checked off, `MindVerseContext` lowers
 * `effectiveMood.stressLevel`; these functions automatically produce higher
 * Energy / Happiness percentages on the next render — no extra wiring needed
 * in the checklist component itself.
 */

/** Butter-toned Energy bar — inversely proportional to stress. */
export function energyFromStress(stress: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - stress * 0.9)));
}

/** Lavender Happiness bar — slightly more sensitive to stress drops. */
export function happinessFromStress(stress: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - stress * 1.05)));
}

/** Sky Focus bar — gentler slope so it moves subtly with missions. */
export function focusFromStress(stress: number): number {
  return Math.max(0, Math.min(100, Math.round(95 - stress * 0.7)));
}
