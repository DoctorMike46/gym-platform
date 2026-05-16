import { notFound } from "next/navigation";
import {
    getClientFullDataForNutrition,
    getMealPlanDetail,
} from "@/lib/actions/nutrition";
import { requireAuth } from "@/lib/auth";
import { EditPlanContent } from "./edit-plan-content";

export const dynamic = "force-dynamic";

export default async function EditPlanPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAuth();
    const { id } = await params;
    const planId = parseInt(id, 10);
    if (!Number.isFinite(planId)) notFound();

    const detail = await getMealPlanDetail(planId);
    if (!detail) notFound();

    const clientData = await getClientFullDataForNutrition(detail.plan.client_id);

    return (
        <EditPlanContent
            planId={planId}
            initialPlan={{
                nome: detail.plan.nome,
                data_inizio: detail.plan.data_inizio,
                data_fine: detail.plan.data_fine ?? "",
                note: detail.plan.note ?? "",
                kcal_target: detail.plan.kcal_target?.toString() ?? "",
                proteine_g: detail.plan.proteine_g?.toString() ?? "",
                carbo_g: detail.plan.carbo_g?.toString() ?? "",
                grassi_g: detail.plan.grassi_g?.toString() ?? "",
                attivo: detail.plan.attivo,
            }}
            initialMeals={detail.meals.map((m) => ({
                giorno_settimana: m.giorno_settimana,
                momento: m.momento,
                descrizione: m.descrizione,
                kcal: m.kcal,
                proteine_g: m.proteine_g,
                carbo_g: m.carbo_g,
                grassi_g: m.grassi_g,
                note: m.note,
                items: (m.items as unknown) as
                    | import("@/lib/nutrition/types").MealItem[]
                    | null,
            }))}
            clientData={clientData}
        />
    );
}
