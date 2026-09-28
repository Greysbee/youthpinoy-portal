import { updateSession } from "@/lib/supabase-middleware";
import type { NextRequest } from "next/server";

// Next.js 16 renamed the "middleware" convention to "proxy" (same functionality).
// This keeps the Supabase auth session fresh on every request.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
