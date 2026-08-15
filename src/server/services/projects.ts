import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  documents,
  orders,
  productionOrders,
  projects,
  quotes,
  users,
} from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { AppError } from "@/lib/errors";
import {
  canEditProject,
  canTransitionProject,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/status";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/lib/validation/projects";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import { nextDocumentNumber } from "@/server/services/numbering";

const PAGE_SIZE = 20;

async function loadProjectRow(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!row) {
    throw new AppError("El proyecto no existe.", "PROJECT_NOT_FOUND", 404);
  }
  return row;
}

export async function listProjects(query: {
  q?: string;
  status?: ProjectStatus;
  delayed?: boolean;
  customerId?: string;
  page?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const filters = [];
  if (query.status) filters.push(eq(projects.status, query.status));
  if (query.customerId) filters.push(eq(projects.customerId, query.customerId));
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        ilike(projects.code, term),
        ilike(projects.name, term),
        ilike(customers.legalName, term),
        ilike(projects.description, term),
      ),
    );
  }
  if (query.delayed) {
    filters.push(
      and(eq(projects.status, "activo"), lt(projects.estimatedEndDate, new Date())),
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(projects)
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .where(where);

  const rows = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      status: projects.status,
      startDate: projects.startDate,
      estimatedEndDate: projects.estimatedEndDate,
      isDemo: projects.isDemo,
      customerId: projects.customerId,
      customerName: customers.legalName,
      ownerName: users.name,
    })
    .from(projects)
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(users, eq(projects.ownerUserId, users.id))
    .where(where)
    .orderBy(desc(projects.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const total = totalRow?.value ?? 0;
  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listProjectsByCustomer(customerId: string) {
  return db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      status: projects.status,
      estimatedEndDate: projects.estimatedEndDate,
    })
    .from(projects)
    .where(eq(projects.customerId, customerId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: string) {
  const [row] = await db
    .select({
      project: projects,
      customerName: customers.legalName,
      customerCode: customers.code,
      ownerName: users.name,
    })
    .from(projects)
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(users, eq(projects.ownerUserId, users.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!row) return null;

  const relatedQuotes = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      rfqType: quotes.rfqType,
      total: quotes.total,
      currency: quotes.currency,
    })
    .from(quotes)
    .where(and(eq(quotes.projectId, id), isNull(quotes.deletedAt)))
    .orderBy(desc(quotes.createdAt));

  const relatedOrders = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      total: orders.total,
      currency: orders.currency,
      promisedDate: orders.promisedDate,
    })
    .from(orders)
    .where(eq(orders.projectId, id))
    .orderBy(desc(orders.createdAt));

  const orderIds = relatedOrders.map((order) => order.id);
  const relatedOts =
    orderIds.length === 0
      ? []
      : await db
          .select({
            id: productionOrders.id,
            number: productionOrders.number,
            status: productionOrders.status,
            orderId: productionOrders.orderId,
            promisedDate: productionOrders.promisedDate,
          })
          .from(productionOrders)
          .where(inArray(productionOrders.orderId, orderIds))
          .orderBy(desc(productionOrders.createdAt));

  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "project"), eq(documents.entityId, id)))
    .orderBy(desc(documents.createdAt));

  return {
    ...row.project,
    customerName: row.customerName,
    customerCode: row.customerCode,
    ownerName: row.ownerName,
    quotes: relatedQuotes,
    orders: relatedOrders,
    productionOrders: relatedOts,
    documents: files,
  };
}

export async function createProject(input: CreateProjectInput, actor: Actor) {
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, input.customerId))
    .limit(1);
  if (!customer) {
    throw new AppError("El cliente no existe.", "CUSTOMER_NOT_FOUND", 404);
  }

  const id = crypto.randomUUID();
  const year = new Date().getFullYear();
  let createdCode = "";

  await db.transaction(async (tx) => {
    const code = await nextDocumentNumber(tx, "projects", `PRY-${year}-`);
    createdCode = code;
    await tx.insert(projects).values({
      id,
      code,
      name: input.name,
      customerId: input.customerId,
      description: input.description ?? null,
      ownerUserId: input.ownerUserId ?? null,
      startDate: input.startDate ?? null,
      estimatedEndDate: input.estimatedEndDate ?? null,
      notes: input.notes ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "project",
      entityId: id,
      entityLabel: `${code} ${input.name}`,
      parentEntityType: "customer",
      parentEntityId: input.customerId,
    });
  });

  return { id, code: createdCode };
}

export async function updateProject(input: UpdateProjectInput, actor: Actor) {
  const current = await loadProjectRow(input.id);
  if (!canEditProject(current.status as ProjectStatus)) {
    throw new AppError(
      "Este proyecto ya no se puede editar.",
      "PROJECT_LOCKED",
      409,
    );
  }
  if (input.customerId !== current.customerId) {
    throw new AppError(
      "No se puede cambiar el cliente de un proyecto. Crea otro agrupador.",
      "PROJECT_CUSTOMER_LOCKED",
      409,
    );
  }

  const next = {
    name: input.name,
    description: input.description ?? null,
    ownerUserId: input.ownerUserId ?? null,
    startDate: input.startDate ?? null,
    estimatedEndDate: input.estimatedEndDate ?? null,
    notes: input.notes ?? null,
    updatedBy: actor.userId,
    updatedAt: new Date(),
  };
  const changed = pickChangedFields(
    {
      name: current.name,
      description: current.description,
      ownerUserId: current.ownerUserId,
      notes: current.notes,
    },
    {
      name: next.name,
      description: next.description,
      ownerUserId: next.ownerUserId,
      notes: next.notes,
    },
  );

  await db.transaction(async (tx) => {
    await tx.update(projects).set(next).where(eq(projects.id, input.id));
    if (Object.keys(changed.newValue).length > 0) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "project",
        entityId: input.id,
        entityLabel: current.code,
        parentEntityType: "customer",
        parentEntityId: current.customerId,
        previousValue: changed.previousValue,
        newValue: changed.newValue,
      });
    }
  });

  return { id: input.id };
}

