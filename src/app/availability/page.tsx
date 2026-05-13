import { requireAuth } from "@/lib/auth";
import { listAppointmentTypes } from "@/lib/actions/appointment-types";
import {
    listAvailabilityOverrides,
    listAvailabilityRules,
} from "@/lib/actions/availability";
import AvailabilityContent from "./availability-content";

export default async function AvailabilityPage() {
    await requireAuth();
    const [types, rules, overrides] = await Promise.all([
        listAppointmentTypes(),
        listAvailabilityRules(),
        listAvailabilityOverrides(),
    ]);
    return (
        <AvailabilityContent
            types={types}
            rules={rules}
            overrides={overrides}
        />
    );
}
