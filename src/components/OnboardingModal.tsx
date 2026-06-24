/**
 * OnboardingModal.tsx
 * Intercepts the workspace while `userName` is null. Captures the name and
 * persists via context (which mirrors into localStorage).
 */
import { useState, type FormEvent } from "react";
import bearImg from "@/assets/bear.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMindVerse } from "@/context/MindVerseContext";

export function OnboardingModal() {
  const { userName, setUserName } = useMindVerse();
  const [draft, setDraft] = useState("");

  const open = !userName;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim().length < 1) return;
    setUserName(draft.trim());
  }

  return (
    <Dialog open={open}>
      <DialogContent className="overflow-hidden rounded-[28px] border-none bg-card p-0 shadow-soft-lg sm:max-w-md">
        {/* Decorative pastel header band */}
        <div className="relative flex justify-center bg-gradient-to-br from-sage-soft via-butter-soft to-peach-soft px-6 pb-2 pt-8">
          <img
            src={bearImg}
            alt="MindVerse companion bear"
            width={140}
            height={140}
            className="drop-shadow-[0_8px_20px_rgba(120,90,60,0.25)]"
          />
        </div>
        <div className="space-y-5 px-6 pb-7 pt-4">
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Welcome to MindVerse AI
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your personal mental wellness companion. What should we call you?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your name"
              className="h-12 rounded-2xl border-border bg-muted text-base focus-visible:ring-sage"
            />
            <Button
              type="submit"
              disabled={!draft.trim()}
              className="h-12 w-full rounded-2xl bg-sage text-base font-semibold text-white shadow-soft hover:bg-sage/90"
            >
              Enter MindVerse
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
