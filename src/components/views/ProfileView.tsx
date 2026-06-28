/**
 * ProfileView.tsx
 * -----------------------------------------------------------------------------
 * Clean user dashboard frame summarizing account details and interactive application settings toggles.
 */
import { useState } from "react";
import { Award, Bell, Moon, User, Edit, Check, Heart } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMindVerse } from "@/context/MindVerseContext";
import { missionCompletionPercent } from "@/lib/recoveryMissions";

export function ProfileView() {
  const {
    userName,
    setUserName,
    companionName,
    setCompanionName,
    completedMissions,
    effectiveMood,
    pushReminders,
    togglePushReminders,
    darkMode,
    toggleDarkMode,
    logout,
  } = useMindVerse();

  const [editingUser, setEditingUser] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState(false);
  const [userNameInput, setUserNameInput] = useState(userName ?? "");
  const [companionNameInput, setCompanionNameInput] = useState(companionName);

  const missionsPct = missionCompletionPercent(completedMissions);
  const displayName = userName ?? "MindVerse Traveller";
  const initials = userName?.slice(0, 2).toUpperCase() ?? "MV";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Page header ──────────────────────────────────────────────── */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Profile</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Your Dashboard</h1>
        <p className="text-sm text-muted-foreground">Account summary &amp; app preferences</p>
      </header>

      {/* ─── Identity card with avatar badge ─────────── */}
      <section className="overflow-hidden rounded-[28px] bg-card shadow-soft">
        <div className="bg-gradient-to-br from-sage-soft via-card to-lavender-soft px-6 pb-6 pt-8">
          <div className="flex flex-col items-center text-center">
            {/* Elegant placeholder profile picture badge */}
            <div className="relative">
              <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-sage to-sky text-2xl font-extrabold text-white shadow-soft-lg">
                {initials}
              </div>
              <span
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white text-xs shadow-soft"
                style={{ backgroundColor: effectiveMood.color }}
                aria-hidden
              >
                {effectiveMood.emoji}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-foreground">{displayName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">MindVerse AI Member</p>
          </div>
        </div>

        {/* Account credentials summary */}
        <div className="space-y-0 divide-y divide-border/60 px-5">
          <EditableCredentialRow 
            icon={User} 
            label="Display Name" 
            value={displayName}
            editing={editingUser}
            setEditing={setEditingUser}
            inputValue={userNameInput}
            setInputValue={setUserNameInput}
            onSave={() => {
              setUserName(userNameInput);
              setEditingUser(false);
            }}
          />
          <EditableCredentialRow 
            icon={Heart} 
            label="Companion Name" 
            value={companionName}
            editing={editingCompanion}
            setEditing={setEditingCompanion}
            inputValue={companionNameInput}
            setInputValue={setCompanionNameInput}
            onSave={() => {
              setCompanionName(companionNameInput);
              setEditingCompanion(false);
            }}
          />
        </div>
      </section>

      {/* ─── Quick stats ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3">
        <div className="rounded-[24px] bg-butter-soft p-4 shadow-soft">
          <div className="flex items-center gap-2 text-foreground/70">
            <Award className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Missions</p>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {missionsPct}
            <span className="text-base text-muted-foreground">%</span>
          </p>
        </div>
      </section>

      {/* ─── Application settings toggles ─────────────────────────────── */}
      <section className="rounded-[28px] bg-card p-5 shadow-soft">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Application Settings
        </h3>
        <ul className="mt-4 space-y-1">
          <SettingsToggleRow
            icon={Bell}
            label="Push Reminders"
            description="Daily nudges for recovery missions & mood check-ins"
            checked={pushReminders}
            onCheckedChange={togglePushReminders}
          />
          <SettingsToggleRow
            icon={Moon}
            label="Dark Mode"
            description="Switch to a softer evening palette"
            checked={darkMode}
            onCheckedChange={toggleDarkMode}
          />
        </ul>
      </section>

      {/* ─── Logout button ─────────────────────────────────────────────── */}
      <section>
        <Button
          variant="destructive"
          className="w-full justify-center bg-peach hover:bg-peach/90"
          onClick={() => {
            console.log("BUTTON CLICKED!");
            logout();
          }}
          type="button"
        >
          Log Out
        </Button>
      </section>
    </div>
  );
}

/* ─────────────── sub-components ───────────────────────────────────────── */

function EditableCredentialRow({
  icon: Icon,
  label,
  value,
  editing,
  setEditing,
  inputValue,
  setInputValue,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  editing: boolean;
  setEditing: (v: boolean) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/70 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" variant="default" onClick={onSave} className="h-8 bg-sage">
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-foreground">{value}</p>
            <button
              type="button"
              onClick={() => {
                setInputValue(value);
                setEditing(true);
              }}
              className="rounded-full p-1.5 hover:bg-muted"
            >
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <li className="flex items-center gap-4 rounded-2xl px-2 py-3.5 transition hover:bg-muted/50">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className="data-[state=checked]:bg-sage"
      />
    </li>
  );
}
