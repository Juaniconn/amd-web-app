import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contacts, customers } from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { AppError } from "@/lib/errors";
import type {
  CreateContactInput,
  UpdateContactInput,
} from "@/lib/validation/customers";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

function contactSnapshot(row: {
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  department: string | null;
  isPrimary: boolean;
  notes: string | null;
}) {
  return {
    name: row.name,
    title: row.title,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    department: row.department,
    isPrimary: row.isPrimary,
    notes: row.notes,
  };
}

async function requireActiveCustomer(customerId: string) {
  const [customer] = await db
    .select({ id: customers.id, legalName: customers.legalName })
    .from(customers)
    .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
    .limit(1);

  if (!customer) {
    throw new AppError("El cliente no existe.", "CUSTOMER_NOT_FOUND", 404);
  }

  return customer;
}

async function countActiveContacts(customerId: string) {
  const rows = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.customerId, customerId), isNull(contacts.deletedAt)));
  return rows.length;
}

export async function createContact(input: CreateContactInput, actor: Actor) {
  await requireActiveCustomer(input.customerId);
  const existingCount = await countActiveContacts(input.customerId);
  const isPrimary = existingCount === 0 ? true : input.isPrimary;
  const now = new Date();
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    if (isPrimary) {
      await tx
        .update(contacts)
        .set({ isPrimary: false, updatedBy: actor.userId, updatedAt: now })
        .where(
          and(
            eq(contacts.customerId, input.customerId),
            isNull(contacts.deletedAt),
          ),
        );
    }

    await tx.insert(contacts).values({
      id,
      customerId: input.customerId,
      name: input.name,
      title: input.title ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      department: input.department ?? null,
      isPrimary,
      notes: input.notes ?? null,
      isDemo: false,
      createdBy: actor.userId,
      updatedBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    });

    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "contact",
      entityId: id,
      entityLabel: input.name,
      parentEntityType: "customer",
      parentEntityId: input.customerId,
      newValue: contactSnapshot({
        name: input.name,
        title: input.title ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        whatsapp: input.whatsapp ?? null,
        department: input.department ?? null,
        isPrimary,
        notes: input.notes ?? null,
      }),
    });

    if (isPrimary) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "primary_contact_changed",
        entityType: "contact",
        entityId: id,
        entityLabel: input.name,
        parentEntityType: "customer",
        parentEntityId: input.customerId,
      });
    }
  });

  return { id };
}

export async function updateContact(input: UpdateContactInput, actor: Actor) {
  await requireActiveCustomer(input.customerId);

  const [current] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, input.id),
        eq(contacts.customerId, input.customerId),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new AppError("El contacto no existe.", "CONTACT_NOT_FOUND", 404);
  }

  const now = new Date();
  const next = {
    name: input.name,
    title: input.title ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    department: input.department ?? null,
    isPrimary: input.isPrimary || current.isPrimary,
    notes: input.notes ?? null,
  };

  if (current.isPrimary && !input.isPrimary) {
    next.isPrimary = true;
  }

  const changed = pickChangedFields(contactSnapshot(current), next);

  await db.transaction(async (tx) => {
    if (next.isPrimary && !current.isPrimary) {
      await tx
        .update(contacts)
        .set({ isPrimary: false, updatedBy: actor.userId, updatedAt: now })
        .where(
          and(
            eq(contacts.customerId, input.customerId),
            isNull(contacts.deletedAt),
          ),
        );
    }

    await tx
      .update(contacts)
      .set({
        ...next,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(contacts.id, input.id));

    if (Object.keys(changed.newValue).length > 0) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "contact",
        entityId: input.id,
        entityLabel: input.name,
        parentEntityType: "customer",
        parentEntityId: input.customerId,
        previousValue: changed.previousValue,
        newValue: changed.newValue,
      });
    }

    if (next.isPrimary && !current.isPrimary) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "primary_contact_changed",
        entityType: "contact",
        entityId: input.id,
        entityLabel: input.name,
        parentEntityType: "customer",
        parentEntityId: input.customerId,
      });
    }
  });

  return { id: input.id };
}

export async function archiveContact(
  id: string,
  customerId: string,
  actor: Actor,
) {
  await requireActiveCustomer(customerId);

  const [current] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.customerId, customerId),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new AppError("El contacto no existe.", "CONTACT_NOT_FOUND", 404);
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set({
        deletedAt: now,
        isPrimary: false,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(contacts.id, id));

    if (current.isPrimary) {
      const [replacement] = await tx
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.customerId, customerId), isNull(contacts.deletedAt)),
        )
        .orderBy(asc(contacts.createdAt))
        .limit(1);

      if (replacement) {
        await tx
          .update(contacts)
          .set({
            isPrimary: true,
            updatedBy: actor.userId,
            updatedAt: now,
          })
          .where(eq(contacts.id, replacement.id));

        await recordActivity(tx, {
          actorUserId: actor.userId,
          actorName: actor.name,
          action: "primary_contact_changed",
          entityType: "contact",
          entityId: replacement.id,
          entityLabel: replacement.name,
          parentEntityType: "customer",
          parentEntityId: customerId,
        });
      }
    }

    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "contact",
      entityId: id,
      entityLabel: current.name,
      parentEntityType: "customer",
      parentEntityId: customerId,
    });
  });

  return { id };
}

export async function setPrimaryContact(
  id: string,
  customerId: string,
  actor: Actor,
) {
  await requireActiveCustomer(customerId);

  const [current] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.customerId, customerId),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new AppError("El contacto no existe.", "CONTACT_NOT_FOUND", 404);
  }

  if (current.isPrimary) {
    return { id };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set({ isPrimary: false, updatedBy: actor.userId, updatedAt: now })
      .where(
        and(eq(contacts.customerId, customerId), isNull(contacts.deletedAt)),
      );

    await tx
      .update(contacts)
      .set({
        isPrimary: true,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(contacts.id, id));

    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "primary_contact_changed",
      entityType: "contact",
      entityId: id,
      entityLabel: current.name,
      parentEntityType: "customer",
      parentEntityId: customerId,
    });
  });

  return { id };
}
