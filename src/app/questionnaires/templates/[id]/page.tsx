import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTemplateDetail } from "@/lib/actions/questionnaires";
import TemplateEditor from "../template-editor";

export default async function TemplateEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAuth();
    const { id } = await params;

    if (id === "new") {
        return <TemplateEditor mode="create" />;
    }

    const templateId = parseInt(id, 10);
    if (!Number.isFinite(templateId)) notFound();
    const template = await getTemplateDetail(templateId);
    if (!template) notFound();
    return <TemplateEditor mode="edit" template={template} />;
}
