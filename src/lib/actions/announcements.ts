"use server"

import { db } from "@/db";
import { announcements, announcement_recipients, clients, settings, trainers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedTrainer } from "@/lib/auth";
import { sendAnnouncementEmail } from "@/lib/email";
import { uploadToR2, generateAnnouncementR2Key, deleteFromR2, downloadFromR2 } from "@/lib/r2";

export async function getAnnouncements() {
    const trainer = await getAuthenticatedTrainer();
    try {
        return await db.query.announcements.findMany({
            where: eq(announcements.trainer_id, trainer.id),
            with: {
                recipients: {
                    with: { client: true },
                },
            },
            orderBy: [desc(announcements.created_at)],
        });
    } catch (error) {
        console.error("Errore recupero annunci:", error);
        return [];
    }
}

export async function createAnnouncement(formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const titolo = formData.get("titolo") as string;
        const contenuto = formData.get("contenuto") as string;
        const tipo = formData.get("tipo") as string;
        const destinatari = formData.get("destinatari") as string;
        const clientIdsStr = formData.get("clientIds") as string;
        const clientIds = clientIdsStr ? JSON.parse(clientIdsStr) : undefined;
        const file = formData.get("image") as File | null;

        if (!titolo || !contenuto) {
            return { success: false, error: "Titolo e contenuto obbligatori" };
        }

        let image_r2_key = null;
        let image_filename = null;

        if (file && file.size > 0) {
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_SIZE) {
                return { success: false, error: "Immagine troppo grande (max 5MB)" };
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            image_r2_key = generateAnnouncementR2Key(trainer.id, file.name);
            image_filename = file.name;

            await uploadToR2({
                key: image_r2_key,
                body: buffer,
                contentType: file.type || "application/octet-stream",
            });
        }

        const [announcement] = await db.insert(announcements).values({
            trainer_id: trainer.id,
            titolo: titolo,
            contenuto: contenuto,
            tipo: tipo || "annuncio",
            destinatari: destinatari || "tutti",
            image_r2_key,
            image_filename,
        }).returning();

        // Se destinatari selezionati, salva i recipient
        if (destinatari === "selezionati" && clientIds && clientIds.length > 0) {
            await db.insert(announcement_recipients).values(
                clientIds.map((clientId: number) => ({
                    announcement_id: announcement.id,
                    client_id: clientId,
                }))
            );
        }

        revalidatePath("/announcements");
        return { success: true, id: announcement.id };
    } catch (error) {
        console.error("Errore creazione annuncio:", error);
        return { success: false, error: "Errore interno" };
    }
}

export async function updateAnnouncement(id: number, formData: FormData) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const existing = await db.query.announcements.findFirst({
            where: and(eq(announcements.id, id), eq(announcements.trainer_id, trainer.id)),
        });
        if (!existing) return { success: false, error: "Non autorizzato" };

        const titolo = formData.get("titolo") as string;
        const contenuto = formData.get("contenuto") as string;
        const tipo = formData.get("tipo") as string;
        const destinatari = formData.get("destinatari") as string;
        const clientIdsStr = formData.get("clientIds") as string;
        const clientIds = clientIdsStr ? JSON.parse(clientIdsStr) : undefined;
        const file = formData.get("image") as File | null;
        const removeImage = formData.get("removeImage") === "true";

        let image_r2_key = existing.image_r2_key;
        let image_filename = existing.image_filename;

        if (removeImage && existing.image_r2_key) {
            await deleteFromR2(existing.image_r2_key).catch(console.error);
            image_r2_key = null;
            image_filename = null;
        } else if (file && file.size > 0) {
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_SIZE) {
                return { success: false, error: "Immagine troppo grande (max 5MB)" };
            }

            // Remove old image if exists
            if (existing.image_r2_key) {
                await deleteFromR2(existing.image_r2_key).catch(console.error);
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            image_r2_key = generateAnnouncementR2Key(trainer.id, file.name);
            image_filename = file.name;

            await uploadToR2({
                key: image_r2_key,
                body: buffer,
                contentType: file.type || "application/octet-stream",
            });
        }

        await db.update(announcements).set({
            titolo: titolo,
            contenuto: contenuto,
            tipo: tipo,
            destinatari: destinatari,
            image_r2_key,
            image_filename,
            updated_at: new Date(),
        }).where(eq(announcements.id, id));

        // Aggiorna recipients
        await db.delete(announcement_recipients).where(eq(announcement_recipients.announcement_id, id));
        if (destinatari === "selezionati" && clientIds && clientIds.length > 0) {
            await db.insert(announcement_recipients).values(
                clientIds.map((clientId: number) => ({
                    announcement_id: id,
                    client_id: clientId,
                }))
            );
        }

        revalidatePath("/announcements");
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento annuncio:", error);
        return { success: false, error: "Errore interno" };
    }
}

