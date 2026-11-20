"use client";

import { Icon } from "@/components/icons/Icon";

/**
 * "Corroborate · N" (handoff 1a). Filled green with "Corroborated" once the user has
 * corroborated. Without onToggle it renders as a read-only count.
 */
export function CorroborateButton({
  count,
  active,
  onToggle,
  busy,
  hint,
  className = "",
}: {
  count: number;
  active: boolean;
  onToggle?: () => void;
  busy?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle || busy}
      aria-pressed={active}
      title={hint}
      className={`flex h-[42px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-green px-4 text-[14px] font-semibold transition-colors disabled:cursor-default ${
        active ? "bg-green text-white" : "bg-white text-green enabled:hover:bg-green-tint"
      } ${className}`}
    >
      <Icon name={active ? "check" : "people"} size={18} />
      {active ? "Corroborated" : "Corroborate"} · {count}
    </button>
  );
}
