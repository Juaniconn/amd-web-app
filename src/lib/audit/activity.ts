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
      return `${who} convirtió la cotización ${label} en pedido.`;
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
    if (action === "created") return `${who} creó el pedido ${label}.`;
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
