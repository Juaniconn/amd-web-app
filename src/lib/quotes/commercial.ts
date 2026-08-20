export const PAYMENT_TERMS = [
  "net_15",
  "net_30",
  "net_45",
  "net_60",
  "net_90",
  "net_120",
] as const;

export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

export const PAYMENT_TERM_LABELS: Record<PaymentTerm, string> = {
  net_15: "15 días",
  net_30: "30 días",
  net_45: "45 días",
  net_60: "60 días",
  net_90: "90 días",
  net_120: "120 días",
};

export const PAYMENT_TERM_DAYS: Record<PaymentTerm, number> = {
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
  net_90: 90,
  net_120: 120,
};

export const ADDRESSEE_MODES = ["nombre", "departamento"] as const;
export type AddresseeMode = (typeof ADDRESSEE_MODES)[number];

export const ADDRESSEE_MODE_LABELS: Record<AddresseeMode, string> = {
  nombre: "Nombre completo del contacto",
  departamento: "Departamento o cargo",
};

export const TAX_PERCENTS = [0, 8, 16] as const;
export type TaxPercent = (typeof TAX_PERCENTS)[number];

export function isAllowedTaxPercent(value: number): value is TaxPercent {
  return (TAX_PERCENTS as readonly number[]).includes(value);
}

export function defaultTaxPercent(currency: string): TaxPercent {
  return currency.toLowerCase() === "usd" ? 0 : 16;
}

export function resolveAddressee(input: {
  mode: AddresseeMode | string | null | undefined;
  name: string | null | undefined;
  department: string | null | undefined;
  title: string | null | undefined;
  phone: string | null | undefined;
}) {
  const mode = input.mode === "departamento" ? "departamento" : "nombre";
  if (mode === "departamento") {
    const label = input.department?.trim() || input.title?.trim() || "";
    return {
      mode,
      line: label,
      phone: input.phone?.trim() || null,
    };
  }
  return {
    mode,
    line: input.name?.trim() || "",
    phone: input.phone?.trim() || null,
  };
}

export function formatShippingAddress(input: {
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}) {
  const address = input.shippingAddress || input.address;
  const city = input.shippingCity || input.city;
  const state = input.shippingState || input.state;
  const postal = input.shippingPostalCode;
  const country = input.shippingCountry || input.country;
  return [address, [city, state].filter(Boolean).join(", "), postal, country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}
