import { getSettings } from "@/lib/actions/settings";
import SettingsContent from "./settings-content";

export default async function SettingsPage() {
    const settingsData = await getSettings();

    return (
        <SettingsContent settingsData={settingsData} />
    );
}
