"use server"

import { db } from "@/db";
import { client_workout_assignments, clients, workout_templates, settings, trainers, subscriptions, documents, workout_template_exercises } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { sendWorkoutAssignmentEmail } from "@/lib/email";
import { generateWorkoutPDFBuffer } from "@/lib/pdf-server";
import { uploadToR2, generateR2Key } from "@/lib/r2";

export async function getAllWorkoutTemplates() {
    const trainer = await getAuthenticatedTrainer();
    try {
        return await db.select().from(workout_templates)
            .where(eq(workout_templates.trainer_id, trainer.id))
            .orderBy(workout_templates.nome_template);
    } catch (error) {
        console.error("Errore recupero template:", error);
        return [];
    }
}

export async function assignWorkoutToClient(data: {
    client_id: number;
    template_id: number;
    note?: string;
}) {
    const trainer = await getAuthenticatedTrainer();
    try {
        // 1. Verifica ownership del client e del template
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, data.client_id), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { success: false, error: "Cliente non trovato" };

        const template = await db.query.workout_templates.findFirst({
            where: and(eq(workout_templates.id, data.template_id), eq(workout_templates.trainer_id, trainer.id)),
            with: {
                exercises: {
                    with: { exercise: true }
                }
            }
        });
        if (!template) return { success: false, error: "Template non trovato" };

        // 2. Verifica abbonamento attivo
        const activeSubscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.client_id, data.client_id),
                eq(subscriptions.status, "attivo")
            ),
        });

        if (!activeSubscription) {
            return { success: false, error: "Il cliente non ha un abbonamento attivo" };
        }

        // 3. Recupera info trainer
        const [trainerAccount, trainerSettings] = await Promise.all([
            db.query.trainers.findFirst({ where: eq(trainers.id, trainer.id) }),
            db.query.settings.findFirst({ where: eq(settings.trainer_id, trainer.id) })
        ]);

        // 4. Genera PDF Scheda
        const today = new Date().toLocaleDateString('it-IT');
        const pdfBuffer = await generateWorkoutPDFBuffer(
            template,
            trainerSettings,
            { nome: client.nome, cognome: client.cognome, dataAssegnazione: today }
        );

        // 5. Upload su R2 & Salva Documento
        const fileName = `Scheda_${template.nome_template.replace(/\s+/g, '_')}_${client.nome}.pdf`;
        const r2Key = generateR2Key(trainer.id, client.id, fileName);

        await uploadToR2({
            key: r2Key,
            body: pdfBuffer,
            contentType: "application/pdf"
        });

        await db.insert(documents).values({
            trainer_id: trainer.id,
            client_id: client.id,
            tipo_documento: "scheda",
            nome_file: fileName,
            r2_key: r2Key,
            mime_type: "application/pdf",
            dimensione_bytes: pdfBuffer.length,
            note: `Generata automaticamente assegnata il ${today}`
        });

        // 6. Inserisci assegnazione nel DB
        await db.insert(client_workout_assignments).values({
            client_id: data.client_id,
            template_id: data.template_id,
            note: data.note || null,
            attivo: true,
        });

        const platformName = trainerSettings?.site_name || "Gym Platform";

        // 7. Invia email notificando il cliente con allegato
        await sendWorkoutAssignmentEmail({
            clientEmail: client.email,
            clientName: client.nome,
            workoutName: template.nome_template,
            trainerName: trainerAccount?.nome || trainer.email.split('@')[0],
            trainerEmail: trainer.email,
            platformName,
            attachments: [
                {
                    filename: fileName,
                    content: pdfBuffer
                }
            ]
        });

        revalidatePath(`/clients/${data.client_id}`);
        revalidatePath("/documents");
        return { success: true };
    } catch (error) {
        console.error("Errore assegnazione scheda:", error);
        return { success: false, error: "Errore interno durante l'assegnazione" };
    }
}

export async function removeWorkoutFromClient(assignmentId: number, clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        // Verifica ownership del client
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { success: false };

        await db.delete(client_workout_assignments)
            .where(eq(client_workout_assignments.id, assignmentId));
        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Errore rimozione scheda:", error);
        return { success: false };
    }
}

export async function toggleWorkoutActive(assignmentId: number, attivo: boolean, clientId: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const client = await db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.trainer_id, trainer.id)),
        });
        if (!client) return { success: false };

        await db.update(client_workout_assignments)
            .set({ attivo })
            .where(eq(client_workout_assignments.id, assignmentId));
        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento stato scheda:", error);
        return { success: false };
    }
}
