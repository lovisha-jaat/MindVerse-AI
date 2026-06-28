import { useState, type FormEvent } from "react";
import {
  Moon,
  Brain,
  MonitorSmartphone,
  Coffee,
  Sparkles,
  Smile,
  HeartPulse,
  Utensils,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMindVerse, type MlInputs, type FeelingLevel } from "@/context/MindVerseContext";
import { predictStress } from "@/lib/stressModel";

interface BiometricSurveyModalProps {
  open: boolean;
}

export function BiometricSurveyModal({ open }: BiometricSurveyModalProps) {
  const { setMlInputs, setCurrentMood, logMoodToJournal, setSurveyCompleted } = useMindVerse();
  const [sleepHours, setSleepHours] = useState("7");
  const [studyHours, setStudyHours] = useState("4");
  const [screenTime, setScreenTime] = useState("5");
  const [caffeine, setCaffeine] = useState<MlInputs["caffeine"]>("Medium");
  const [currentFeeling, setCurrentFeeling] = useState<FeelingLevel>("Okay");
  const [exerciseToday, setExerciseToday] = useState(false);
  const [ateWell, setAteWell] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newMlInputs: MlInputs = {
      sleepHours: Number(sleepHours),
      studyHours: Number(studyHours),
      screenTime: Number(screenTime),
      caffeine,
      heartRate: 72,
      hrvLinked: false,
      currentFeeling,
      exerciseToday,
      ateWell,
    };
    const moodResult = predictStress(newMlInputs);
    setMlInputs(newMlInputs);
    setCurrentMood(moodResult);
    logMoodToJournal(moodResult);
    setSurveyCompleted(true);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="overflow-hidden rounded-[28px] border-none bg-card p-0 shadow-soft-lg sm:max-w-md">
        <div className="relative flex justify-center bg-gradient-to-br from-sage-soft via-butter-soft to-peach-soft px-6 pb-2 pt-8">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white/60">
            <Sparkles className="h-10 w-10 text-sage" />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-7 pt-4">
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Let's Check Your Mood
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Answer a few quick questions to get started!
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Smile className="h-4 w-4 text-sage" />
                How are you feeling today?
              </label>
              <Select
                value={currentFeeling}
                onValueChange={(v) => setCurrentFeeling(v as FeelingLevel)}
              >
                <SelectTrigger className="h-12 rounded-xl border-border bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Great">Great! 😄</SelectItem>
                  <SelectItem value="Good">Good 😊</SelectItem>
                  <SelectItem value="Okay">Okay 😐</SelectItem>
                  <SelectItem value="Low">A bit low 😔</SelectItem>
                  <SelectItem value="Bad">Bad 😫</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Moon className="h-4 w-4 text-sage" />
                How many hours did you sleep last night?
              </label>
              <Input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="h-12 rounded-xl border-border bg-muted text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-sage" />
                How many hours of study/work today?
              </label>
              <Input
                type="number"
                min="0"
                max="16"
                step="0.5"
                value={studyHours}
                onChange={(e) => setStudyHours(e.target.value)}
                className="h-12 rounded-xl border-border bg-muted text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-sage" />
                How many hours of screen time today?
              </label>
              <Input
                type="number"
                min="0"
                max="16"
                step="0.5"
                value={screenTime}
                onChange={(e) => setScreenTime(e.target.value)}
                className="h-12 rounded-xl border-border bg-muted text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Coffee className="h-4 w-4 text-sage" />
                Caffeine intake today
              </label>
              <Select
                value={caffeine}
                onValueChange={(v) => setCaffeine(v as MlInputs["caffeine"])}
              >
                <SelectTrigger className="h-12 rounded-xl border-border bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-4">
              <div className="flex items-center gap-3">
                <HeartPulse className="h-4 w-4 text-sage" />
                <label className="text-sm font-semibold text-foreground">
                  Did you exercise today?
                </label>
              </div>
              <Switch
                checked={exerciseToday}
                onCheckedChange={setExerciseToday}
                className="data-[state=checked]:bg-sage"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-4">
              <div className="flex items-center gap-3">
                <Utensils className="h-4 w-4 text-sage" />
                <label className="text-sm font-semibold text-foreground">
                  Did you eat well today?
                </label>
              </div>
              <Switch
                checked={ateWell}
                onCheckedChange={setAteWell}
                className="data-[state=checked]:bg-sage"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-sage text-base font-semibold text-white shadow-soft hover:bg-sage/90"
            >
              See My Mood! ✨
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
