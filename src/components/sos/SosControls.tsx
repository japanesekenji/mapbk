"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { SOS_TYPE_META, type SosType } from "@/lib/taxonomy";

const TYPES = Object.keys(SOS_TYPE_META) as SosType[];

/** T061: SOS type chips, 2x2 (handoff mobile screen 4). */
export function TypeChips({ value, onChange }: { value: SosType | null; onChange: (t: SosType) => void }) {
  return (
    <div role="radiogroup" aria-label="Type of emergency" className="grid grid-cols-2 gap-2.5">
      {TYPES.map((t) => {
        const selected = value === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t)}
            className={`flex h-14 items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 text-left text-[14.5px] font-semibold ${
              selected ? "border-sos bg-sos text-white" : "border-sos-border bg-white text-text-4"
            }`}
          >
            <Icon name={SOS_TYPE_META[t].icon} size={22} />
            {SOS_TYPE_META[t].label}
          </button>
        );
      })}
    </div>
  );
}

/** People stepper (handoff: "- 3 +"). */
export function PeopleStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-sos-border bg-white p-3">
      <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
        <Icon name="people" size={20} /> People needing help
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Fewer people"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-text-3"
        >
          <Icon name="minus" size={18} />
        </button>
        <output aria-live="polite" className="w-6 text-center text-[18px] font-bold text-ink">
          {value}
        </output>
        <button
          type="button"
          aria-label="More people"
          onClick={() => onChange(Math.min(50, value + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-text-3"
        >
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

/** Explicit confirmation before sending (FR-031). */
export function ConfirmSend({
  open,
  summary,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  summary: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="sos-confirm-title"
      className="m-auto w-[min(92vw,400px)] rounded-[24px] p-0 backdrop:bg-ink/50"
    >
      <div className="flex flex-col gap-4 p-6">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sos text-white ring-8 ring-[#f8d9d5]">
          <Icon name="alert" size={26} />
        </span>
        <h2 id="sos-confirm-title" className="font-display text-center text-[22px] font-extrabold text-ink">
          Send SOS to responders?
        </h2>
        <p className="text-center text-[14px] text-text-3">{summary}</p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="h-14 rounded-[18px] bg-sos text-[17px] font-bold text-white disabled:opacity-70"
        >
          {busy ? "Sending…" : "Yes, send SOS"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="h-11 text-[15px] font-semibold text-text-3">
          Cancel
        </button>
      </div>
    </dialog>
  );
}
