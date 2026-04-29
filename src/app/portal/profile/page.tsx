import { requireClientAuth } from "@/lib/client-auth";
import { getMyProfile, getMyActiveSubscription } from "@/lib/actions/portal-profile";
import ProfileContent from "./profile-content";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
    await requireClientAuth();
    const [profile, sub] = await Promise.all([getMyProfile(), getMyActiveSubscription()]);
    if (!profile) return null;
    return <ProfileContent profile={profile} subscription={sub} />;
}
