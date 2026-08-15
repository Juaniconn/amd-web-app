export const PROJECT_STATUSES = [
  "planeacion",
  "activo",
  "pausado",
  "completado",
  "cancelado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planeacion: "Planeación",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planeacion: ["activo", "cancelado"],
  activo: ["pausado", "completado", "cancelado"],
  pausado: ["activo", "cancelado"],
  completado: [],
  cancelado: [],
};

export const OPEN_PROJECT_STATUSES: ProjectStatus[] = [
  "planeacion",
  "activo",
  "pausado",
];

export function canTransitionProject(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertProjectTransition(from: ProjectStatus, to: ProjectStatus) {
  if (!canTransitionProject(from, to)) {
    throw new Error(
      `No se puede cambiar un proyecto de ${PROJECT_STATUS_LABELS[from]} a ${PROJECT_STATUS_LABELS[to]}.`,
    );
  }
}

export function canEditProject(status: ProjectStatus): boolean {
  return status !== "completado" && status !== "cancelado";
}

export function permissionForProjectTransition(
  to: ProjectStatus,
): "projects:update" | "projects:close" | "projects:cancel" {
  if (to === "completado") return "projects:close";
  if (to === "cancelado") return "projects:cancel";
  return "projects:update";
}
