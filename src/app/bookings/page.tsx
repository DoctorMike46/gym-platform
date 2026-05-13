import { requireAuth } from "@/lib/auth";
import { listTrainerAppointments } from "@/lib/actions/appointments-trainer";
import BookingsContent from "./bookings-content";

export default async function BookingsPage() {
    await requireAuth();
    const [upcoming, pending, past] = await Promise.all([
        listTrainerAppointments({
            status: "confirmed",
            timeframe: "upcoming",
        }),
        listTrainerAppointments({ status: "pending" }),
        listTrainerAppointments({
            timeframe: "past",
            status: "all",
        }),
    ]);
    return (
        <BookingsContent upcoming={upcoming} pending={pending} past={past} />
    );
}
