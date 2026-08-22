import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { landingPathFor } from "@/lib/auth/session";
import { getUserAccess } from "@/server/services/access";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  // Cada rol aterriza donde realmente puede trabajar:
  // administración -> /dashboard, operador de piso -> /my-production
  const access = await getUserAccess(session.user.id);
  redirect(landingPathFor(access.permissions));
}
