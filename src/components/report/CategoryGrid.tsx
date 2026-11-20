"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { ALL_LAYERS } from "@/lib/taxonomy";

const QUICK: { id: string; label: string; icon: IconName }[] = [
  { id: "flood", label: "Flood", icon: "flood" },
  { id: "fire", label: "Fire", icon: "fire" },
  { id: "earthquake", label: "Earthquake", icon: "activity" },
  { id: "landslide", label: "Landslide", icon: "mountain" },
  { id: "accident", label: "Accident", icon: "alert" },
];

const ALL = ALL_LAYERS.filter((l) => l.kind === "incident");

/** "What is happening?" 3x2 grid (T047, handoff mobile screen 3); "More" reveals every category. */
export function CategoryGrid({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [more, setMore] = useState(() => !!value && !QUICK.some((q) => q.id === value));
  const items = more ? ALL.map((l) => ({ id: l.id, label: l.label, icon: l.icon })) : QUICK;
  return (
    <div role="radiogroup" aria-label="What is happening?" className="grid grid-cols-3 gap-2.5">
      {items.map((c) => (
        <Tile key={c.id} label={c.label} icon={c.icon} selected={value === c.id} onClick={() => onChange(c.id)} />
      ))}
      {!more && <Tile label="More" icon="plus" selected={false} onClick={() => setMore(true)} />}
    </div>
  );
}

function Tile({ label, icon, selected, onClick }: { label: string; icon: IconName; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex h-[70px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] px-1 text-center text-[13px] font-semibold leading-tight ${
        selected ? "border-green bg-green-tint text-green" : "border-line bg-white text-text-4 hover:bg-hover"
      }`}
    >
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
}