export async function changeProjectStatus(
  id: string,
  nextStatus: ProjectStatus,
  actor: Actor,
) {
  const current = await loadProjectRow(id);
  const from = current.status as ProjectStatus;
  if (!canTransitionProject(from, nextStatus)) {
    throw new AppError(
      `No se puede cambiar un proyecto de ${PROJECT_STATUS_LABELS[from]} a ${PROJECT_STATUS_LABELS[nextStatus]}.`,
      "INVALID_TRANSITION",
      409,
    );
  }

  const action =
    nextStatus === "completado"
      ? ("closed" as const)
      : nextStatus === "cancelado"
        ? ("cancelled" as const)
        : ("status_changed" as const);

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        status: nextStatus,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action,
      entityType: "project",
      entityId: id,
      entityLabel: `${current.code} → ${PROJECT_STATUS_LABELS[nextStatus]}`,
      parentEntityType: "customer",
      parentEntityId: current.customerId,
      previousValue: { status: from },
      newValue: { status: nextStatus },
    });
  });

  return { id, status: nextStatus };
}

export async function attachQuoteToProject(
  projectId: string,
  quoteId: string,
  actor: Actor,
) {
  const project = await loadProjectRow(projectId);
  if (!canEditProject(project.status as ProjectStatus)) {
    throw new AppError("Este proyecto ya no se puede editar.", "PROJECT_LOCKED", 409);
  }
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  if (quote.customerId !== project.customerId) {
    throw new AppError(
      "La RFQ debe ser del mismo cliente del proyecto.",
      "PROJECT_CUSTOMER_MISMATCH",
      409,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({ projectId, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(quotes.id, quoteId));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "project",
      entityId: projectId,
      entityLabel: `${project.code} + ${quote.number}`,
      parentEntityType: "customer",
      parentEntityId: project.customerId,
      newValue: { quoteId, quoteNumber: quote.number },
    });
  });

  return { id: projectId };
}

export async function attachOrderToProject(
  projectId: string,
  orderId: string,
  actor: Actor,
) {
  const project = await loadProjectRow(projectId);
  if (!canEditProject(project.status as ProjectStatus)) {
    throw new AppError("Este proyecto ya no se puede editar.", "PROJECT_LOCKED", 409);
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new AppError("El pedido no existe.", "ORDER_NOT_FOUND", 404);
  }
  if (order.customerId !== project.customerId) {
    throw new AppError(
      "El pedido debe ser del mismo cliente del proyecto.",
      "PROJECT_CUSTOMER_MISMATCH",
      409,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ projectId, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    if (!order.quoteId) return;
    await tx
      .update(quotes)
      .set({ projectId, updatedBy: actor.userId, updatedAt: new Date() })
      .where(and(eq(quotes.id, order.quoteId), isNull(quotes.projectId)));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "project",
      entityId: projectId,
      entityLabel: `${project.code} + ${order.number}`,
      parentEntityType: "customer",
      parentEntityId: project.customerId,
      newValue: { orderId, orderNumber: order.number },
    });
  });

  return { id: projectId };
}

export async function detachQuoteFromProject(
  projectId: string,
  quoteId: string,
  actor: Actor,
) {
  const project = await loadProjectRow(projectId);
  if (!canEditProject(project.status as ProjectStatus)) {
    throw new AppError("Este proyecto ya no se puede editar.", "PROJECT_LOCKED", 409);
  }
  await db
    .update(quotes)
    .set({ projectId: null, updatedBy: actor.userId, updatedAt: new Date() })
    .where(and(eq(quotes.id, quoteId), eq(quotes.projectId, projectId)));
  return { id: projectId };
}

export async function detachOrderFromProject(
  projectId: string,
  orderId: string,
  actor: Actor,
) {
  const project = await loadProjectRow(projectId);
  if (!canEditProject(project.status as ProjectStatus)) {
    throw new AppError("Este proyecto ya no se puede editar.", "PROJECT_LOCKED", 409);
  }
  await db
    .update(orders)
    .set({ projectId: null, updatedBy: actor.userId, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.projectId, projectId)));
  return { id: projectId };
}

export async function listAttachableQuotes(projectId: string) {
  const project = await loadProjectRow(projectId);
  return db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.customerId, project.customerId),
        isNull(quotes.projectId),
        isNull(quotes.deletedAt),
      ),
    )
    .orderBy(desc(quotes.createdAt));
}

export async function listAttachableOrders(projectId: string) {
  const project = await loadProjectRow(projectId);
  return db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.customerId, project.customerId), isNull(orders.projectId)))
    .orderBy(desc(orders.createdAt));
}

export async function listUsersForProjects() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(asc(users.name));
}

export async function listActiveCustomersForProjects() {
  return db
    .select({
      id: customers.id,
      legalName: customers.legalName,
      code: customers.code,
    })
    .from(customers)
    .where(and(eq(customers.status, "activo"), isNull(customers.deletedAt)))
    .orderBy(asc(customers.legalName));
}
