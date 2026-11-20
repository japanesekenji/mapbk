import { Suspense } from "react";
import { IncidentList } from "@/components/incidents/IncidentList";

export default function IncidentsPage() {
  return (
    <Suspense>
      <IncidentList />
    </Suspense>
  );
}
