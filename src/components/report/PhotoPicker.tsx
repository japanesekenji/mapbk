"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MAX_PHOTOS, PHOTO_MAX_BYTES } from "@/lib/validation/report";

export type PickedPhoto = { id: string; file: File };

/**
 * T049: up to 4 photos, compressed in the browser to about 1600 px and under ~600 KB before
 * upload (research R8, FR-017). Uploading happens on submit via uploadPhotos().
 */
export function PhotoPicker({ photos, onChange }: { photos: PickedPhoto[]; onChange: (p: PickedPhoto[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previews = useMemo(() => photos.map((p) => ({ id: p.id, url: URL.createObjectURL(p.file) })), [photos]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files);
    if (list.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    setBusy(true);
    const next: PickedPhoto[] = [];
    for (const f of list.slice(0, Math.max(0, room))) {
      if (!f.type.startsWith("image/")) {
        setError(`${f.name} is not an image.`);
        continue;
      }
      if (f.size > PHOTO_MAX_BYTES * 3) {
        setError(`${f.name} is too large.`);
        continue;
      }
      try {
        const small = await imageCompression(f, {
          maxWidthOrHeight: 1600,
          maxSizeMB: 0.6,
          // The library's worker mode loads code from a CDN; keep compression on this page.
          useWebWorker: false,
          fileType: "image/webp",
          initialQuality: 0.8,
        });
        next.push({ id: crypto.randomUUID(), file: new File([small], `${f.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }) });
      } catch {
        setError(`Could not read ${f.name}.`);
      }
    }
    setBusy(false);
    onChange([...photos, ...next]);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {previews.map((p) => (
          <div key={p.id} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="Selected photo" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/80 text-white"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            aria-label="Add photo"
            className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#b9c4bb] text-text-2 hover:bg-hover"
          >
            <Icon name={busy ? "clock" : "camera"} size={22} />
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void add(e.target.files)}
        data-testid="photo-input"
      />
      <p className="mt-2 text-[12.5px] text-text-2">
        Add up to {MAX_PHOTOS} photos. Photos help moderators verify faster.
      </p>
      {error && (
        <p role="alert" className="mt-1 text-[12.5px] text-sos">
          {error}
        </p>
      )}
    </div>
  );
}
