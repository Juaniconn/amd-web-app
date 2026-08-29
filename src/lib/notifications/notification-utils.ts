export type NotificationType = "status_change" | "part_assigned" | "missing_material" | "pending_inspection";

export function formatNotificationTitle(type: NotificationType, data: Record<string, string>): string {
  switch (type) {
    case "status_change":
      return `${data.otNumber} cambió a ${data.newStatus}`;
    case "part_assigned":
      return `${data.partNumber} asignado a ${data.operatorName}`;
    case "missing_material":
      return `Material faltante: ${data.materialName} en ${data.otNumber}`;
    case "pending_inspection":
      return `Inspección pendiente: ${data.partNumber}`;
    default:
      return "Notificación";
  }
}

export function formatNotificationDescription(type: NotificationType, data: Record<string, string>): string {
  switch (type) {
    case "status_change":
      return `Estado anterior: ${data.oldStatus} → Nuevo: ${data.newStatus}`;
    case "part_assigned":
      return `La parte ${data.partNumber} fue asignada al operador ${data.operatorName}`;
    case "missing_material":
      return `El material ${data.materialName} es requerido para la orden ${data.otNumber}`;
    case "pending_inspection":
      return `La parte ${data.partNumber} requiere inspección de calidad`;
    default:
      return "";
  }
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "status_change":
      return "refresh-cw";
    case "part_assigned":
      return "user-check";
    case "missing_material":
      return "alert-triangle";
    case "pending_inspection":
      return "search";
    default:
      return "bell";
  }
}

export function sortNotificationsByDate<T extends { createdAt: string }>(notifications: T[]): T[] {
  return [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function filterUnreadNotifications<T extends { read: boolean }>(notifications: T[]): T[] {
  return notifications.filter((n) => !n.read);
}