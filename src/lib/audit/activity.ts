export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "primary_contact_changed",
] as const;

export const ACTIVITY_ENTITY_TYPES = ["customer", "contact"] as const;

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
