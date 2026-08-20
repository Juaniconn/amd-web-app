export const OFFICIAL_BRANCH_IDS = {
  cjs: "amd-branch-cjs",
  gdl: "amd-branch-gdl",
  elp: "amd-branch-elp",
} as const;

export const BRANCH_STATUSES = ["activo", "inactivo"] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export type BranchSnapshot = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
};

export function formatBranchAddress(branch: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  return [
    branch.address,
    [branch.city, branch.state].filter(Boolean).join(", "),
    branch.postalCode,
    branch.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}
