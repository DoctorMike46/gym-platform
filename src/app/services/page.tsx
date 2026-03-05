import { getServices } from "@/lib/actions/services";
import ServicesPageClient from "./services-content";

export default async function ServicesPage() {
    const servicesData = await getServices();

    return (
        <ServicesPageClient servicesData={servicesData} />
    );
}
