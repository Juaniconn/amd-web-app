import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectDocuments } from "@/features/projects/project-documents";
import { DetachButton, ProjectMembers } from "@/features/projects/project-members";
import { ProjectStatusActions } from "@/features/projects/project-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import {
  canEditProject,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/status";
import { QUOTE_STATUS_LABELS } from "@/lib/quotes/status";
import { listProjectActivity } from "@/server/services/activity";
import {
  getProjectById,
  listAttachableOrders,
  listAttachableQuotes,
} from "@/server/services/projects";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.projectsView);
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const activity = await listProjectActivity(project.id);
  const canUpdate = access.permissions.includes(PERMISSION_IDS.projectsUpdate);
  const editable = canUpdate && canEditProject(project.status as ProjectStatus);
  const canReadQuotes = access.permissions.includes(PERMISSION_IDS.quotesRead);
  const canReadOrders = access.permissions.includes(PERMISSION_IDS.ordersView);
  const canReadProduction = access.permissions.includes(PERMISSION_IDS.productionView);
  const attachableQuotes = editable ? await listAttachableQuotes(project.id) : [];
  const attachableOrders = editable ? await listAttachableOrders(project.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{project.code}</h2>
            <Badge variant="secondary">
              {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
            </Badge>
            {project.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} ·{" "}
            <Link href={`/customers/${project.customerId}`} className="hover:underline">
              {project.customerName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {editable ? (
            <Link
              href={`/projects/${project.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      <ProjectStatusActions
        projectId={project.id}
        status={project.status as ProjectStatus}
        permissions={access.permissions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Código" value={project.code} />
          <Field label="Nombre" value={project.name} />
          <Field label="Cliente" value={project.customerName} />
          <Field label="Responsable" value={project.ownerName} />
          <Field
            label="Estado"
            value={PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
          />
          <Field
            label="Fecha inicio"
            value={project.startDate?.toLocaleDateString("es-MX") ?? null}
          />
          <Field
            label="Fecha fin estimada"
            value={project.estimatedEndDate?.toLocaleDateString("es-MX") ?? null}
          />
        </CardContent>
      </Card>

      {project.description ? (
        <Card>
          <CardHeader>
            <CardTitle>Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{project.description}</p>
          </CardContent>
        </Card>
      ) : null}

      {project.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{project.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>RFQ asociadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProjectMembers
            projectId={project.id}
            attachableQuotes={attachableQuotes}
            attachableOrders={attachableOrders}
            canWrite={editable}
          />
          {project.quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin RFQ ligadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Estado</TableHead>
                  {editable ? <TableHead className="text-right"> </TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      {canReadQuotes ? (
                        <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline">
                          {quote.number}
                        </Link>
                      ) : (
                        quote.number
                      )}
                    </TableCell>
                    <TableCell>{QUOTE_STATUS_LABELS[quote.status]}</TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <DetachButton
                          projectId={project.id}
                          entityId={quote.id}
                          kind="quote"
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos asociados</CardTitle>
        </CardHeader>
        <CardContent>
          {project.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos ligados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Estado</TableHead>
                  {editable ? <TableHead className="text-right"> </TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {canReadOrders ? (
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                          {order.number}
                        </Link>
                      ) : (
                        order.number
                      )}
                    </TableCell>
                    <TableCell>
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <DetachButton
                          projectId={project.id}
                          entityId={order.id}
                          kind="order"
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OT asociadas</CardTitle>
        </CardHeader>
        <CardContent>
          {project.productionOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Las OT se listan a través de los pedidos. No se crean desde el proyecto.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prometida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.productionOrders.map((ot) => (
                  <TableRow key={ot.id}>
                    <TableCell>
                      {canReadProduction ? (
                        <Link href={`/production/${ot.id}`} className="font-medium hover:underline">
                          {ot.number}
                        </Link>
                      ) : (
                        ot.number
                      )}
                    </TableCell>
                    <TableCell>
                      {PRODUCTION_STATUS_LABELS[ot.status as ProductionStatus]}
                    </TableCell>
                    <TableCell>{ot.promisedDate.toLocaleDateString("es-MX")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectDocuments
            projectId={project.id}
            documents={project.documents}
            canWrite={editable}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay actividad registrada.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <p className="text-sm">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.createdAt.toLocaleString("es-MX")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
