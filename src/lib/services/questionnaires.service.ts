import { db } from "@/db";
import {
    questionnaire_assignments,
    questionnaire_responses,
    questionnaire_templates,
} from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import type { ClientSession } from "@/lib/client-auth";

export type QuestionType =
    | "text"
    | "textarea"
    | "number"
    | "radio"
    | "checkbox"
    | "scale"
    | "upload"
    | "confirm";

export interface QuestionSchema {
    id: string;
    type: QuestionType;
    label: string;
    /** sotto-titolo o hint visualizzato sotto il label */
    hint?: string;
    required: boolean;
    options?: string[];
    min?: number; // per scale
    max?: number; // per scale
    placeholder?: string;
}

export interface QuestionnaireSchema {
    /** sezioni opzionali (titolo che raggruppa domande) — se assente, una sola lista flat */
    sections?: { id: string; title: string; question_ids: string[] }[];
    questions: QuestionSchema[];
}

/**
 * Risposta del cliente: chiave = id domanda, valore in base al tipo.
 * - text/textarea/radio/upload (= R2 key) → string
 * - number/scale → number
 * - checkbox → string[]
 * - confirm → boolean
 */
export type QuestionnaireAnswers = Record<
    string,
    string | number | string[] | boolean | null
>;

// ─── Mobile (cliente) ───────────────────────────────────────────────

/** Questionari pending del cliente loggato. */
export async function listPendingQuestionnairesForClient(
    session: ClientSession
) {
    return db
        .select({
            assignment_id: questionnaire_assignments.id,
            template_id: questionnaire_templates.id,
            nome: questionnaire_templates.nome,
            descrizione: questionnaire_templates.descrizione,
            tipo: questionnaire_templates.tipo,
            motivo: questionnaire_assignments.motivo,
            sent_at: questionnaire_assignments.sent_at,
        })
        .from(questionnaire_assignments)
        .innerJoin(
            questionnaire_templates,
            eq(
                questionnaire_templates.id,
                questionnaire_assignments.template_id
            )
        )
        .where(
            and(
                eq(questionnaire_assignments.client_id, session.id),
                eq(questionnaire_assignments.status, "pending")
            )
        )
        .orderBy(desc(questionnaire_assignments.sent_at));
}

/** Dettaglio assignment con schema + (eventuale) risposta esistente. */
export async function getQuestionnaireForClient(
    session: ClientSession,
    assignmentId: number
) {
    const [row] = await db
        .select({
            assignment: questionnaire_assignments,
            template: questionnaire_templates,
        })
        .from(questionnaire_assignments)
        .innerJoin(
            questionnaire_templates,
            eq(
                questionnaire_templates.id,
                questionnaire_assignments.template_id
            )
        )
        .where(
            and(
                eq(questionnaire_assignments.id, assignmentId),
                eq(questionnaire_assignments.client_id, session.id)
            )
        )
        .limit(1);
    if (!row) return null;

    const [response] = await db
        .select()
        .from(questionnaire_responses)
        .where(eq(questionnaire_responses.assignment_id, assignmentId))
        .limit(1);

    return {
        assignment: row.assignment,
        template: row.template,
        response: response ?? null,
    };
}

/**
 * Salva la risposta del cliente e marca l'assignment come completed.
 * Valida che lo schema delle risposte abbia le `required`.
 */
export async function submitQuestionnaireForClient(
    session: ClientSession,
    assignmentId: number,
    answers: QuestionnaireAnswers
): Promise<{ ok: true } | { ok: false; error: string }> {
    const detail = await getQuestionnaireForClient(session, assignmentId);
    if (!detail) return { ok: false, error: "Questionario non trovato" };
    if (detail.assignment.status !== "pending") {
        return { ok: false, error: "Questionario già completato o scaduto" };
    }

    const schema = detail.template.schema_json as QuestionnaireSchema;
    if (!schema?.questions || !Array.isArray(schema.questions)) {
        return { ok: false, error: "Schema non valido" };
    }
    for (const q of schema.questions) {
        if (!q.required) continue;
        const a = answers[q.id];
        const empty =
            a === undefined ||
            a === null ||
            a === "" ||
            (Array.isArray(a) && a.length === 0) ||
            (q.type === "confirm" && a !== true);
        if (empty) {
            return { ok: false, error: `Risposta mancante: ${q.label}` };
        }
    }

    await db.insert(questionnaire_responses).values({
        assignment_id: assignmentId,
        response_json: answers,
    });
    await db
        .update(questionnaire_assignments)
        .set({ status: "completed", completed_at: new Date() })
        .where(eq(questionnaire_assignments.id, assignmentId));

    return { ok: true };
}

/** Conteggio questionari pending del cliente (per badge in app). */
export async function countPendingQuestionnairesForClient(
    session: ClientSession
): Promise<number> {
    const [row] = await db
        .select({ n: count() })
        .from(questionnaire_assignments)
        .where(
            and(
                eq(questionnaire_assignments.client_id, session.id),
                eq(questionnaire_assignments.status, "pending")
            )
        );
    return row?.n ?? 0;
}
