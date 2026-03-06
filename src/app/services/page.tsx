import { getServices } from "@/lib/actions/services";
import ServicesPageClient from "./services-content";
import { requireAuth } from "@/lib/auth";

export default async function ServicesPage() {
    await requireAuth();
    const servicesData = await getServices();

    return (
        <ServicesPageClient servicesData={servicesData} />
    );
}
