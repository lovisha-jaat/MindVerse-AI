/**
 * OnboardingModal.tsx
 * Intercepts the workspace when `userName` is null. Captures the user's
 * name and persists it via context (which mirrors to localStorage). Once
 * a name is set this component renders nothing.
 */
import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";

export function OnboardingModal() {
  const { userName, setUserName } = useMindVerse();
  const [draft, setDraft] = useState("");

  // Dialog stays open while userName is null. Persistence to localStorage
  // happens automatically inside MindVerseProvider's useEffect.
  const open = !userName;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim().length < 1) return;
    setUserName(draft.trim());
  }

  return (
    <Dialog open={open}>
      <DialogContent className="rounded-[24px] border-none bg-gradient-to-br from-[#1b1330] via-[#241846] to-[#0f0a22] text-white shadow-2xl sm:max-w-md">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur-xl">
            <Sparkles className="h-7 w-7 text-[#FFD66B]" />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Welcome to MindVerse AI
          </DialogTitle>
          <DialogDescription className="text-white/70">
            A calmer mind, predicted in real time. What should we call you?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your name"
            className="h-12 rounded-2xl border-white/15 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:ring-[#A8D5BA]"
          />
          <Button
            type="submit"
            disabled={!draft.trim()}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#A8D5BA] to-[#FFD66B] text-base font-semibold text-[#1b1330] hover:opacity-90"
          >
            Enter MindVerse
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
