import { NextResponse, type NextRequest } from "next/server";
import { apiError, rateLimited, readJson } from "@/lib/api";
import { getRequestCaller } from "@/lib/auth/caller";
import { checkAndRecord } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";
import { zodToApiError } from "@/lib/validation/common";
import { PHOTO_MAX_BYTES, PHOTO_TYPES, uploadSchema } from "@/lib/validation/report";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/** POST /api/uploads (contracts/http-api.md): signed upload URL for one photo. */
export async function POST(req: NextRequest) {
  const caller = await getRequestCaller(req);
  if (!caller) return apiError("auth_required", "Sign in to add photos.");

  const parsed = uploadSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json(zodToApiError(parsed.error), { status: 400 });
  const { content_type, size_bytes } = parsed.data;

  if (!(PHOTO_TYPES as readonly string[]).includes(content_type)) {
    return apiError("unsupported_type", "Photos must be JPEG, PNG, WebP or HEIC.", { field: "content_type" });
  }
  if (size_bytes > PHOTO_MAX_BYTES) {
    return apiError("file_too_large", "Each photo must be 10 MB or smaller.", { field: "size_bytes" });
  }

  const wait = await checkAndRecord(caller.id, "upload");
  if (wait) return rateLimited(wait);

  const path = `pending/${caller.id}/${crypto.randomUUID()}.${EXT[content_type]}`;
  const { data, error } = await getServiceClient().storage.from("incident-photos").createSignedUploadUrl(path);
  if (error || !data) return apiError("server_error", "Could not prepare the upload. Try again.");

  return NextResponse.json({ path, token: data.token, signed_url: data.signedUrl, expires_in_s: 7200 });
}
