import { verificationSteps, type IncidentStatus } from "@/lib/taxonomy";

const STEPS = ["Reported", "Corroborated", "Verified", "Resolved"];

/** 4-step verification progress (data-model.md "Verification progress bar"). */
export function VerificationBar({ status, corroborations }: { status: IncidentStatus; corroborations: number }) {
  const filled = verificationSteps(status, corroborations);
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label={`Verification progress: ${STEPS[filled - 1]}`}>
      {STEPS.map((s, i) => {
        const done = i < filled;
        return (
          <li key={s} className="flex flex-col gap-1.5">
            <span className={`h-[5px] rounded-full ${done ? "bg-green" : "bg-[#dfe6dd]"}`} aria-hidden />
            <span className={`text-[11px] font-semibold ${done ? "text-ink" : "text-muted"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
