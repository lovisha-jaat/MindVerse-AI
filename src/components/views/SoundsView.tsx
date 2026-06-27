import { useEffect, useRef, useState } from "react";
import { Pause, Play, ChevronRight, RefreshCw, Volume2 } from "lucide-react";
import { useMindVerse } from "@/context/MindVerseContext";

type Question = {
  id: string;
  text: string;
  options: {
    text: string;
    value: string;
  }[];
};

const QUESTIONS: Question[] = [
  {
    id: "mood",
    text: "How are you feeling right now?",
    options: [
      { text: "Stressed/Anxious", value: "stressed" },
      { text: "Tired/Sleepy", value: "tired" },
      { text: "Unable to Focus", value: "unfocused" },
      { text: "Sad/Low", value: "sad" },
      { text: "Calm/Relaxed", value: "calm" },
    ],
  },
  {
    id: "energy",
    text: "What's your energy level?",
    options: [
      { text: "Very Low", value: "very-low" },
      { text: "Low", value: "low" },
      { text: "Medium", value: "medium" },
      { text: "High", value: "high" },
      { text: "Very High", value: "very-high" },
    ],
  },
  {
    id: "goal",
    text: "What do you want to achieve?",
    options: [
      { text: "Relax & Reduce Stress", value: "relax" },
      { text: "Improve Focus", value: "focus" },
      { text: "Boost Energy", value: "energy" },
      { text: "Sleep Better", value: "sleep" },
      { text: "Elevate Mood", value: "mood" },
    ],
  },
];

type FrequencySound = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  src: string;
};

const FREQUENCY_SOUNDS: FrequencySound[] = [
  {
    id: "delta",
    name: "Delta Waves",
    description: "Deep relaxation and sleep (0.5-4 Hz)",
    emoji: "🌙",
    color: "#8e7cc3",
    src: "/sounds/delta_0.5_4.mp3",
  },
  {
    id: "theta",
    name: "Theta Waves",
    description: "Deep relaxation, meditation, creativity (4-8 Hz)",
    emoji: "🧘",
    color: "#674ea7",
    src: "/sounds/theta_4_8.mp3",
  },
  {
    id: "alpha",
    name: "Alpha Waves",
    description: "Relaxed alertness, calm focus (8-13 Hz)",
    emoji: "🧠",
    color: "#3d85c6",
    src: "/sounds/alpha_8_13.mp3",
  },
  {
    id: "174hz",
    name: "174 Hz",
    description: "Pain relief and relaxation",
    emoji: "💆",
    color: "#9900ff",
    src: "/sounds/174hz.mp3",
  },
  {
    id: "396hz",
    name: "396 Hz",
    description: "Liberation from fear and guilt",
    emoji: "❤️",
    color: "#cc4125",
    src: "/sounds/396hzoverthinking.mp3",
  },
  {
    id: "417hz",
    name: "417 Hz",
    description: "Facilitating change and breaking patterns",
    emoji: "✨",
    color: "#e06666",
    src: "/sounds/417hz.mp3",
  },
  {
    id: "432hz",
    name: "432 Hz",
    description: "Harmonizing, calming tone",
    emoji: "🎵",
    color: "#f1c232",
    src: "/sounds/432hz.mp3",
  },
  {
    id: "528hz",
    name: "528 Hz",
    description: "Love frequency, healing, DNA repair",
    emoji: "💚",
    color: "#6aa84f",
    src: "/sounds/528hz.mp3",
  },
  {
    id: "639hz",
    name: "639 Hz",
    description: "Healing and balancing relationships",
    emoji: "🤍",
    color: "#3d85c6",
    src: "/sounds/639_heal_balance.mp3",
  },
  {
    id: "852hz",
    name: "852 Hz",
    description: "Returning to spiritual order",
    emoji: "🙏",
    color: "#674ea7",
    src: "/sounds/852hz.mp3",
  },
];

type AmbientSound = {
  id: string;
  name: string;
  emoji: string;
  tone: string;
  src: string;
};

