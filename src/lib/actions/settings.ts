"use server"

import { db } from "@/db";
import { settings } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function getSettings() {
    try {
        const result = await db.select().from(settings).limit(1);
        return result[0] || null;
    } catch (error) {
        console.error("Errore fetch settings:", error);
        return null;
    }
}

export async function updateSettings(formData: FormData) {
    try {
        const site_name = formData.get("site_name") as string;
        const primary_color = formData.get("primary_color") as string;
        const sidebar_color = formData.get("sidebar_color") as string;
        const logo_url = formData.get("logo_url") as string | null;
        const sidebar_logo_url = formData.get("sidebar_logo_url") as string | null;

        const existing = await db.select().from(settings).limit(1);

        const updateData: Record<string, any> = { site_name, primary_color, sidebar_color };
        if (logo_url !== null) updateData.logo_url = logo_url;
        if (sidebar_logo_url !== null) updateData.sidebar_logo_url = sidebar_logo_url;

        if (existing.length > 0) {
            await db.update(settings)
                .set(updateData)
                .where(eq(settings.id, existing[0].id));
        } else {
            await db.insert(settings).values({
                trainer_id: "default_trainer",
                site_name,
                primary_color,
                sidebar_color,
                logo_url: logo_url || undefined,
                sidebar_logo_url: sidebar_logo_url || undefined,
            });
        }

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Errore update settings:", error);
        return { error: "Errore" };
    }
}
