"use server";

import { db } from "@/db";
import {
    clients,
    questionnaire_assignments,
    questionnaire_responses,
    questionnaire_templates,
} from "@/db/schema";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { sendPushToClient } from "@/lib/fcm";

async function assertClientOwnership(trainerId: number, clientId: number) {
    const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainer_id, trainerId)))
        .limit(1);
    if (!c) throw new Error("Cliente non autorizzato");
}

async function assertTemplateOwnership(
    trainerId: number,
    templateId: number
) {
    const [t] = await db
        .select({ id: questionnaire_templates.id })
        .from(questionnaire_templates)
        .where(
            and(
                eq(questionnaire_templates.id, templateId),
                eq(questionnaire_templates.trainer_id, trainerId)
            )
        )
        .limit(1);
    if (!t) throw new Error("Template non autorizzato");
}

// ─── Templates ────────────────────────────────────────────────────

const VALID_QUESTION_TYPES = new Set([
    "text",
    "textarea",
    "number",
    "radio",
    "checkbox",
    "scale",
    "upload",
    "confirm",
]);

interface QuestionInput {
    id: string;
    type: string;
    label: string;
    hint?: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    placeholder?: string;
}

interface SectionInput {
    id: string;
    title: string;
    question_ids: string[];
}

interface TemplateSchemaInput {
    questions: QuestionInput[];
    sections?: SectionInput[];
}

function sanitizeSchema(raw: unknown): TemplateSchemaInput | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as { questions?: unknown; sections?: unknown };
    if (!Array.isArray(obj.questions)) return null;

    const questions: QuestionInput[] = [];
    const seenIds = new Set<string>();
    for (const q of obj.questions) {
        if (!q || typeof q !== "object") continue;
        const qq = q as Record<string, unknown>;
        const id = String(qq.id ?? "").trim();
        const type = String(qq.type ?? "").trim();
        const label = String(qq.label ?? "").trim();
        if (!id || !label) continue;
        if (!VALID_QUESTION_TYPES.has(type)) continue;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        const item: QuestionInput = {
            id,
            type,
            label,
            required: !!qq.required,
        };
        const hint = qq.hint;
        if (typeof hint === "string" && hint.trim()) item.hint = hint.trim();
        if (
            Array.isArray(qq.options) &&
            (type === "radio" || type === "checkbox")
        ) {
            item.options = qq.options
                .map((o) => String(o).trim())
                .filter((s) => s.length > 0);
        }
        if (type === "scale") {
            const min = Number(qq.min ?? 1);
            const max = Number(qq.max ?? 10);
            item.min = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 1;
            item.max = Number.isFinite(max)
                ? Math.max(item.min + 1, Math.floor(max))
                : 10;
        }
        const placeholder = qq.placeholder;
        if (typeof placeholder === "string" && placeholder.trim()) {
            item.placeholder = placeholder.trim();
        }
        questions.push(item);
    }
    if (questions.length === 0) return null;

    let sections: SectionInput[] | undefined;
    if (Array.isArray(obj.sections)) {
        sections = [];
        const known = new Set(questions.map((q) => q.id));
        for (const s of obj.sections) {
            if (!s || typeof s !== "object") continue;
            const ss = s as Record<string, unknown>;
            const id = String(ss.id ?? "").trim();
            const title = String(ss.title ?? "").trim();
            const qids = Array.isArray(ss.question_ids)
                ? ss.question_ids
                      .map((x) => String(x).trim())
                      .filter((q) => known.has(q))
                : [];
            if (!id || !title || qids.length === 0) continue;
            sections.push({ id, title, question_ids: qids });
        }
        if (sections.length === 0) sections = undefined;
    }

    return { questions, sections };
}

export async function listTemplates() {
    const trainer = await getAuthenticatedTrainer();
    return db
        .select()
        .from(questionnaire_templates)
        .where(
            and(
                eq(questionnaire_templates.trainer_id, trainer.id),
                eq(questionnaire_templates.is_active, true)
            )
        )
        .orderBy(asc(questionnaire_templates.nome));
}

export async function getTemplateDetail(templateId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [t] = await db
        .select()
        .from(questionnaire_templates)
        .where(
            and(
                eq(questionnaire_templates.id, templateId),
                eq(questionnaire_templates.trainer_id, trainer.id)
            )
        )
        .limit(1);
    return t ?? null;
}