export async function deleteAnnouncement(id: number) {
    const trainer = await getAuthenticatedTrainer();
    try {
        const existing = await db.query.announcements.findFirst({
            where: and(eq(announcements.id, id), eq(announcements.trainer_id, trainer.id)),
        });

        if (existing?.image_r2_key) {
            await deleteFromR2(existing.image_r2_key).catch(console.error);
        }

        await db.delete(announcements).where(and(eq(announcements.id, id), eq(announcements.trainer_id, trainer.id)));
        revalidatePath("/announcements");
        return { success: true };
    } catch (error) {
        console.error("Errore eliminazione annuncio:", error);
        return { success: false };
    }
}

export async function publishAnnouncement(id: number) {
    const trainerSession = await getAuthenticatedTrainer();
    try {
        const [trainer, announcement] = await Promise.all([
            db.query.trainers.findFirst({
                where: eq(trainers.id, trainerSession.id),
            }),
            db.query.announcements.findFirst({
                where: and(eq(announcements.id, id), eq(announcements.trainer_id, trainerSession.id)),
                with: {
                    recipients: {
                        with: { client: true },
                    },
                },
            })
        ]);

        if (!trainer || !announcement) return { success: false, error: "Dati non trovati o non autorizzati" };

        // Determina destinatari email
        let emailRecipients: { email: string; nome: string }[] = [];

        if (announcement.destinatari === "tutti") {
            const allClients = await db.select({ email: clients.email, nome: clients.nome })
                .from(clients)
                .where(eq(clients.trainer_id, trainer.id));
            emailRecipients = allClients;
        } else {
            emailRecipients = announcement.recipients.map(r => ({
                email: r.client.email,
                nome: r.client.nome,
            }));
        }

        if (emailRecipients.length === 0) {
            return { success: false, error: "Nessun destinatario trovato. Assicurati di avere clienti registrati." };
        }

        const trainerSettings = await db.query.settings.findFirst({
            where: eq(settings.trainer_id, trainer.id),
        });
        const platformName = trainerSettings?.site_name || "Gym Platform";

        let attachments = undefined;
        if (announcement.image_r2_key && announcement.image_filename) {
            try {
                const buffer = await downloadFromR2(announcement.image_r2_key);
                attachments = [{
                    filename: announcement.image_filename,
                    content: buffer,
                }];
            } catch (error) {
                console.error("Errore download allegato annuncio:", error);
            }
        }

        // Invia email
        const emailResult = await sendAnnouncementEmail({
            recipients: emailRecipients,
            titolo: announcement.titolo,
            contenuto: announcement.contenuto,
            tipo: announcement.tipo,
            trainerName: trainer.nome || trainer.email.split('@')[0],
            trainerEmail: trainer.email,
            platformName,
            attachments,
        });

        // Aggiorna stato
        const sent = ('sent' in emailResult ? (emailResult.sent ?? 0) : 0) as number;
        const total = ('total' in emailResult ? (emailResult.total ?? 0) : 0) as number;
        const allSent = emailResult.success && total > 0 && sent === total;

        await db.update(announcements).set({
            pubblicato: true,
            email_inviata: allSent,
            updated_at: new Date(),
        }).where(eq(announcements.id, id));

        revalidatePath("/announcements");

        if (!emailResult.success || (total > 0 && sent === 0)) {
            const errorMsg = 'error' in emailResult ? emailResult.error : (emailResult.results?.[0]?.error || "Errore sconosciuto");
            return {
                success: false,
                error: `Errore durante l'invio delle email: ${errorMsg}. Controlla la configurazione di Resend.`
            };
        }

        if (sent < total) {
            return {
                success: true,
                warning: `Annuncio pubblicato, ma inviato solo a ${sent} su ${total} destinatari.`
            };
        }

        return { success: true, message: "Annuncio pubblicato e tutte le email inviate correttamente!" };
    } catch (error) {
        console.error("Errore pubblicazione annuncio:", error);
        return { success: false, error: "Errore interno durante la pubblicazione" };
    }
}
