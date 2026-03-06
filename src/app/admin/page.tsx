import { requireAdmin } from "@/lib/auth";
import { getAllTrainers } from "@/lib/actions/admin-trainers";
import AdminDashboardContent from "./admin-dashboard-content";
import { getSettings } from "@/lib/actions/settings";

export default async function AdminPage() {
    // 1. Protection: Only admins allowed
    await requireAdmin();

    // 2. Fetch data
    const trainers = await getAllTrainers();
    const settings = await getSettings();

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pannello Amministrativo</h1>
                <p className="text-slate-500 mt-1">Gestione dei trainer e configurazione piattaforma</p>
            </div>

            <AdminDashboardContent
                initialTrainers={trainers}
                primaryColor={settings?.primary_color || "#003366"}
            />
        </div>
    );
}
