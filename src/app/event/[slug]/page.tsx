// Singular `/event/<slug>` is the shareable public URL for an event. It renders the
// same page as `/events/<slug>` (kept for existing links), so both resolve.
import EventDetailPage from "@/app/events/[slug]/page";

export const dynamic = "force-dynamic";
export default EventDetailPage;
