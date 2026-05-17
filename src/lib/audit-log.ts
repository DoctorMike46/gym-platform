import { db } from "@/db";
import { audit_logs } from "@/db/schema";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export type AuditActor =
    | { type: "trainer"; id: number }
    | { type: "client"; id: number }
    | { type: "system" };

export type AuditAction =
    | "health.read"
    | "health.write"
    | "measurement.read"
    | "measurement.write"
    | "measurement.delete"
    | "photo.read"
    | "photo.write"
    | "photo.delete"
    | "gdpr.export"
    | "gdpr.delete"
    | "audit_log.retention_cleanup";

interface LogAuditInput {
    actor: AuditActor;
    action: AuditAction;
    resourceType: string;
    resourceId?: number | null;
    clientId?: number | null;
    metadata?: Record<string, unknown> | null;
    request?: NextRequest | Request;
}

/**
 * Estrae IP e User-Agent dalla request. Per Vercel/Next.js usa l'header
 * `x-forwarded-for` (il primo IP è quello del client). Se la request non è
 * passata, ricade su `headers()` (server actions / route handlers che non
 * propagano il req).
 */
async function extractContext(req?: NextRequest | Request): Promise<{ ip: string | null; ua: string | null }> {
    let h: Headers | null = null;
    if (req) {
        h = req.headers;
    } else {
        try {
            h = await headers();
        } catch {
            return { ip: null, ua: null };
        }
    }
    const xff = h.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0]?.trim() ?? null : h.get("x-real-ip");
    const ua = h.get("user-agent");
    return { ip: ip ?? null, ua: ua ?? null };
}

/**
 * Scrive una riga in audit_logs. Non lancia mai: se il logging fallisce
 * deve restare visibile in console ma non rompere la business logic.
 * Per dati sanitari (art.9 GDPR) è obbligatorio loggare ogni accesso.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
    try {
        const { ip, ua } = await extractContext(input.request);
        await db.insert(audit_logs).values({
            actor_type: input.actor.type,
            actor_id: input.actor.type === "system" ? null : input.actor.id,
            action: input.action,
            resource_type: input.resourceType,
            resource_id: input.resourceId ?? null,
            client_id: input.clientId ?? null,
            metadata: input.metadata ?? null,
            ip_address: ip,
            user_agent: ua,
        });
    } catch (err) {
        console.error("[audit-log] failed to write entry", { action: input.action, err });
    }
}
