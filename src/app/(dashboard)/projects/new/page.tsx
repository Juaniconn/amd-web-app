import Link from "next/link";
import { ProjectForm } from "@/features/projects/project-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  listActiveCustomersForProjects,
  listUsersForProjects,
} from "@/server/services/projects";

export default async function NewProjectPage() {
  await requirePermission(PERMISSION_IDS.projectsCreate);
  const customers = await listActiveCustomersForProjects();
  const users = await listUsersForProjects();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nuevo proyecto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo un agrupador. No crea pedidos, RFQ ni OT.
          </p>
        </div>
        <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <ProjectForm mode="create" customers={customers} users={users} />
    </div>
  );
}
