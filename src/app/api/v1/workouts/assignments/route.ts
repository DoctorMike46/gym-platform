import { NextRequest } from "next/server";
import { jsonOk, requireApiClientAuth } from "@/lib/api-auth";
import { listClientWorkouts } from "@/lib/services/workouts.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;

    const assignments = await listClientWorkouts(auth.session);
    return jsonOk({ assignments });
}
