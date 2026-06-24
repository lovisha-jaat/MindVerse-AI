/**
 * MuteToggle.tsx
 * Floating glassmorphic button anchored top-right. The actual <audio> tag
 * lives here too — we keep a single global instance so the ambient melody
 * doesn't restart when the user switches tabs. The track is generated on
 * the fly using a tiny silent data-URI fallback (no asset shipping required).
 */
import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";

// 1-second silent WAV. Acts as a placeholder track so audio APIs work
// even without a hosted MP3. Swap with a real ambient loop in production.
const SILENT_LOOP =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export function MuteToggle() {
  const { isMuted, toggleMute } = useMindVerse();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reflect the muted state on the underlying <audio> element whenever it
  // toggles. We also attempt playback when unmuting — browsers throw on
  // autoplay so we swallow the rejection silently.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = isMuted;
    if (!isMuted) {
      el.play().catch(() => undefined);
    }
  }, [isMuted]);

  return (
    <>
      <audio ref={audioRef} src={SILENT_LOOP} loop preload="auto" />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute ambient audio" : "Mute ambient audio"}
        className="fixed right-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-xl transition hover:scale-105 hover:bg-white/20"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </>
  );
}
