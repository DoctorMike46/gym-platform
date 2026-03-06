import { getSettings } from "@/lib/actions/settings";
import SettingsContent from "./settings-content";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
    await requireAuth();
    const settingsData = await getSettings();

    return (
        <SettingsContent settingsData={settingsData} />
    );
}
