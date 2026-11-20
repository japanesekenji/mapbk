import { Icon } from "@/components/icons/Icon";

/** Shared loading, empty and error states for every data view (FR-046). */

export function LoadingRows({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-divider" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-divider" />
            <div className="h-3 w-1/3 rounded bg-divider" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-tint text-green">
        <Icon name="search" size={22} />
      </span>
      <p className="font-display text-[17px] font-bold text-ink">{title}</p>
      {body && <p className="max-w-sm text-[14px] text-text-2">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sos-bg text-sos">
        <Icon name="alert" size={22} />
      </span>
      <p className="text-[14px] text-text-3">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-10 rounded-xl border-[1.5px] border-green px-4 text-[14px] font-semibold text-green hover:bg-green-tint"
        >
          Try again
        </button>
      )}
    </div>
  );
}