export async function createTemplate(input: {
    nome: string;
    tipo: string;
    descrizione?: string | null;
    schema: TemplateSchemaInput;
}): Promise<
    { success: true; id: number } | { success: false; error: string }
> {
    const trainer = await getAuthenticatedTrainer();
    try {
        const nome = input.nome?.trim();
        const tipo = (input.tipo || "generico").trim();
        if (!nome) return { success: false, error: "Nome obbligatorio" };
        const schema = sanitizeSchema(input.schema);
        if (!schema) {
            return {
                success: false,
                error: "Schema non valido: aggiungi almeno una domanda",
            };
        }
        const [created] = await db
            .insert(questionnaire_templates)
            .values({
                trainer_id: trainer.id,
                nome,
                tipo: tipo || "generico",
                descrizione: input.descrizione?.trim() || null,
                schema_json: schema,
            })
            .returning({ id: questionnaire_templates.id });
        revalidatePath("/questionnaires");
        return { success: true, id: created.id };
    } catch (e) {
        console.error("Errore create template:", e);
        return { success: false, error: "Errore interno server" };
    }
}

export async function updateTemplate(
    templateId: number,
    input: {
        nome: string;
        tipo: string;
        descrizione?: string | null;
        schema: TemplateSchemaInput;
    }
): Promise<{ success: true } | { success: false; error: string }> {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertTemplateOwnership(trainer.id, templateId);
        const nome = input.nome?.trim();
        const tipo = (input.tipo || "generico").trim();
        if (!nome) return { success: false, error: "Nome obbligatorio" };
        const schema = sanitizeSchema(input.schema);
        if (!schema) {
            return {
                success: false,
                error: "Schema non valido: aggiungi almeno una domanda",
            };
        }
        await db
            .update(questionnaire_templates)
            .set({
                nome,
                tipo: tipo || "generico",
                descrizione: input.descrizione?.trim() || null,
                schema_json: schema,
                updated_at: new Date(),
            })
            .where(eq(questionnaire_templates.id, templateId));
        revalidatePath("/questionnaires");
        return { success: true };
    } catch (e) {
        console.error("Errore update template:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Soft delete: setta is_active=false. Le risposte storiche restano. */
export async function deleteTemplate(templateId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertTemplateOwnership(trainer.id, templateId);
        await db
            .update(questionnaire_templates)
            .set({ is_active: false, updated_at: new Date() })
            .where(eq(questionnaire_templates.id, templateId));
        revalidatePath("/questionnaires");
        return { success: true };
    } catch (e) {
        console.error("Errore delete template:", e);
        return { success: false, error: "Errore interno server" };
    }
}

// ─── Assignments ──────────────────────────────────────────────────

/** Lista assignments del trainer, filtrabili per status. */
export async function listAssignments(
    statusFilter: "pending" | "completed" | "all" = "all"
) {
    const trainer = await getAuthenticatedTrainer();
    const conditions = [eq(questionnaire_assignments.trainer_id, trainer.id)];
    if (statusFilter !== "all") {
        conditions.push(eq(questionnaire_assignments.status, statusFilter));
    }
    return db
        .select({
            id: questionnaire_assignments.id,
            template_id: questionnaire_assignments.template_id,
            template_nome: questionnaire_templates.nome,
            template_tipo: questionnaire_templates.tipo,
            client_id: questionnaire_assignments.client_id,
            client_nome: clients.nome,
            client_cognome: clients.cognome,
            status: questionnaire_assignments.status,
            motivo: questionnaire_assignments.motivo,
            sent_at: questionnaire_assignments.sent_at,
            completed_at: questionnaire_assignments.completed_at,
        })
        .from(questionnaire_assignments)
        .leftJoin(
            questionnaire_templates,
            eq(
                questionnaire_templates.id,
                questionnaire_assignments.template_id
            )
        )
        .leftJoin(
            clients,
            eq(clients.id, questionnaire_assignments.client_id)
        )
        .where(and(...conditions))
        .orderBy(desc(questionnaire_assignments.sent_at));
}

export async function getAssignmentDetail(assignmentId: number) {
    const trainer = await getAuthenticatedTrainer();
    const [row] = await db
        .select({
            assignment: questionnaire_assignments,
            template: questionnaire_templates,
            client: clients,
        })
        .from(questionnaire_assignments)
        .leftJoin(
            questionnaire_templates,
            eq(
                questionnaire_templates.id,
                questionnaire_assignments.template_id
            )
        )
        .leftJoin(
            clients,
            eq(clients.id, questionnaire_assignments.client_id)
        )
        .where(
            and(
                eq(questionnaire_assignments.id, assignmentId),
                eq(questionnaire_assignments.trainer_id, trainer.id)
            )
        )
        .limit(1);
    if (!row) return null;
    const [resp] = await db
        .select()
        .from(questionnaire_responses)
        .where(eq(questionnaire_responses.assignment_id, assignmentId))
        .limit(1);
    return {
        assignment: row.assignment,
        template: row.template,
        client: row.client,
        response: resp ?? null,
    };
}

/**
 * Assegna un template a uno o più clienti.
 * Skippa i clienti che hanno già un assignment pending per lo stesso template.
 */
export async function assignTemplateToClients(
    templateId: number,
    clientIds: number[],
    motivo?: string
) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await assertTemplateOwnership(trainer.id, templateId);
        if (clientIds.length === 0) {
            return { success: false, error: "Nessun cliente selezionato" };
        }

        // Filtra clienti del trainer
        const validClients = await db
            .select({ id: clients.id, nome: clients.nome })
            .from(clients)
            .where(
                and(
                    eq(clients.trainer_id, trainer.id),
                    inArray(clients.id, clientIds)
                )
            );
        if (validClients.length === 0) {
            return { success: false, error: "Clienti non validi" };
        }

        // Skippa i pending già esistenti
        const existing = await db
            .select({ client_id: questionnaire_assignments.client_id })
            .from(questionnaire_assignments)
            .where(
                and(
                    eq(questionnaire_assignments.template_id, templateId),
                    eq(questionnaire_assignments.status, "pending"),
                    inArray(
                        questionnaire_assignments.client_id,
                        validClients.map((c) => c.id)
                    )
                )
            );
        const existingSet = new Set(existing.map((e) => e.client_id));
        const toCreate = validClients.filter((c) => !existingSet.has(c.id));

        if (toCreate.length === 0) {
            return {
                success: false,
                error: "Tutti i clienti hanno già questo questionario pendente",
            };
        }

        const inserted = await db
            .insert(questionnaire_assignments)
            .values(
                toCreate.map((c) => ({
                    template_id: templateId,
                    client_id: c.id,
                    trainer_id: trainer.id,
                    status: "pending",
                    motivo: motivo?.trim() || null,
                }))
            )
            .returning({ id: questionnaire_assignments.id, client_id: questionnaire_assignments.client_id });

        // Push notifiche (best-effort, non-blocking)
        for (const a of inserted) {
            sendPushToClient(a.client_id, {
                title: "Nuovo questionario da compilare",
                body:
                    motivo?.trim() ||
                    "Il tuo trainer ti ha inviato un questionario.",
                data: {
                    type: "questionnaire_assigned",
                    assignment_id: String(a.id),
                },
            }).catch(() => {});
        }

        revalidatePath("/questionnaires");
        return { success: true, created: toCreate.length };
    } catch (e) {
        console.error("Errore assegnazione questionario:", e);
        return { success: false, error: "Errore interno server" };
    }
}