const AMBIENT_SOUNDS: AmbientSound[] = [
  { 
    id: "sweet-sound", 
    name: "Sweet Sound", 
    emoji: "✨", 
    tone: "var(--lavender-soft)", 
    src: "/sounds/Sweet_sound.mp3" 
  },
  { 
    id: "bird-river", 
    name: "Birds with River", 
    emoji: "🦜🌊", 
    tone: "var(--sky-soft)", 
    src: "/sounds/bird_chirping_with_river.wav" 
  },
  { 
    id: "birds", 
    name: "Birds Chirping", 
    emoji: "🐦", 
    tone: "var(--sage-soft)", 
    src: "/sounds/birds_chirping_sound.wav" 
  },
  { 
    id: "meditation", 
    name: "Meditation", 
    emoji: "🧘", 
    tone: "var(--peach-soft)", 
    src: "/sounds/meditation_sound.mp3" 
  },
  { 
    id: "river", 
    name: "River", 
    emoji: "🏞️", 
    tone: "var(--sky-soft)", 
    src: "/sounds/river_sound.mp3" 
  },
  { 
    id: "rest", 
    name: "Sound for Rest", 
    emoji: "😌", 
    tone: "var(--butter-soft)", 
    src: "/sounds/sound_for_rest.mp3" 
  },
  { 
    id: "piano", 
    name: "Sweet Piano", 
    emoji: "🎹", 
    tone: "var(--lavender-soft)", 
    src: "/sounds/sweet_piano_sound.mp3" 
  },
  { 
    id: "travelling", 
    name: "Travelling", 
    emoji: "✈️", 
    tone: "var(--sage-soft)", 
    src: "/sounds/travelling_sound.mp3" 
  },
  { 
    id: "woodwind", 
    name: "Woodwind Instrument", 
    emoji: "🎵", 
    tone: "var(--peach-soft)", 
    src: "/sounds/woodwind_instrument.mp3" 
  },
];

