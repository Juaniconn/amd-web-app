import { redirect } from "next/navigation";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requireSession } from "@/lib/auth/session";
import { getUserAccess } from "@/server/services/access";

export default async function SettingsIndexPage() {
  const session = await requireSession();
  const access = await getUserAccess(session.user.id);

  if (access.permissions.includes(PERMISSION_IDS.usersRead)) {
    redirect("/settings/users");
  }
  if (access.permissions.includes(PERMISSION_IDS.rolesRead)) {
    redirect("/settings/roles");
  }

  redirect("/dashboard");
}
