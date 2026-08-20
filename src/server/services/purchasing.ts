import "server-only";

import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  materials,
  orders,
  productionOrders,
  purchaseOrderItems,
  purchaseOrders,
  purchaseReceiptItems,
  purchaseReceipts,
  purchaseRequestItems,
  purchaseRequests,
  supplierMaterials,
  suppliers,
  unitsOfMeasure,
  warehouses,
} from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { PAYMENT_TERMS, type PaymentTerm } from "@/lib/quotes/commercial";
import { AppError } from "@/lib/errors";
import { formatQty, parseQty, qtyGt } from "@/lib/inventory/catalog";
import {
  canConvertPurchaseRequest,
  canEditPurchaseOrder,
  canReceivePurchaseOrder,
  canTransitionPurchaseOrder,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
  type PurchaseRequestStatus,
} from "@/lib/purchasing/catalog";
import { calculateLineTotals, calculateQuoteTotals, formatMoney } from "@/lib/quotes/money";
import type {
  ConvertPurchaseRequestInput,
  CreatePurchaseOrderInput,
  CreateSupplierInput,
  ReceivePurchaseOrderInput,
  SupplierMaterialInput,
  UpdatePurchaseOrderInput,
  UpdateSupplierInput,
} from "@/lib/validation/purchasing";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";
import {
  applyWorkOrderMaterialWait,
  listWorkOrderMaterials,
  receivePurchaseStock,
} from "@/server/services/inventory";
import { workOrderNumber } from "@/lib/production/ot-number";
import { nextDocumentNumber } from "@/server/services/numbering";
import { resolvePageSize } from "@/lib/ui/pagination";

const materialBranches = alias(branches, "material_branches");
const orderBranches = alias(branches, "order_branches");

function yearPrefix(prefix: string) {
  return `${prefix}${new Date().getFullYear()}-`;
}