function AmbientSoundGrid({ moodColor }: { moodColor: string }) {
  const { isMuted, playSound: globalPlaySound, currentlyPlayingSoundId } = useMindVerse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {AMBIENT_SOUNDS.map((sound) => {
          const active = currentlyPlayingSoundId === sound.id && !isMuted;
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => globalPlaySound(sound.src, sound.id)}
              className="group relative overflow-hidden rounded-2xl p-4 text-left shadow-soft transition-all duration-300 ease-out hover:-translate-y-0.5"
              style={{
                background: sound.tone,
                boxShadow: active ? `0 0 0 2px ${moodColor}, 0 12px 30px -10px ${moodColor}aa` : undefined,
                transform: active ? "scale(1.02)" : undefined,
              }}
            >
              {active && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      animation: "soundRipple 2.4s ease-out infinite",
                      border: `2px solid ${moodColor}`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      animation: "soundRipple 2.4s ease-out 1.2s infinite",
                      border: `2px solid ${moodColor}`,
                    }}
                  />
                </>
              )}
              <div className="text-3xl" aria-hidden>{sound.emoji}</div>
              <p className="mt-6 text-sm font-bold text-foreground">{sound.name}</p>
              <p className="text-xs text-muted-foreground">
                {active ? "Playing…" : "Tap to play"}
              </p>
              <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-foreground shadow-soft">
                {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabFrame({ kicker, title, blurb, children }: {
  kicker: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">{kicker}</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </header>
      {children}
    </div>
  );
}

function Questionnaire({ onComplete }: { onComplete: (sound: FrequencySound) => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [QUESTIONS[currentQuestion].id]: value };
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      let suggestedSound = FREQUENCY_SOUNDS.find(p => p.id === "alpha")!;

      const mood = newAnswers.mood;
      const goal = newAnswers.goal;
      const energy = newAnswers.energy;

      if (goal === "sleep" || mood === "tired") {
        suggestedSound = FREQUENCY_SOUNDS.find(p => p.id === "delta")!;
      } else if (goal === "relax" || mood === "stressed") {
        suggestedSound = FREQUENCY_SOUNDS.find(p => p.id === "theta")!;
      } else if (goal === "focus" || mood === "unfocused") {
        suggestedSound = FREQUENCY_SOUNDS.find(p => p.id === "alpha")!;
      } else if (goal === "energy" || energy === "low" || energy === "very-low") {
        suggestedSound = FREQUENCY_SOUNDS.find(p => p.id === "417hz")!;
      } else if (goal === "mood" || mood === "sad") {
        suggestedSound = FREQUENCY_SOUNDS.find(p => p.id === "528hz")!;
      }

      onComplete(suggestedSound);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex gap-2">
          {QUESTIONS.map((_, idx) => {
            let barClass = "h-2 flex-1 rounded-full transition-all bg-gray-200";
            if (idx <= currentQuestion) {
              barClass = "h-2 flex-1 rounded-full transition-all bg-sage";
            }
            return <div key={idx} className={barClass} />;
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Question {currentQuestion + 1} of {QUESTIONS.length}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          {QUESTIONS[currentQuestion].text}
        </h2>

        <div className="space-y-3">
          {QUESTIONS[currentQuestion].options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-sage hover:shadow-soft transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.text}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-sage transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {currentQuestion > 0 && (
        <button
          onClick={() => setCurrentQuestion(currentQuestion - 1)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

function FrequencyPlayer({ initialSound, onReset }: {
  initialSound: FrequencySound;
  onReset: () => void;
}) {
  const { isMuted, playSound: globalPlaySound, currentlyPlayingSoundId, currentMood } = useMindVerse();
  const [currentSound, setCurrentSound] = useState(initialSound);

  const active = currentlyPlayingSoundId === currentSound.id && !isMuted;

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          backgroundColor: currentSound.color + "20",
          borderLeft: `4px solid ${currentSound.color}`,
        }}
      >
        <div className="text-5xl mb-4">{currentSound.emoji}</div>
        <h2
          className="font-display text-2xl font-bold text-foreground"
          style={{ color: currentSound.color }}
        >
          {currentSound.name}
        </h2>
        <p className="text-muted-foreground mt-2">{currentSound.description}</p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => globalPlaySound(currentSound.src, currentSound.id)}
          className="w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: currentSound.color }}
        >
          {active ? (
            <Pause className="w-10 h-10 text-white" />
          ) : (
            <Play className="w-10 h-10 text-white ml-1" />
          )}
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-foreground">
          All Frequencies
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {FREQUENCY_SOUNDS.map((sound) => {
            const isActive = currentlyPlayingSoundId === sound.id && !isMuted;
            return (
              <button
                key={sound.id}
                onClick={() => {
                  setCurrentSound(sound);
                  globalPlaySound(sound.src, sound.id);
                }}
                className="group relative overflow-hidden rounded-2xl p-4 text-left shadow-soft transition-all duration-300 ease-out hover:-translate-y-0.5"
                style={{
                  background: sound.color + "15",
                  boxShadow: isActive ? `0 0 0 2px ${currentMood.color}, 0 12px 30px -10px ${currentMood.color}aa` : undefined,
                  transform: isActive ? "scale(1.02)" : undefined,
                }}
              >
                {isActive && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        animation: "soundRipple 2.4s ease-out infinite",
                        border: `2px solid ${currentMood.color}`,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        animation: "soundRipple 2.4s ease-out 1.2s infinite",
                        border: `2px solid ${currentMood.color}`,
                      }}
                    />
                  </>
                )}
                <div className="text-2xl" aria-hidden>{sound.emoji}</div>
                <p className="mt-4 text-sm font-bold text-foreground">{sound.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Playing…" : "Tap to play"}
                </p>
                <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-foreground shadow-soft">
                  {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onReset}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="w-4 h-4" />
        Take Questionnaire
      </button>
    </div>
  );
}

type Phase = "inhale" | "hold" | "exhale";
const PHASES: Record<Phase, { ms: number; next: Phase; label: string; scale: number }> = {
  inhale: { ms: 4000, next: "hold", label: "Inhale", scale: 1.0 },
  hold: { ms: 4000, next: "exhale", label: "Hold", scale: 1.0 },
  exhale: { ms: 6000, next: "inhale", label: "Exhale", scale: 0.55 },
};

function BreathingCircle({ moodColor }: { moodColor: string }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");

  useEffect(() => {
    if (!running) return;
    const conf = PHASES[phase];
    const id = window.setTimeout(() => setPhase(conf.next), conf.ms);
    return () => window.clearTimeout(id);
  }, [phase, running]);

  const conf = PHASES[phase];
  const scale = running ? conf.scale : 0.7;

  return (
    <section className="rounded-2xl bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Breathing Circle</h3>
          <p className="text-xs text-muted-foreground">4-4-6 box-style pacer</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRunning((r) => !r);
            setPhase("inhale");
          }}
          className="rounded-full bg-sage px-4 py-1.5 text-xs font-bold text-white shadow-soft transition hover:opacity-90"
        >
          {running ? "Stop" : "Start"}
        </button>
      </div>
      <div className="relative mx-auto mt-6 grid h-[260px] w-[260px] place-items-center">
        <span
          className="absolute h-full w-full rounded-full opacity-50 blur-2xl"
          style={{
            background: moodColor,
            animation: running && phase === "hold" ? "breathHoldPulse 2s ease-in-out infinite" : undefined,
          }}
        />
        <span
          className="relative grid h-full w-full place-items-center rounded-full text-foreground"
          style={{
            background: `radial-gradient(circle at 30% 30%, white, ${moodColor})`,
            transform: `scale(${scale})`,
            transition: `transform ${conf.ms}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            boxShadow: `0 20px 60px -10px ${moodColor}aa`,
          }}
        >
          <div className="text-center">
            <p className="font-display text-2xl font-extrabold">{running ? conf.label : "Ready"}</p>
            <p className="text-xs text-muted-foreground">
              {running ? `${conf.ms / 1000}s` : "Tap start"}
            </p>
          </div>
        </span>
      </div>
    </section>
  );
}

interface Segment {
  x1: number; y1: number; x2: number; y2: number; bornAt: number;
}
const STROKE_LIFETIME_MS = 4500;

function ZenGarden({ moodColor }: { moodColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Segment[]>([]);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const loop = () => {
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      strokesRef.current = strokesRef.current.filter((s) => now - s.bornAt < STROKE_LIFETIME_MS);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const seg of strokesRef.current) {
        const age = now - seg.bornAt;
        const alpha = Math.max(0, 1 - age / STROKE_LIFETIME_MS);
        ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.2})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [moodColor]);

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPtRef.current = toLocal(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!lastPtRef.current) return;
    const next = toLocal(e);
    strokesRef.current.push({
      x1: lastPtRef.current.x, y1: lastPtRef.current.y,
      x2: next.x, y2: next.y,
      bornAt: performance.now(),
    });
    lastPtRef.current = next;
  };
  const onUp = () => { lastPtRef.current = null; };

  return (
    <section className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Zen Garden</h3>
          <p className="text-xs text-muted-foreground">Drag your finger to rake the sand.</p>
        </div>
        <button
          type="button"
          onClick={() => { strokesRef.current = []; }}
          className="rounded-full bg-sage-soft px-3 py-1 text-xs font-bold text-foreground shadow-soft"
        >
          Smooth sand
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="mt-4 block h-[220px] w-full touch-none rounded-xl"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, #fdf5e6 0%, #f1e3c8 70%, #e6d3b0 100%)",
          cursor: "crosshair",
        }}
      />
    </section>
  );
}

export function SoundsView() {
  const { currentMood } = useMindVerse();
  const [activeTab, setActiveTab] = useState<"ambient" | "frequencies">("ambient");
  const [frequencyScreen, setFrequencyScreen] = useState<"questionnaire" | "direct">("direct");
  const [suggestedSound, setSuggestedSound] = useState<FrequencySound>(FREQUENCY_SOUNDS[0]);

  const handleQuestionnaireComplete = (sound: FrequencySound) => {
    setSuggestedSound(sound);
    setFrequencyScreen("direct");
  };

  return (
    <>
      <style>{`
        @keyframes soundRipple {
          0%   { transform: scale(1);    opacity: 0.55; }
          100% { transform: scale(1.18); opacity: 0;    }
        }
        @keyframes breathHoldPulse {
          0%, 100% { transform: scale(1);    opacity: 0.45; }
          50%      { transform: scale(1.05); opacity: 0.65; }
        }
      `}</style>
      <TabFrame
        kicker="Sound Therapy"
        title="Sounds & Wellness"
        blurb="Ambient mixes, binaural beats, and wellness tools."
      >
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("ambient")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
              activeTab === "ambient" ? "bg-sage text-white" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4" />
              Ambient
            </div>
          </button>
          <button
            onClick={() => setActiveTab("frequencies")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
              activeTab === "frequencies" ? "bg-sage text-white" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Frequencies
            </div>
          </button>
        </div>

        {activeTab === "ambient" ? (
          <div className="space-y-6">
            <AmbientSoundGrid moodColor={currentMood.color} />
            <BreathingCircle moodColor={currentMood.color} />
            <ZenGarden moodColor={currentMood.color} />
          </div>
        ) : (
          <div className="space-y-6">
            {frequencyScreen === "questionnaire" && (
              <Questionnaire onComplete={handleQuestionnaireComplete} />
            )}
            <div className="space-y-4">
              {frequencyScreen === "questionnaire" && (
                <button
                  onClick={() => setFrequencyScreen("direct")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
                >
                  Or skip the questionnaire and browse all frequencies directly
                </button>
              )}
              {frequencyScreen === "direct" && (
                <>
                  <FrequencyPlayer
                    initialSound={suggestedSound}
                    onReset={() => setFrequencyScreen("questionnaire")}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </TabFrame>
    </>
  );
}
