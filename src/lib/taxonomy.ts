import type { IconName } from "@/components/icons/Icon";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Severity = Enums["severity"];
export type IncidentStatus = Enums["incident_status"];
export type FacilityType = Enums["facility_type"];
export type FacilityStatus = Enums["facility_status"];
export type SosType = Enums["sos_type"];
export type SosState = Enums["sos_state"];
export type AppRole = Enums["app_role"];

/** Layer panel groups (FR-007). Category ids match seed.sql; facility and SOS layers are separate tables. */
export type LayerId = string;
export type LayerDef = { id: LayerId; label: string; icon: IconName; kind: "incident" | "facility" | "sos" };

export const LAYER_GROUPS: { title: string; icon: IconName; layers: LayerDef[] }[] = [
  {
    title: "Natural hazards",
    icon: "mountain",
    layers: [
      { id: "flood", label: "Flood", icon: "flood", kind: "incident" },
      { id: "earthquake", label: "Earthquake", icon: "activity", kind: "incident" },
      { id: "typhoon", label: "Typhoon / Storm", icon: "wind", kind: "incident" },
      { id: "landslide", label: "Landslide", icon: "mountain", kind: "incident" },
      { id: "volcano", label: "Volcano", icon: "mountain", kind: "incident" },
      { id: "tsunami", label: "Tsunami", icon: "flood", kind: "incident" },
    ],
  },
  {
    title: "Human-induced hazards",
    icon: "flask",
    layers: [
      { id: "fire", label: "Fire", icon: "fire", kind: "incident" },
      { id: "chemical", label: "Chemical leak", icon: "flask", kind: "incident" },
      { id: "structural", label: "Structural damage", icon: "alert", kind: "incident" },
      { id: "accident", label: "Road accident", icon: "alert", kind: "incident" },
      { id: "security", label: "Security / Crime", icon: "shield", kind: "incident" },
    ],
  },
  {
    title: "Emergency facilities",
    icon: "cross",
    layers: [
      { id: "evacuation_center", label: "Evacuation centers", icon: "home", kind: "facility" },
      { id: "hospital", label: "Hospitals", icon: "cross", kind: "facility" },
      { id: "police_fire", label: "Police & fire stations", icon: "shield", kind: "facility" },
      { id: "rescue_station", label: "Rescue stations", icon: "people", kind: "facility" },
      { id: "relief_center", label: "Relief centers", icon: "package", kind: "facility" },
    ],
  },
  {
    title: "Community & response",
    icon: "people",
    layers: [
      { id: "sos", label: "SOS requests", icon: "alert", kind: "sos" },
      { id: "closure", label: "Road closures", icon: "barrier", kind: "incident" },
      { id: "damaged", label: "Damaged infrastructure", icon: "alert", kind: "incident" },
      { id: "affected_area", label: "Affected areas", icon: "layers", kind: "incident" },
    ],
  },
];

export const ALL_LAYERS = LAYER_GROUPS.flatMap((g) => g.layers);

/** Facility types grouped under one layer row each. */
export const FACILITY_LAYER: Record<FacilityType, LayerId> = {
  evacuation_center: "evacuation_center",
  hospital: "hospital",
  police_station: "police_fire",
  fire_station: "police_fire",
  rescue_station: "rescue_station",
  relief_center: "relief_center",
};

export const CATEGORY_ICON: Record<string, IconName> = Object.fromEntries(
  ALL_LAYERS.filter((l) => l.kind === "incident").map((l) => [l.id, l.icon]),
);

export const FACILITY_META: Record<FacilityType, { label: string; plural: string; icon: IconName }> = {
  evacuation_center: { label: "Evacuation center", plural: "Evacuation centers", icon: "home" },
  hospital: { label: "Hospital", plural: "Hospitals", icon: "cross" },
  police_station: { label: "Police station", plural: "Police stations", icon: "shield" },
  fire_station: { label: "Fire station", plural: "Fire stations", icon: "fire" },
  rescue_station: { label: "Rescue station", plural: "Rescue stations", icon: "people" },
  relief_center: { label: "Relief center", plural: "Relief centers", icon: "package" },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#c8362b" },
  high: { label: "High", color: "#e0662a" },
  moderate: { label: "Moderate", color: "#cf9a14" },
  low: { label: "Low", color: "#5d8a66" },
};

export const FACILITY_COLOR = "#1b5e32";
export const SOS_COLOR = "#c8362b";

export const STATUS_META: Record<IncidentStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "#fbefc9", fg: "#7a5600" },
  verified: { label: "Verified", bg: "#dff0e1", fg: "#1b5e32" },
  resolved: { label: "Resolved", bg: "#e3ebf2", fg: "#34546e" },
  rejected: { label: "Rejected", bg: "#f3e1df", fg: "#8a2a22" },
};

export const FACILITY_STATUS_META: Record<FacilityStatus, { label: string; bg: string; fg: string }> = {
  open: { label: "Open", bg: "#dff0e1", fg: "#1b5e32" },
  full: { label: "Full", bg: "#fbefc9", fg: "#7a5600" },
  closed: { label: "Closed", bg: "#f3e1df", fg: "#8a2a22" },
  unknown: { label: "Unknown", bg: "#edf1ea", fg: "#44574a" },
};

export const SOS_TYPE_META: Record<SosType, { label: string; icon: IconName }> = {
  medical: { label: "Medical", icon: "cross" },
  trapped_flood: { label: "Trapped by flood", icon: "flood" },
  fire: { label: "Fire", icon: "fire" },
  other: { label: "Other", icon: "alert" },
};

export const SOS_STATE_META: Record<SosState, { label: string; bg: string; fg: string }> = {
  new: { label: "New", bg: "#fbe3e0", fg: "#a32a20" },
  acknowledged: { label: "Acknowledged", bg: "#fbefc9", fg: "#7a5600" },
  responding: { label: "Responding", bg: "#e3ebf2", fg: "#34546e" },
  closed: { label: "Closed", bg: "#dff0e1", fg: "#1b5e32" },
};

/** Corroborations needed before the progress bar shows "Corroborated" (data-model.md). */
export const CORROBORATED_AT = 3;

/** Steps filled on the 4-step verification bar: Reported, Corroborated, Verified, Resolved. */
export function verificationSteps(status: IncidentStatus, corroborations: number): number {
  if (status === "resolved") return 4;
  if (status === "verified") return 3;
  return corroborations >= CORROBORATED_AT ? 2 : 1;
}
