/**
 * Stub views for tabs other than Home + Predictor.
 * Pastel calm-sanctuary styling matches the rest of the workspace.
 */

/* ─────────── Bear Room ─────────── */
// BearRoomView lives in its own file — re-export keeps the existing
// `import { BearRoomView } from "./StubViews"` chain in WorkspaceShell working.
export { BearRoomView } from "./BearRoomView";

/* ─────────── Sounds + Wellness Tools ─────────── */
export { SoundsView } from "./SoundsView";

/* ─────────── Profile ─────────── */
export { ProfileView } from "./ProfileView";
