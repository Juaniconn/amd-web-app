export const DEFAULT_TAX_PERCENT = 16;
export const MONEY_SCALE = 2;

export type QuoteLineInput = {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  estimatedCost: number;
};

export type QuoteLineTotals = {
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  lineEstimatedCost: number;
  lineProfit: number;
  lineMarginPercent: number | null;
};

export type QuoteHeaderTotals = {
  subtotal: number;
  taxTotal: number;
  total: number;
  estimatedCost: number;
  estimatedProfit: number;
  marginPercent: number | null;
};

export function roundMoney(value: number, scale = MONEY_SCALE): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** scale;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number, scale = MONEY_SCALE): string {
  return roundMoney(value, scale).toFixed(scale);
}

export function calculateLineTotals(input: QuoteLineInput): QuoteLineTotals {
  const quantity = Math.max(0, input.quantity);
  const unitPrice = Math.max(0, input.unitPrice);
  const discountPercent = Math.min(100, Math.max(0, input.discountPercent));
  const taxPercent = Math.max(0, input.taxPercent);
  const estimatedCost = Math.max(0, input.estimatedCost);

  const lineSubtotal = roundMoney(
    quantity * unitPrice * (1 - discountPercent / 100),
  );
  const lineTax = roundMoney(lineSubtotal * (taxPercent / 100));
  const lineTotal = roundMoney(lineSubtotal + lineTax);
  const lineEstimatedCost = roundMoney(quantity * estimatedCost);
  const lineProfit = roundMoney(lineSubtotal - lineEstimatedCost);
  const lineMarginPercent =
    lineSubtotal === 0 ? null : roundMoney((lineProfit / lineSubtotal) * 100);

  return {
    lineSubtotal,
    lineTax,
    lineTotal,
    lineEstimatedCost,
    lineProfit,
    lineMarginPercent,
  };
}

export function calculateQuoteTotals(
  lines: QuoteLineTotals[],
): QuoteHeaderTotals {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineSubtotal, 0),
  );
  const taxTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineTax, 0),
  );
  const total = roundMoney(subtotal + taxTotal);
  const estimatedCost = roundMoney(
    lines.reduce((sum, line) => sum + line.lineEstimatedCost, 0),
  );
  const estimatedProfit = roundMoney(subtotal - estimatedCost);
  const marginPercent =
    subtotal === 0 ? null : roundMoney((estimatedProfit / subtotal) * 100);

  return {
    subtotal,
    taxTotal,
    total,
    estimatedCost,
    estimatedProfit,
    marginPercent,
  };
}
