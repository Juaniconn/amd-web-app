export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "primary_contact_changed",
  "status_changed",
  "sent",
  "converted",
  "expired",
  "assigned",
  "approved",
  "released",
  "cancelled",
  "hours_logged",
  "scheduled",
  "closed",
  "downtime_logged",
  "rework_logged",
  "stock_moved",
] as const;

export const ACTIVITY_ENTITY_TYPES = [
  "customer",
  "contact",
  "quote",
  "quote_item",
  "document",
  "order",
  "engineering_request",
  "engineering_hours",
  "production_order",
  "machine",
  "work_center",
  "production_route",
  "machine_hours",
  "labor_hours",
  "production_downtime",
  "production_rework",
  "material",
  "inventory_movement",
  "warehouse",
  "project",
  "branch",
  "supplier",
  "purchase_order",
  "purchase_request",
  "quality_inspection",
  "ncr",
  "delivery",
  "invoice",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export type ActivitySummaryInput = {
  actorName: string | null;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityLabel: string;
};

export function activitySummary({
  actorName,
  action,
  entityType,
  entityLabel,
}: ActivitySummaryInput): string {
  const who = actorName?.trim() || "Sistema";
  const label = entityLabel.trim() || "registro";

  if (entityType === "customer") {
    if (action === "created") return `${who} creó el cliente ${label}.`;
    if (action === "updated") return `${who} actualizó el cliente ${label}.`;
    if (action === "deleted") return `${who} archivó el cliente ${label}.`;
  }

  if (entityType === "contact") {
    if (action === "created") return `${who} agregó el contacto ${label}.`;
    if (action === "updated") return `${who} actualizó el contacto ${label}.`;
    if (action === "deleted") return `${who} archivó el contacto ${label}.`;
    if (action === "primary_contact_changed") {
      return `${who} marcó a ${label} como contacto principal.`;
    }
  }

  if (entityType === "quote") {
    if (action === "created") return `${who} creó la cotización ${label}.`;
    if (action === "updated") return `${who} actualizó la cotización ${label}.`;
    if (action === "deleted") return `${who} archivó la cotización ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la cotización ${label}.`;
    }
    if (action === "sent") return `${who} marcó la cotización ${label} como enviada.`;
    if (action === "converted") {
      return `${who} convirtió la cotización ${label} en orden de trabajo.`;
    }
    if (action === "expired") {
      return `${who} marcó la cotización ${label} como expirada.`;
    }
  }

  if (entityType === "quote_item") {
    if (action === "created") return `${who} agregó la partida ${label}.`;
    if (action === "updated") return `${who} actualizó la partida ${label}.`;
    if (action === "deleted") return `${who} eliminó la partida ${label}.`;
  }

  if (entityType === "document") {
    if (action === "created") return `${who} adjuntó el archivo ${label}.`;
    if (action === "deleted") return `${who} eliminó el archivo ${label}.`;
  }

  if (entityType === "order") {
    if (action === "created") return `${who} creó la orden de trabajo ${label}.`;
    if (action === "updated") return `${who} actualizó la orden de trabajo ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la orden de trabajo ${label}.`;
    }
    if (action === "approved") return `${who} aprobó la orden de trabajo ${label}.`;
    if (action === "cancelled") return `${who} canceló la orden de trabajo ${label}.`;
    if (action === "closed") return `${who} completó la orden de trabajo ${label}.`;
  }

  if (entityType === "project") {
    if (action === "created") return `${who} creó el proyecto ${label}.`;
    if (action === "updated") return `${who} actualizó el proyecto ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado del proyecto ${label}.`;
    }
    if (action === "closed") return `${who} cerró el proyecto ${label}.`;
    if (action === "cancelled") return `${who} canceló el proyecto ${label}.`;
  }

  if (entityType === "branch") {
    if (action === "created") return `${who} creó la sucursal ${label}.`;
    if (action === "updated") return `${who} actualizó la sucursal ${label}.`;
    if (action === "deleted") return `${who} archivó la sucursal ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estatus de la sucursal ${label}.`;
    }
  }

  if (entityType === "engineering_request") {
    if (action === "created") return `${who} creó la solicitud de ingeniería ${label}.`;
    if (action === "updated") return `${who} actualizó la solicitud de ingeniería ${label}.`;
    if (action === "deleted") return `${who} archivó la solicitud de ingeniería ${label}.`;
    if (action === "assigned") return `${who} asignó la solicitud de ingeniería ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la solicitud de ingeniería ${label}.`;
    }
    if (action === "approved") return `${who} aprobó la solicitud de ingeniería ${label}.`;
    if (action === "released") return `${who} liberó la solicitud de ingeniería ${label}.`;
    if (action === "cancelled") return `${who} canceló la solicitud de ingeniería ${label}.`;
  }

  if (entityType === "engineering_hours") {
    if (action === "hours_logged" || action === "created") {
      return `${who} registró horas de ingeniería en ${label}.`;
    }
    if (action === "deleted") return `${who} eliminó horas de ingeniería de ${label}.`;
  }

  if (entityType === "production_order") {
    if (action === "created") return `${who} creó la orden de trabajo ${label}.`;
    if (action === "updated") return `${who} actualizó la orden de trabajo ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la orden de trabajo ${label}.`;
    }
    if (action === "assigned") return `${who} asignó recursos a la orden de trabajo ${label}.`;
    if (action === "scheduled") return `${who} programó la orden de trabajo ${label}.`;
    if (action === "cancelled") return `${who} canceló la orden de trabajo ${label}.`;
    if (action === "released") return `${who} liberó la orden de trabajo ${label}.`;
    if (action === "closed") return `${who} cerró la orden de trabajo ${label}.`;
  }

  if (entityType === "machine") {
    if (action === "created") return `${who} registró la máquina ${label}.`;
    if (action === "updated") return `${who} actualizó la máquina ${label}.`;
  }

  if (entityType === "work_center") {
    if (action === "created") return `${who} registró el centro de trabajo ${label}.`;
    if (action === "updated") return `${who} actualizó el centro de trabajo ${label}.`;
  }

  if (entityType === "production_route") {
    if (action === "created") return `${who} registró la ruta ${label}.`;
    if (action === "updated") return `${who} actualizó la ruta ${label}.`;
  }

  if (entityType === "machine_hours") {
    if (action === "hours_logged" || action === "created") {
      return `${who} registró horas máquina en ${label}.`;
    }
  }

  if (entityType === "labor_hours") {
    if (action === "hours_logged" || action === "created") {
      return `${who} registró horas hombre en ${label}.`;
    }
  }

  if (entityType === "production_downtime") {
    if (action === "downtime_logged" || action === "created") {
      return `${who} registró tiempo muerto en ${label}.`;
    }
  }

  if (entityType === "production_rework") {
    if (action === "rework_logged" || action === "created") {
      return `${who} registró un retrabajo en ${label}.`;
    }
    if (action === "released") return `${who} liberó el retrabajo ${label}.`;
  }

  if (entityType === "material") {
    if (action === "created") return `${who} creó el material ${label}.`;
    if (action === "updated") return `${who} actualizó el material ${label}.`;
  }

  if (entityType === "inventory_movement") {
    if (action === "stock_moved" || action === "created") {
      return `${who} registró un movimiento de inventario en ${label}.`;
    }
  }

  if (entityType === "supplier") {
    if (action === "created") return `${who} creó el proveedor ${label}.`;
    if (action === "updated") return `${who} actualizó el proveedor ${label}.`;
    if (action === "deleted") return `${who} archivó el proveedor ${label}.`;
  }

  if (entityType === "purchase_request") {
    if (action === "created") return `${who} creó la solicitud de material ${label}.`;
    if (action === "updated") return `${who} actualizó la solicitud de material ${label}.`;
    if (action === "converted") return `${who} convirtió la solicitud de material ${label}.`;
    if (action === "cancelled") return `${who} canceló la solicitud de material ${label}.`;
  }

  if (entityType === "purchase_order") {
    if (action === "created") return `${who} creó la orden de compra ${label}.`;
    if (action === "updated") return `${who} actualizó la orden de compra ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la orden de compra ${label}.`;
    }
    if (action === "approved") return `${who} confirmó la orden de compra ${label}.`;
    if (action === "cancelled") return `${who} canceló la orden de compra ${label}.`;
    if (action === "closed") return `${who} cerró la orden de compra ${label}.`;
  }

  if (entityType === "quality_inspection") {
    if (action === "created") return `${who} registró la inspección ${label}.`;
  }

  if (entityType === "ncr") {
    if (action === "created") return `${who} abrió el NCR ${label}.`;
    if (action === "status_changed") return `${who} cambió el estado del NCR ${label}.`;
    if (action === "closed") return `${who} cerró el NCR ${label}.`;
    if (action === "cancelled") return `${who} canceló el NCR ${label}.`;
  }

  if (entityType === "delivery") {
    if (action === "created") return `${who} creó la entrega ${label}.`;
    if (action === "updated") return `${who} actualizó la entrega ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la entrega ${label}.`;
    }
    if (action === "closed") return `${who} confirmó la entrega ${label}.`;
  }

  if (entityType === "invoice") {
    if (action === "created") return `${who} creó la factura ${label}.`;
    if (action === "status_changed") {
      return `${who} cambió el estado de la factura ${label}.`;
    }
    if (action === "closed") return `${who} registró un pago en la factura ${label}.`;
    if (action === "cancelled") return `${who} canceló la factura ${label}.`;
  }

  return `${who} registró ${action} sobre ${label}.`;
}

export function pickChangedFields(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
) {
  const previousValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    const before = previous[key] ?? null;
    const after = next[key] ?? null;
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      previousValue[key] = before;
      newValue[key] = after;
    }
  }

  return { previousValue, newValue };
}
