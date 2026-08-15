import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/features/projects/project-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { canEditProject, type ProjectStatus } from "@/lib/projects/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  getProjectById,
  listActiveCustomersForProjects,
  listUsersForProjects,
} from "@/server/services/projects";

function toDateInput(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.projectsUpdate);
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  if (!canEditProject(project.status as ProjectStatus)) notFound();

  const customers = await listActiveCustomersForProjects();
  const users = await listUsersForProjects();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar {project.code}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El cliente no se cambia. Las RFQ y pedidos se asocian en la ficha.
          </p>
        </div>
        <Link href={`/projects/${project.id}`} className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <ProjectForm
        mode="edit"
        projectId={project.id}
        customers={
          customers.some((customer) => customer.id === project.customerId)
            ? customers
            : [
                {
                  id: project.customerId,
                  legalName: project.customerName,
                  code: project.customerCode,
                },
                ...customers,
              ]
        }
        users={users}
        defaultValues={{
          name: project.name,
          customerId: project.customerId,
          description: project.description ?? "",
          ownerUserId: project.ownerUserId ?? "",
          startDate: toDateInput(project.startDate),
          estimatedEndDate: toDateInput(project.estimatedEndDate),
          notes: project.notes ?? "",
        }}
      />
    </div>
  );
}
