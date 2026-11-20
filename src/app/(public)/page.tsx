import { Suspense } from "react";
import { MapScreen } from "@/components/map/MapScreen";

export default function MapPage() {
  return (
    <Suspense>
      <MapScreen />
    </Suspense>
  );
}