export async function deleteAssignment(assignmentId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        await db
            .delete(questionnaire_assignments)
            .where(
                and(
                    eq(questionnaire_assignments.id, assignmentId),
                    eq(questionnaire_assignments.trainer_id, trainer.id)
                )
            );
        revalidatePath("/questionnaires");
        return { success: true };
    } catch (e) {
        console.error("Errore delete assignment:", e);
        return { success: false, error: "Errore interno server" };
    }
}

/** Conteggio assignments pending per badge sidebar trainer. */
export async function countPendingAssignmentsForTrainer() {
    const trainer = await getAuthenticatedTrainer();
    const [row] = await db
        .select({ n: count() })
        .from(questionnaire_assignments)
        .where(
            and(
                eq(questionnaire_assignments.trainer_id, trainer.id),
                eq(questionnaire_assignments.status, "completed")
            )
        );
    // "pending" lato trainer = completed (cliente ha risposto, trainer deve leggere)
    return row?.n ?? 0;
}

/** Clienti del trainer per il selector "Assegna a". */
export async function listClientsForAssignment() {
    const trainer = await getAuthenticatedTrainer();
    return db
        .select({
            id: clients.id,
            nome: clients.nome,
            cognome: clients.cognome,
        })
        .from(clients)
        .where(eq(clients.trainer_id, trainer.id))
        .orderBy(asc(clients.cognome), asc(clients.nome));
}
