import { NextRequest } from "next/server";
import { requireApiClientAuth } from "@/lib/api-auth";
import { getMessagesSince } from "@/lib/services/chat.service";

export const runtime = "nodejs";

/**
 * SSE: stream di nuovi messaggi per il cliente loggato.
 * Implementazione semplice via polling DB ogni 3s (dev-friendly).
 * In produzione conviene Postgres LISTEN/NOTIFY o Redis pub/sub.
 *
 * Query param: ?after_id=N (default: 0 = tutti i messaggi nuovi nella sessione)
 */
export async function GET(req: NextRequest) {
    const auth = await requireApiClientAuth(req);
    if (!("session" in auth)) return auth;
    const session = auth.session;

    const url = new URL(req.url);
    let lastId = parseInt(url.searchParams.get("after_id") || "0", 10);
    if (!Number.isFinite(lastId)) lastId = 0;

    const encoder = new TextEncoder();
    let pollInterval: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let closed = false;

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: unknown) => {
                if (closed) return;
                try {
                    controller.enqueue(
                        encoder.encode(
                            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
                        )
                    );
                } catch {
                    closed = true;
                }
            };

            // Invio iniziale con last_id
            sendEvent("ready", { last_id: lastId });

            const poll = async () => {
                if (closed) return;
                try {
                    const rows = await getMessagesSince({
                        trainerId: session.trainer_id,
                        clientId: session.id,
                        afterId: lastId,
                    });
                    if (rows.length > 0) {
                        for (const r of rows) {
                            sendEvent("message", r);
                            if (r.id > lastId) lastId = r.id;
                        }
                    }
                } catch (e) {
                    console.warn("[sse chat] poll error:", e);
                }
            };

            // Primo poll immediato
            await poll();
            pollInterval = setInterval(() => {
                poll().catch(() => {});
            }, 3000);

            // Heartbeat ogni 25s per evitare timeout proxy
            heartbeatInterval = setInterval(() => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`: keep-alive\n\n`));
                } catch {
                    closed = true;
                }
            }, 25000);
        },
        cancel() {
            closed = true;
            if (pollInterval) clearInterval(pollInterval);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
