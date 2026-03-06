import { getAnnouncements } from "@/lib/actions/announcements";
import { getClients } from "@/lib/actions/clients";
import AnnouncementsContent from "./announcements-content";
import { requireAuth } from "@/lib/auth";

export default async function AnnouncementsPage() {
    await requireAuth();
    const announcementsData = await getAnnouncements();
    const clientsData = await getClients();

    return (
        <AnnouncementsContent
            announcementsData={announcementsData}
            clientsData={clientsData}
        />
    );
}