export async function listSuppliers(input?: {
  q?: string;
  status?: "activo" | "inactivo";
  calculator?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [isNull(suppliers.deletedAt)];
  if (input?.status) filters.push(eq(suppliers.status, input.status));
  if (input?.calculator) filters.push(eq(suppliers.usedInCalculator, true));
  if (input?.q) {
    const term = `%${input.q}%`;
    const search = or(
      ilike(suppliers.code, term),
      ilike(suppliers.legalName, term),
      ilike(suppliers.rfc, term),
    );
    if (search) filters.push(search);
  }
  const where = and(...filters);
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(suppliers)
    .where(where);
  const rows = await db
    .select()
    .from(suppliers)
    .where(where)
    .orderBy(desc(suppliers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const total = Number(countRow?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listActiveSuppliers() {
  return db
    .select({
      id: suppliers.id,
      code: suppliers.code,
      legalName: suppliers.legalName,
      paymentTerm: suppliers.paymentTerm,
    })
    .from(suppliers)
    .where(and(isNull(suppliers.deletedAt), eq(suppliers.status, "activo")))
    .orderBy(suppliers.legalName);
}

export async function getSupplierById(id: string) {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return row ?? null;
}

export async function createSupplier(input: CreateSupplierInput, actor: Actor) {
  const id = crypto.randomUUID();
  const created = await db.transaction(async (tx) => {
    const code = await nextDocumentNumber(tx, "suppliers", yearPrefix("PROV-"));
    await tx.insert(suppliers).values({
      id,
      code,
      legalName: input.legalName,
      rfc: input.rfc ?? null,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country,
      paymentTerm: input.paymentTerm,
      leadTime: input.leadTime ?? null,
      notes: input.notes ?? null,
      website: input.website ?? null,
      materialAvailable: input.materialAvailable ?? null,
      classification: input.classification ?? null,
      advantages: input.advantages ?? null,
      disadvantages: input.disadvantages ?? null,
      distanceNote: input.distanceNote ?? null,
      usedInCalculator: input.usedInCalculator ?? false,
      status: input.status,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "supplier",
      entityId: id,
      entityLabel: `${code} · ${input.legalName}`,
    });
    return { id, code };
  });
  return created;
}

export async function updateSupplier(input: UpdateSupplierInput, actor: Actor) {
  const existing = await getSupplierById(input.id);
  if (!existing || existing.deletedAt) {
    throw new AppError("El proveedor no existe.", "SUPPLIER_NOT_FOUND", 404);
  }
  await db
    .update(suppliers)
    .set({
      legalName: input.legalName,
      rfc: input.rfc ?? null,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country,
      paymentTerm: input.paymentTerm,
      leadTime: input.leadTime ?? null,
      notes: input.notes ?? null,
      website: input.website ?? existing.website,
      materialAvailable: input.materialAvailable ?? existing.materialAvailable,
      classification: input.classification ?? existing.classification,
      advantages: input.advantages ?? existing.advantages,
      disadvantages: input.disadvantages ?? existing.disadvantages,
      distanceNote: input.distanceNote ?? existing.distanceNote,
      usedInCalculator: input.usedInCalculator ?? existing.usedInCalculator,
      status: input.status,
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, input.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "updated",
    entityType: "supplier",
    entityId: input.id,
    entityLabel: `${existing.code} · ${input.legalName}`,
  });
}

export async function archiveSupplier(id: string, actor: Actor) {
  const existing = await getSupplierById(id);
  if (!existing || existing.deletedAt) {
    throw new AppError("El proveedor no existe.", "SUPPLIER_NOT_FOUND", 404);
  }
  await db
    .update(suppliers)
    .set({
      status: "inactivo",
      deletedAt: new Date(),
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "deleted",
    entityType: "supplier",
    entityId: id,
    entityLabel: `${existing.code} · ${existing.legalName}`,
  });
}

export async function listPurchaseOrders(input?: {
  q?: string;
  status?: PurchaseOrderStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [];
  if (input?.status) filters.push(eq(purchaseOrders.status, input.status));
  if (input?.q) {
    const term = `%${input.q}%`;
    filters.push(
      or(
        ilike(purchaseOrders.number, term),
        ilike(suppliers.legalName, term),
        ilike(suppliers.code, term),
      ),
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .where(where);
  const rows = await db
    .select({
      id: purchaseOrders.id,
      number: purchaseOrders.number,
      status: purchaseOrders.status,
      currency: purchaseOrders.currency,
      total: purchaseOrders.total,
      isUrgent: purchaseOrders.isUrgent,
      expectedDate: purchaseOrders.expectedDate,
      issueDate: purchaseOrders.issueDate,
      isDemo: purchaseOrders.isDemo,
      supplierName: suppliers.legalName,
      supplierCode: suppliers.code,
      branchName: branches.name,
      branchCode: branches.code,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(branches, eq(branches.id, purchaseOrders.branchId))
    .where(where)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const total = Number(countRow?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listPurchaseOrdersPendingReceive() {
  return db
    .select({
      id: purchaseOrders.id,
      number: purchaseOrders.number,
      status: purchaseOrders.status,
      expectedDate: purchaseOrders.expectedDate,
      supplierName: suppliers.legalName,
      supplierCode: suppliers.code,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .where(inArray(purchaseOrders.status, ["enviada", "confirmada", "parcial"]))
    .orderBy(desc(purchaseOrders.updatedAt));
}

export async function getPurchaseOrderById(id: string) {
  const [row] = await db
    .select({
      po: purchaseOrders,
      supplierName: suppliers.legalName,
      supplierCode: suppliers.code,
      supplierRfc: suppliers.rfc,
      branchName: branches.name,
      branchCode: branches.code,
      otNumber: productionOrders.number,
      partNumber: productionOrders.partNumber,
      workOrderNumber: orders.number,
      workOrderId: orders.id,
      requestNumber: purchaseRequests.number,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(branches, eq(branches.id, purchaseOrders.branchId))
    .leftJoin(productionOrders, eq(productionOrders.id, purchaseOrders.productionOrderId))
    .leftJoin(orders, eq(orders.id, purchaseOrders.orderId))
    .leftJoin(purchaseRequests, eq(purchaseRequests.id, purchaseOrders.purchaseRequestId))
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select({
      item: purchaseOrderItems,
      materialCode: materials.code,
      materialDescription: materials.description,
    })
    .from(purchaseOrderItems)
    .innerJoin(materials, eq(materials.id, purchaseOrderItems.materialId))
    .where(eq(purchaseOrderItems.purchaseOrderId, id))
    .orderBy(purchaseOrderItems.position);
  const receipts = await db
    .select()
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.purchaseOrderId, id))
    .orderBy(desc(purchaseReceipts.receivedAt));
  return {
    ...row.po,
    supplierName: row.supplierName,
    supplierCode: row.supplierCode,
    supplierRfc: row.supplierRfc,
    branchName: row.branchName,
    branchCode: row.branchCode,
    otNumber: row.otNumber,
    partNumber: row.partNumber,
    workOrderNumber: row.workOrderNumber,
    workOrderId: row.workOrderId,
    requestNumber: row.requestNumber,
    items: items.map((line) => ({
      ...line.item,
      materialCode: line.materialCode,
      materialDescription: line.materialDescription,
    })),
    receipts,
  };
}

async function buildItemRows(items: CreatePurchaseOrderInput["items"]) {
  const rows = [];
  for (const [index, item] of items.entries()) {
    const [material] = await db
      .select({
        id: materials.id,
        description: materials.description,
        warehouseId: materials.warehouseId,
        active: materials.active,
      })
      .from(materials)
      .where(eq(materials.id, item.materialId))
      .limit(1);
    if (!material || !material.active) {
      throw new AppError("Hay un material inactivo o inexistente.", "MATERIAL_INVALID", 400);
    }
    const totals = calculateLineTotals({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: 0,
      taxPercent: item.taxPercent,
      estimatedCost: 0,
    });
    rows.push({
      id: crypto.randomUUID(),
      position: index + 1,
      materialId: material.id,
      warehouseId: material.warehouseId,
      description: item.description || material.description,
      quantity: formatQty(item.quantity),
      unitPrice: formatMoney(item.unitPrice, 4),
      taxPercent: formatMoney(item.taxPercent),
      lineSubtotal: formatMoney(totals.lineSubtotal),
      lineTax: formatMoney(totals.lineTax),
      lineTotal: formatMoney(totals.lineTotal),
      totals,
    });
  }
  const header = calculateQuoteTotals(rows.map((row) => row.totals));
  return { rows, header };
}

export async function createPurchaseOrder(
  input: Pick<CreatePurchaseOrderInput, "supplierId" | "items"> &
    Partial<CreatePurchaseOrderInput>,
  actor: Actor,
) {
  const supplier = await getSupplierById(input.supplierId);
  if (!supplier || supplier.deletedAt || supplier.status !== "activo") {
    throw new AppError("Selecciona un proveedor activo.", "SUPPLIER_INVALID", 400);
  }
  const { rows, header } = await buildItemRows(input.items);
  const id = crypto.randomUUID();
  const created = await db.transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, "purchase_orders", yearPrefix("OC-"));
    await tx.insert(purchaseOrders).values({
      id,
      number,
      supplierId: input.supplierId,
      branchId: input.branchId ?? null,
      orderId: input.orderId ?? null,
      purchaseRequestId: input.purchaseRequestId ?? null,
      productionOrderId: input.productionOrderId ?? null,
      ownerUserId: actor.userId,
      issueDate: new Date(),
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      currency: input.currency ?? "mxn",
      paymentTerm: input.paymentTerm ?? "net_30",
      isUrgent: input.isUrgent ?? false,
      urgentReason: input.urgentReason ?? null,
      notes: input.notes ?? null,
      subtotal: formatMoney(header.subtotal),
      taxTotal: formatMoney(header.taxTotal),
      total: formatMoney(header.total),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await tx.insert(purchaseOrderItems).values(
      rows.map((row) => ({
        id: row.id,
        purchaseOrderId: id,
        position: row.position,
        materialId: row.materialId,
        warehouseId: row.warehouseId,
        description: row.description,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        taxPercent: row.taxPercent,
        lineSubtotal: row.lineSubtotal,
        lineTax: row.lineTax,
        lineTotal: row.lineTotal,
      })),
    );
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "purchase_order",
      entityId: id,
      entityLabel: `${number} · ${supplier.legalName}`,
    });
    return { id, number };
  });
  return created;
}

export async function updatePurchaseOrder(input: UpdatePurchaseOrderInput, actor: Actor) {
  const existing = await getPurchaseOrderById(input.id);
  if (!existing) {
    throw new AppError("La orden de compra no existe.", "PO_NOT_FOUND", 404);
  }
  if (!canEditPurchaseOrder(existing.status as PurchaseOrderStatus)) {
    throw new AppError(
      "Solo se puede editar una OC en borrador.",
      "PO_NOT_EDITABLE",
      409,
    );
  }
  const { rows, header } = await buildItemRows(input.items);
  await db.transaction(async (tx) => {
    await tx
      .update(purchaseOrders)
      .set({
        supplierId: input.supplierId,
        branchId: input.branchId ?? null,
        orderId: input.orderId ?? existing.orderId,
        purchaseRequestId: input.purchaseRequestId ?? existing.purchaseRequestId,
        productionOrderId: input.productionOrderId ?? null,
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        currency: input.currency,
        paymentTerm: input.paymentTerm,
        isUrgent: input.isUrgent,
        urgentReason: input.urgentReason ?? null,
        notes: input.notes ?? null,
        subtotal: formatMoney(header.subtotal),
        taxTotal: formatMoney(header.taxTotal),
        total: formatMoney(header.total),
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, input.id));
    await tx
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, input.id));
    await tx.insert(purchaseOrderItems).values(
      rows.map((row) => ({
        id: row.id,
        purchaseOrderId: input.id,
        position: row.position,
        materialId: row.materialId,
        warehouseId: row.warehouseId,
        description: row.description,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        taxPercent: row.taxPercent,
        lineSubtotal: row.lineSubtotal,
        lineTax: row.lineTax,
        lineTotal: row.lineTotal,
      })),
    );
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "purchase_order",
      entityId: input.id,
      entityLabel: existing.number,
    });
  });
}

export async function changePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
  actor: Actor,
) {
  const existing = await getPurchaseOrderById(id);
  if (!existing) {
    throw new AppError("La orden de compra no existe.", "PO_NOT_FOUND", 404);
  }
  const from = existing.status as PurchaseOrderStatus;
  if (!canTransitionPurchaseOrder(from, status)) {
    throw new AppError(
      `No se puede pasar de ${PURCHASE_ORDER_STATUS_LABELS[from]} a ${PURCHASE_ORDER_STATUS_LABELS[status]}.`,
      "PO_INVALID_TRANSITION",
      409,
    );
  }
  await db
    .update(purchaseOrders)
    .set({ status, updatedBy: actor.userId, updatedAt: new Date() })
    .where(eq(purchaseOrders.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action:
      status === "cancelada"
        ? "cancelled"
        : status === "confirmada"
          ? "approved"
          : status === "cerrada"
            ? "closed"
            : "status_changed",
    entityType: "purchase_order",
    entityId: id,
    entityLabel: `${existing.number} (${PURCHASE_ORDER_STATUS_LABELS[from]} → ${PURCHASE_ORDER_STATUS_LABELS[status]})`,
    previousValue: { status: from },
    newValue: { status },
  });
}

export async function receivePurchaseOrder(input: ReceivePurchaseOrderInput, actor: Actor) {
  const existing = await getPurchaseOrderById(input.purchaseOrderId);
  if (!existing) {
    throw new AppError("La orden de compra no existe.", "PO_NOT_FOUND", 404);
  }
  if (!canReceivePurchaseOrder(existing.status as PurchaseOrderStatus)) {
    throw new AppError(
      "Esta OC no admite recepción en su estado actual.",
      "PO_NOT_RECEIVABLE",
      409,
    );
  }
  const lines = input.items.filter((item) => item.quantity > 0);
  if (lines.length === 0) {
    throw new AppError("Indica al menos una cantidad a recibir.", "RECEIPT_EMPTY", 400);
  }

  const receiptId = crypto.randomUUID();
  let number = "";

  await db.transaction(async (tx) => {
    number = await nextDocumentNumber(tx, "purchase_receipts", yearPrefix("REC-"));
    await tx.insert(purchaseReceipts).values({
      id: receiptId,
      number,
      purchaseOrderId: existing.id,
      receivedAt: new Date(),
      notes: input.notes ?? null,
      createdBy: actor.userId,
    });
    await tx.insert(purchaseReceiptItems).values(
      lines.map((line) => {
        const item = existing.items.find((row) => row.id === line.purchaseOrderItemId);
        if (!item) {
          throw new AppError(
            "Hay una partida inválida en la recepción.",
            "PO_ITEM_INVALID",
            400,
          );
        }
        const remaining = parseQty(item.quantity) - parseQty(item.receivedQty);
        if (qtyGt(line.quantity, remaining)) {
          throw new AppError(
            `No puedes recibir más de lo pendiente en ${item.materialCode}.`,
            "RECEIPT_OVER_QTY",
            409,
          );
        }
        return {
          id: crypto.randomUUID(),
          receiptId,
          purchaseOrderItemId: item.id,
          quantity: formatQty(line.quantity),
        };
      }),
    );
  });

  for (const line of lines) {
    const item = existing.items.find((row) => row.id === line.purchaseOrderItemId);
    if (!item) continue;
    await receivePurchaseStock(
      {
        materialId: item.materialId,
        warehouseId: item.warehouseId ?? undefined,
        quantity: formatQty(line.quantity),
        reason: `Recepción ${number} / ${existing.number}`,
        purchaseOrderId: existing.id,
        purchaseReceiptId: receiptId,
      },
      actor,
    );
    const nextReceived = formatQty(parseQty(item.receivedQty) + line.quantity);
    await db
      .update(purchaseOrderItems)
      .set({ receivedQty: nextReceived })
      .where(eq(purchaseOrderItems.id, item.id));
  }

  const refreshed = await getPurchaseOrderById(existing.id);
  if (!refreshed) return { id: receiptId, number };
  const allReceived = refreshed.items.every(
    (item) => !qtyGt(item.quantity, item.receivedQty),
  );
  const nextStatus: PurchaseOrderStatus = allReceived ? "recibida" : "parcial";
  if (refreshed.status !== nextStatus) {
    await db
      .update(purchaseOrders)
      .set({
        status: nextStatus,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, existing.id));
    await recordActivity(db, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "status_changed",
      entityType: "purchase_order",
      entityId: existing.id,
      entityLabel: `${existing.number} (${PURCHASE_ORDER_STATUS_LABELS[existing.status as PurchaseOrderStatus]} → ${PURCHASE_ORDER_STATUS_LABELS[nextStatus]})`,
      previousValue: { status: existing.status },
      newValue: { status: nextStatus, receipt: number },
    });
  }
  return { id: receiptId, number };
}

export async function listSupplierMaterials(supplierId: string) {
  return db
    .select()
    .from(supplierMaterials)
    .where(eq(supplierMaterials.supplierId, supplierId))
    .orderBy(supplierMaterials.position, supplierMaterials.description);
}

export async function listAllSupplierMaterials() {
  return db
    .select({
      id: supplierMaterials.id,
      supplierId: supplierMaterials.supplierId,
      supplierName: suppliers.legalName,
      position: supplierMaterials.position,
      description: supplierMaterials.description,
      grade: supplierMaterials.grade,
      thicknessIn: supplierMaterials.thicknessIn,
      costPerKg: supplierMaterials.costPerKg,
      sheetWidthIn: supplierMaterials.sheetWidthIn,
      sheetLengthIn: supplierMaterials.sheetLengthIn,
      densityGCm3: supplierMaterials.densityGCm3,
      unit: supplierMaterials.unit,
      notes: supplierMaterials.notes,
      active: supplierMaterials.active,
    })
    .from(supplierMaterials)
    .innerJoin(suppliers, eq(suppliers.id, supplierMaterials.supplierId))
    .where(and(eq(supplierMaterials.active, true), isNull(suppliers.deletedAt)))
    .orderBy(suppliers.legalName, supplierMaterials.position);
}

export async function getSupplierMaterialById(id: string) {
  const [row] = await db
    .select()
    .from(supplierMaterials)
    .where(eq(supplierMaterials.id, id))
    .limit(1);
  return row ?? null;
}

async function markSupplierHasMaterials(supplierId: string) {
  await db
    .update(suppliers)
    .set({ usedInCalculator: true, updatedAt: new Date() })
    .where(eq(suppliers.id, supplierId));
}

export async function upsertSupplierMaterial(input: SupplierMaterialInput, actor: Actor) {
  const supplier = await getSupplierById(input.supplierId);
  if (!supplier || supplier.deletedAt) {
    throw new AppError("El proveedor no existe.", "SUPPLIER_NOT_FOUND", 404);
  }

  const now = new Date();
  if (input.id) {
    const existing = await getSupplierMaterialById(input.id);
    if (!existing || existing.supplierId !== input.supplierId) {
      throw new AppError("El material del proveedor no existe.", "SUPPLIER_MATERIAL_NOT_FOUND", 404);
    }
    await db
      .update(supplierMaterials)
      .set({
        description: input.description,
        grade: input.grade ?? null,
        thicknessIn: input.thicknessIn ?? null,
        costPerKg: input.costPerKg ?? null,
        sheetWidthIn: input.sheetWidthIn ?? null,
        sheetLengthIn: input.sheetLengthIn ?? null,
        densityGCm3: input.densityGCm3 ?? null,
        unit: input.unit ?? "kg",
        notes: input.notes ?? null,
        active: input.active ?? true,
        updatedAt: now,
      })
      .where(eq(supplierMaterials.id, existing.id));
    await markSupplierHasMaterials(input.supplierId);
    await recordActivity(db, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "updated",
      entityType: "supplier",
      entityId: input.supplierId,
      entityLabel: `${supplier.code} · material ${input.description}`,
    });
    return { id: existing.id };
  }

  const existingRows = await listSupplierMaterials(input.supplierId);
  const id = crypto.randomUUID();
  await db.insert(supplierMaterials).values({
    id,
    supplierId: input.supplierId,
    position: existingRows.length + 1,
    description: input.description,
    grade: input.grade ?? null,
    thicknessIn: input.thicknessIn ?? null,
    costPerKg: input.costPerKg ?? null,
    sheetWidthIn: input.sheetWidthIn ?? null,
    sheetLengthIn: input.sheetLengthIn ?? null,
    densityGCm3: input.densityGCm3 ?? null,
    unit: input.unit ?? "kg",
    notes: input.notes ?? null,
    active: input.active ?? true,
  });
  await markSupplierHasMaterials(input.supplierId);
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "created",
    entityType: "supplier",
    entityId: input.supplierId,
    entityLabel: `${supplier.code} · material ${input.description}`,
  });
  return { id };
}

export async function deleteSupplierMaterial(id: string, actor: Actor) {
  const existing = await getSupplierMaterialById(id);
  if (!existing) {
    throw new AppError("El material del proveedor no existe.", "SUPPLIER_MATERIAL_NOT_FOUND", 404);
  }
  await db.delete(supplierMaterials).where(eq(supplierMaterials.id, id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "deleted",
    entityType: "supplier",
    entityId: existing.supplierId,
    entityLabel: existing.description,
  });
  return { id };
}

export async function listPurchaseRequests(input?: {
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = resolvePageSize(input?.pageSize);
  const filters = [];
  if (input?.q) {
    const term = `%${input.q}%`;
    const search = or(
      ilike(purchaseRequests.number, term),
      ilike(orders.number, term),
    );
    if (search) filters.push(search);
  }
  const where = filters.length ? and(...filters) : undefined;
  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(purchaseRequests)
    .innerJoin(orders, eq(orders.id, purchaseRequests.orderId))
    .where(where);
  const rows = await db
    .select({
      id: purchaseRequests.id,
      number: purchaseRequests.number,
      status: purchaseRequests.status,
      orderId: purchaseRequests.orderId,
      orderNumber: orders.number,
      createdAt: purchaseRequests.createdAt,
    })
    .from(purchaseRequests)
    .innerJoin(orders, eq(orders.id, purchaseRequests.orderId))
    .where(where)
    .orderBy(desc(purchaseRequests.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const total = Number(countRow?.value ?? 0);
  return {
    rows: rows.map((row) => ({
      ...row,
      workOrderNumber: workOrderNumber(row.orderNumber),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listPurchaseRequestsForOrder(orderId: string) {
  return db
    .select({
      id: purchaseRequests.id,
      number: purchaseRequests.number,
      status: purchaseRequests.status,
      createdAt: purchaseRequests.createdAt,
    })
    .from(purchaseRequests)
    .where(eq(purchaseRequests.orderId, orderId))
    .orderBy(desc(purchaseRequests.createdAt));
}

export async function getPurchaseRequestById(id: string) {
  const [row] = await db
    .select({
      request: purchaseRequests,
      orderNumber: orders.number,
      orderBranchId: orders.branchId,
      orderBranchCode: orderBranches.code,
      orderBranchName: orderBranches.name,
    })
    .from(purchaseRequests)
    .innerJoin(orders, eq(orders.id, purchaseRequests.orderId))
    .leftJoin(orderBranches, eq(orderBranches.id, orders.branchId))
    .where(eq(purchaseRequests.id, id))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select({
      id: purchaseRequestItems.id,
      position: purchaseRequestItems.position,
      materialId: purchaseRequestItems.materialId,
      quantity: purchaseRequestItems.quantity,
      materialCode: materials.code,
      materialDescription: materials.description,
      unitCode: unitsOfMeasure.code,
      costPerKg: materials.costPerKg,
      warehouseName: warehouses.name,
      supplierId: materials.supplierId,
      supplierCode: suppliers.code,
      supplierName: suppliers.legalName,
      paymentTerm: suppliers.paymentTerm,
      materialBranchId: materials.branchId,
      materialBranchCode: materialBranches.code,
      materialBranchName: materialBranches.name,
    })
    .from(purchaseRequestItems)
    .innerJoin(materials, eq(materials.id, purchaseRequestItems.materialId))
    .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, materials.unitId))
    .innerJoin(warehouses, eq(warehouses.id, materials.warehouseId))
    .leftJoin(suppliers, eq(suppliers.id, materials.supplierId))
    .leftJoin(materialBranches, eq(materialBranches.id, materials.branchId))
    .where(eq(purchaseRequestItems.purchaseRequestId, id))
    .orderBy(purchaseRequestItems.position);
  return {
    ...row.request,
    orderNumber: row.orderNumber,
    workOrderNumber: workOrderNumber(row.orderNumber),
    orderBranchId: row.orderBranchId,
    orderBranchCode: row.orderBranchCode,
    orderBranchName: row.orderBranchName,
    items: items.map((item) => ({
      ...item,
      branchId: item.materialBranchId ?? row.orderBranchId,
      branchCode: item.materialBranchCode ?? row.orderBranchCode,
      branchName: item.materialBranchName ?? row.orderBranchName,
    })),
  };
}

export async function createMaterialRequestFromOrder(orderId: string, actor: Actor) {
  const [order] = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      isDemo: orders.isDemo,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) {
    throw new AppError("La orden de trabajo no existe.", "ORDER_NOT_FOUND", 404);
  }
  if (order.status === "cancelado") {
    throw new AppError(
      "No se puede pedir material de una orden cancelada.",
      "ORDER_CANCELLED",
      409,
    );
  }

  const [open] = await db
    .select({ id: purchaseRequests.id, number: purchaseRequests.number })
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.orderId, orderId),
        or(
          eq(purchaseRequests.status, "borrador"),
          eq(purchaseRequests.status, "solicitada"),
        ),
      ),
    )
    .limit(1);
  if (open) {
    throw new AppError(
      `Ya hay una solicitud abierta (${open.number}). Ábrela en Compras.`,
      "REQUEST_ALREADY_OPEN",
      409,
    );
  }

  const lines = await listWorkOrderMaterials(orderId);
  const missing = lines.filter((line) => qtyGt(line.shortage, "0"));
  if (missing.length === 0) {
    throw new AppError(
      "No hay material faltante para pedir. Reserva lo disponible o agrega líneas primero.",
      "NO_SHORTAGE",
      409,
    );
  }

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const number = await nextDocumentNumber(tx, "purchase_requests", yearPrefix("SR-"));
    await tx.insert(purchaseRequests).values({
      id,
      number,
      orderId,
      status: "borrador",
      isDemo: order.isDemo,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await tx.insert(purchaseRequestItems).values(
      missing.map((line, index) => ({
        id: crypto.randomUUID(),
        purchaseRequestId: id,
        position: index + 1,
        materialId: line.materialId,
        quantity: formatQty(line.shortage),
      })),
    );
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "created",
      entityType: "purchase_request",
      entityId: id,
      entityLabel: `${number} · ${workOrderNumber(order.number)}`,
      parentEntityType: "order",
      parentEntityId: orderId,
    });
    return { id, number };
  });

  await applyWorkOrderMaterialWait(orderId, actor);
  return created;
}

function resolvePaymentTerm(value: string | null | undefined): PaymentTerm {
  if (value && (PAYMENT_TERMS as readonly string[]).includes(value)) {
    return value as PaymentTerm;
  }
  return "net_30";
}

export async function convertPurchaseRequestToOrder(
  input: ConvertPurchaseRequestInput,
  actor: Actor,
) {
  const request = await getPurchaseRequestById(input.requestId);
  if (!request) {
    throw new AppError("La solicitud de material no existe.", "REQUEST_NOT_FOUND", 404);
  }
  if (!canConvertPurchaseRequest(request.status as PurchaseRequestStatus)) {
    throw new AppError(
      "Esta solicitud ya no se puede convertir a orden de compra.",
      "REQUEST_NOT_CONVERTIBLE",
      409,
    );
  }
  const missingSupplier = request.items.find((item) => !item.supplierId);
  if (missingSupplier) {
    throw new AppError(
      `${missingSupplier.materialCode} no tiene proveedor. Asígnalo en Inventario antes de crear la OC.`,
      "SUPPLIER_REQUIRED",
      409,
    );
  }

  const groups = new Map<string, typeof request.items>();
  for (const item of request.items) {
    const supplierId = item.supplierId as string;
    const current = groups.get(supplierId) ?? [];
    current.push(item);
    groups.set(supplierId, current);
  }

  const createdOrders: { id: string; number: string }[] = [];
  for (const [supplierId, items] of groups) {
    const first = items[0];
    const created = await createPurchaseOrder(
      {
        supplierId,
        branchId: first.branchId ?? request.orderBranchId ?? undefined,
        orderId: request.orderId,
        purchaseRequestId: request.id,
        currency: "mxn",
        paymentTerm: resolvePaymentTerm(first.paymentTerm),
        isUrgent: false,
        notes: `Solicitud ${request.number} · ${request.workOrderNumber}`,
        items: items.map((item) => ({
          materialId: item.materialId,
          description: `${item.materialCode} · ${item.materialDescription}`,
          quantity: Number(item.quantity),
          unitPrice: item.costPerKg ? Number(item.costPerKg) : 0,
          taxPercent: 16,
        })),
      },
      actor,
    );
    createdOrders.push(created);
  }

  await db
    .update(purchaseRequests)
    .set({
      status: "convertida",
      updatedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(purchaseRequests.id, request.id));
  await recordActivity(db, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: "converted",
    entityType: "purchase_request",
    entityId: request.id,
    entityLabel: `${request.number} → ${createdOrders.map((row) => row.number).join(", ")}`,
    parentEntityType: "order",
    parentEntityId: request.orderId,
  });
  if (createdOrders.length === 0) {
    throw new AppError(
      "La solicitud no tiene partidas para convertir.",
      "REQUEST_EMPTY",
      409,
    );
  }
  return createdOrders;
}
