/**
 * MuteToggle.tsx
 * Floating glassmorphic button anchored top-right. Holds the global ambient
 * <audio> tag so switching tabs never restarts the loop.
 */
import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";

// Silent 1s WAV — placeholder loop so audio APIs work without a shipped MP3.
const SILENT_LOOP =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export function MuteToggle() {
  const { isMuted, toggleMute } = useMindVerse();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = isMuted;
    if (!isMuted) el.play().catch(() => undefined);
  }, [isMuted]);

  return (
    <>
      <audio ref={audioRef} src={SILENT_LOOP} loop preload="auto" />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute ambient audio" : "Mute ambient audio"}
        className="fixed right-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-soft backdrop-blur-xl transition hover:scale-105 hover:bg-card"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </>
  );
}
