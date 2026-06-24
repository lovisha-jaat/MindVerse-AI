import { createFileRoute } from "@tanstack/react-router";
import { MindVerseProvider } from "@/context/MindVerseContext";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindVerse AI · Predict your calm" },
      { name: "description", content: "Real-time AI biomarker analysis that turns sleep, focus and lifestyle inputs into a live mood signal." },
      { property: "og:title", content: "MindVerse AI" },
      { property: "og:description", content: "Real-time AI biomarker analysis for everyday calm." },
    ],
  }),
  component: Index,
});

// Top-level page: the provider owns shared state, the shell owns layout.
function Index() {
  return (
    <MindVerseProvider>
      <WorkspaceShell />
    </MindVerseProvider>
  );
}
