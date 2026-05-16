import { requireClientAuth } from "@/lib/client-auth";
import { getBodyMeasurements, getProgressPhotos } from "@/lib/actions/portal-progress";
import ProgressContent from "./progress-content";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
    await requireClientAuth();
    const [measurements, photos] = await Promise.all([
        getBodyMeasurements(),
        getProgressPhotos(),
    ]);
    return <ProgressContent initialMeasurements={measurements} initialPhotos={photos} />;
}
