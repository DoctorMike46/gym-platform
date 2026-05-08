import { NextRequest } from "next/server";
import { db } from "@/db";
import { client_devices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { jsonError, jsonOk, requireApiClientAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

interface DeviceBody {
    fcm_token?: string;
    platform?: "ios" | "android";
    device_id?: string;
    app_version?: string;
}

/**
 * Registra/aggiorna un device FCM. Idempotente per fcm_token.
 */
export async function POST(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    let body: DeviceBody;
    try {
        body = await req.json();
    } catch {
        return jsonError("invalid_body", "Body JSON non valido", 400);
    }

    if (!body.fcm_token || !body.platform) {
        return jsonError("missing_fields", "fcm_token e platform richiesti", 400);
    }
    if (body.platform !== "ios" && body.platform !== "android") {
        return jsonError("invalid_platform", "platform deve essere 'ios' o 'android'", 400);
    }

    const [existing] = await db
        .select()
        .from(client_devices)
        .where(eq(client_devices.fcm_token, body.fcm_token))
        .limit(1);

    if (existing) {
        await db
            .update(client_devices)
            .set({
                client_id: auth.session.id,
                platform: body.platform,
                device_id: body.device_id ?? null,
                app_version: body.app_version ?? null,
                last_seen_at: new Date(),
            })
            .where(eq(client_devices.id, existing.id));
        return jsonOk({ id: existing.id, updated: true });
    }

    const [created] = await db
        .insert(client_devices)
        .values({
            client_id: auth.session.id,
            fcm_token: body.fcm_token,
            platform: body.platform,
            device_id: body.device_id ?? null,
            app_version: body.app_version ?? null,
        })
        .returning();

    return jsonOk({ id: created.id, updated: false }, 201);
}

/**
 * De-registra un device (logout pulito da FCM).
 */
export async function DELETE(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if ("session" in auth === false) return auth;

    const url = new URL(req.url);
    const fcmToken = url.searchParams.get("fcm_token");
    if (!fcmToken) {
        return jsonError("missing_fcm_token", "fcm_token richiesto come query param", 400);
    }

    await db
        .delete(client_devices)
        .where(
            and(
                eq(client_devices.fcm_token, fcmToken),
                eq(client_devices.client_id, auth.session.id)
            )
        );

    return jsonOk({ success: true });
}
