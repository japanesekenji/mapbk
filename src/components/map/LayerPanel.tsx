"use client";

import { Icon } from "@/components/icons/Icon";
import { LAYER_GROUPS, type LayerId } from "@/lib/taxonomy";

type Props = {
  enabled: Record<LayerId, boolean>;
  counts: Record<LayerId, number>;
  onToggle: (id: LayerId) => void;
  /** Responders and admins only (FR-032). Others see the SOS row locked. */
  canSeeSos: boolean;
};

/** Desktop "Map layers" panel (T034, handoff 1a): four groups, checkbox rows with counts. */
export function LayerPanel({ enabled, counts, onToggle, canSeeSos }: Props) {
  return (
    <aside
      aria-label="Map layers"
      className="flex w-[272px] shrink-0 flex-col overflow-y-auto rounded-[20px] border border-line bg-white p-[18px]"
    >
      <h2 className="font-display text-[18px] font-bold text-ink">Map layers</h2>
      {LAYER_GROUPS.map((g) => (
        <section key={g.title} className="mt-4 border-t border-divider pt-4 first-of-type:mt-3">
          <h3 className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[.07em] text-text-2">
            <Icon name={g.icon} size={17} />
            {g.title}
          </h3>
          <ul>
            {g.layers.map((l) => {
              const restricted = l.kind === "sos" && !canSeeSos;
              const on = !restricted && !!enabled[l.id];
              return (
                <li key={l.id}>
                  <label
                    className={`flex h-[30px] items-center gap-2.5 text-[14px] ${
                      restricted ? "cursor-not-allowed text-muted" : "cursor-pointer text-body"
                    }`}
                    title={restricted ? "Visible to authorized responders only" : undefined}
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={on}
                      disabled={restricted}
                      onChange={() => onToggle(l.id)}
                    />
                    <span
                      aria-hidden
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-green ${
                        on ? "border-green bg-green text-white" : "border-[#b9c4bb] bg-white"
                      }`}
                    >
                      {on && <Icon name="check" size={13} strokeWidth={2.6} />}
                    </span>
                    <span className="flex-1 truncate">{l.label}</span>
                    {l.kind === "sos" ? (
                      <span className="text-muted">
                        <Icon name="lock" size={14} />
                        <span className="sr-only">Restricted</span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted">{counts[l.id] || ""}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
