import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  like,
  ne,
  or,
} from "drizzle-orm";
import { db } from "@/db";
import { contacts, customers } from "@/db/schema";
import { pickChangedFields } from "@/lib/audit/activity";
import { AppError } from "@/lib/errors";
import type {
  CreateCustomerInput,
  CustomerStatus,
  CustomerType,
  UpdateCustomerInput,
} from "@/lib/validation/customers";
import { recordActivity } from "@/server/services/activity";

export type Actor = {
  userId: string;
  name: string;
};

export const CUSTOMER_PAGE_SIZE = 20;

function customerSnapshot(row: {
  code: string;
  legalName: string;
  tradeName: string | null;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  type: string;
  status: string;
  notes: string | null;
}) {
  return {
    code: row.code,
    legalName: row.legalName,
    tradeName: row.tradeName,
    rfc: row.rfc,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    type: row.type,
    status: row.status,
    notes: row.notes,
  };
}

async function assertUniqueRfc(
  rfc: string | undefined,
  excludeId?: string,
) {
  if (!rfc) return;

  const filters = [
    eq(customers.rfc, rfc),
    isNull(customers.deletedAt),
  ];
  if (excludeId) {
    filters.push(ne(customers.id, excludeId));
  }

  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(...filters))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(
      "Ya existe un cliente con ese RFC.",
      "RFC_EXISTS",
      409,
    );
  }
}

async function generateCustomerCode() {
  const year = new Date().getFullYear();
  const prefix = `CLI-${year}-`;
  const [row] = await db
    .select({ code: customers.code })
    .from(customers)
    .where(like(customers.code, `${prefix}%`))
    .orderBy(desc(customers.code))
    .limit(1);

  const last = row?.code?.slice(prefix.length) ?? "";
  const next = (last && /^\d+$/.test(last) ? Number(last) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export async function createCustomer(input: CreateCustomerInput, actor: Actor) {
  await assertUniqueRfc(input.rfc);

  const id = crypto.randomUUID();
  const now = new Date();
  const code = await generateCustomerCode();

  await db.transaction(async (tx) => {
    await tx.insert(customers).values({
      id,
      code,
      legalName: input.legalName,
      tradeName: input.tradeName ?? null,
      rfc: input.rfc ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country,
      type: input.type,
      status: input.status,
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
      entityType: "customer",
      entityId: id,
      entityLabel: input.legalName,
      newValue: customerSnapshot({
        code,
        legalName: input.legalName,
        tradeName: input.tradeName ?? null,
        rfc: input.rfc ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country,
        type: input.type,
        status: input.status,
        notes: input.notes ?? null,
      }),
    });
  });

  return { id, code };
}

export async function updateCustomer(input: UpdateCustomerInput, actor: Actor) {
  const [current] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, input.id), isNull(customers.deletedAt)))
    .limit(1);

  if (!current) {
    throw new AppError("El cliente no existe.", "CUSTOMER_NOT_FOUND", 404);
  }

  await assertUniqueRfc(input.rfc, input.id);

  const nextRow = {
    legalName: input.legalName,
    tradeName: input.tradeName ?? null,
    rfc: input.rfc ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    country: input.country,
    type: input.type,
    status: input.status,
    notes: input.notes ?? null,
  };

  const changed = pickChangedFields(customerSnapshot(current), {
    ...customerSnapshot(current),
    ...nextRow,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({
        ...nextRow,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, input.id));

    if (Object.keys(changed.newValue).length > 0) {
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "customer",
        entityId: input.id,
        entityLabel: input.legalName,
        previousValue: changed.previousValue,
        newValue: changed.newValue,
      });
    }
  });

  return { id: input.id };
}

export async function archiveCustomer(id: string, actor: Actor) {
  const [current] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
    .limit(1);

  if (!current) {
    throw new AppError("El cliente no existe.", "CUSTOMER_NOT_FOUND", 404);
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({
        deletedAt: now,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(eq(customers.id, id));

    await tx
      .update(contacts)
      .set({
        deletedAt: now,
        isPrimary: false,
        updatedBy: actor.userId,
        updatedAt: now,
      })
      .where(and(eq(contacts.customerId, id), isNull(contacts.deletedAt)));

    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "customer",
      entityId: id,
      entityLabel: current.legalName,
    });
  });

  return { id };
}

export async function getCustomerById(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return null;

  const customerContacts = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.customerId, id), isNull(contacts.deletedAt)))
    .orderBy(desc(contacts.isPrimary), asc(contacts.name));

  return {
    ...customer,
    contacts: customerContacts,
    primaryContact:
      customerContacts.find((contact) => contact.isPrimary) ?? null,
  };
}

export type CustomerListQuery = {
  q?: string;
  status?: CustomerStatus;
  type?: CustomerType;
  page?: number;
};

export async function listCustomers(query: CustomerListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const filters = [isNull(customers.deletedAt)];

  if (query.status) {
    filters.push(eq(customers.status, query.status));
  }
  if (query.type) {
    filters.push(eq(customers.type, query.type));
  }
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(
        ilike(customers.legalName, term),
        ilike(customers.tradeName, term),
        ilike(customers.rfc, term),
        ilike(customers.code, term),
        ilike(customers.email, term),
      )!,
    );
  }

  const where = and(...filters);

  const [totalRow] = await db
    .select({ value: count() })
    .from(customers)
    .where(where);

  const rows = await db
    .select({
      id: customers.id,
      code: customers.code,
      legalName: customers.legalName,
      tradeName: customers.tradeName,
      rfc: customers.rfc,
      city: customers.city,
      type: customers.type,
      status: customers.status,
      isDemo: customers.isDemo,
      createdAt: customers.createdAt,
      primaryContactName: contacts.name,
      primaryContactPhone: contacts.phone,
      primaryContactEmail: contacts.email,
    })
    .from(customers)
    .leftJoin(
      contacts,
      and(
        eq(contacts.customerId, customers.id),
        eq(contacts.isPrimary, true),
        isNull(contacts.deletedAt),
      ),
    )
    .where(where)
    .orderBy(asc(customers.legalName))
    .limit(CUSTOMER_PAGE_SIZE)
    .offset((page - 1) * CUSTOMER_PAGE_SIZE);

  const total = Number(totalRow.value);

  return {
    rows,
    total,
    page,
    pageSize: CUSTOMER_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)),
  };
}

export async function countActiveCustomers() {
  const [row] = await db
    .select({ value: count() })
    .from(customers)
    .where(
      and(isNull(customers.deletedAt), eq(customers.status, "activo")),
    );
  return Number(row.value);
}
