import { requireAuth } from "@/lib/auth";
import {
    listAssignments,
    listClientsForAssignment,
    listTemplates,
} from "@/lib/actions/questionnaires";
import QuestionnairesContent from "./questionnaires-content";

export default async function QuestionnairesPage() {
    await requireAuth();
    const [templates, clientsList, assignments] = await Promise.all([
        listTemplates(),
        listClientsForAssignment(),
        listAssignments("all"),
    ]);
    return (
        <QuestionnairesContent
            templates={templates}
            clientsList={clientsList}
            assignments={assignments}
        />
    );
}
