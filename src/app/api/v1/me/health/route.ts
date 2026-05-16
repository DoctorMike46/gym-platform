import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import {
    listClientHealthSamples,
    listLatestHealthSamples,
    HEALTH_SAMPLE_TYPES,
    type HealthSampleType,
} from "@/lib/services/health-samples.service";

export const runtime = "nodejs";

/**
 * GET /api/v1/me/health?days=30&types=weight,steps
 * Ritorna i campioni di salute degli ultimi N giorni + snapshot ultimi valori.
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const url = new URL(req.url);
    const daysRaw = url.searchParams.get("days");
    const days = daysRaw ? parseInt(daysRaw, 10) : 30;
    const typesRaw = url.searchParams.get("types");
    const types = typesRaw
        ? (typesRaw
              .split(",")
              .map((t) => t.trim())
              .filter((t) =>
                  HEALTH_SAMPLE_TYPES.includes(t as HealthSampleType),
              ) as HealthSampleType[])
        : undefined;

    const [samples, latest] = await Promise.all([
        listClientHealthSamples(
            auth.session.id,
            Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30,
            types,
        ),
        listLatestHealthSamples(auth.session.id),
    ]);

    return jsonOk({ samples, latest });
}
