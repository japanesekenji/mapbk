import type { Database } from "@/lib/supabase/database.types";

type Fns = Database["public"]["Functions"];

/** A row of the incidents_public view (contracts/database.md). */
export type IncidentPublic = Database["public"]["Views"]["incidents_public"]["Row"];

/** A row returned by facilities_in_bbox. */
export type FacilityRow = Fns["facilities_in_bbox"]["Returns"][number];

export type IncidentSummary = { total: number; critical: number; high: number; moderate: number; low: number };

/** What the map detail card shows. */
export type Selection =
  | { kind: "incident"; item: IncidentPublic }
  | { kind: "facility"; item: FacilityRow };

/** SOS row shown to responders (sos_responder_view). */
export type SosPin = Database["public"]["Views"]["sos_responder_view"]["Row"];
