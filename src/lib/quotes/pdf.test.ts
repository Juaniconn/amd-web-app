import { describe, expect, it } from "vitest";
import { generateQuotePdf } from "./pdf";

describe("quote PDF", () => {
  it("builds a PDF with header, items and totals", async () => {
    const bytes = await generateQuotePdf({
      number: "COT-2026-00001",
      status: "enviada",
      rfqType: "solo_fabricacion",
      customerName: "Cliente Demo",
      customerCode: "CLI-2026-00001",
      contactName: "Ana",
      contactPhone: "6560000000",
      contactTitle: "Buyer",
      contactDepartment: "Compras",
      addresseeMode: "nombre",
      currency: "mxn",
      issueDate: new Date("2026-08-14T12:00:00Z"),
      validUntil: new Date("2026-09-14T12:00:00Z"),
      paymentTerm: "net_30",
      paymentTerms: "30 días",
      leadTime: "10 dias",
      notes: "Placas CNC.",
      subtotal: "1000.00",
      taxTotal: "160.00",
      total: "1160.00",
      items: [
        {
          position: 1,
          description: "Placa aluminio",
          partNumber: "JT103910",
          quantity: "13",
          unit: "pza",
          unitPrice: "100.00",
          lineSubtotal: "1300.00",
          lineTax: "208.00",
          lineTotal: "1508.00",
        },
      ],
      branchName: "AMD México — Ciudad Juárez",
      branchCode: "CJS",
      branchAddress: null,
      branchCity: "Ciudad Juárez",
      branchState: "Chihuahua",
      branchCountry: "México",
      branchPostalCode: null,
      branchPhone: null,
      branchEmail: null,
      branchRfc: null,
      shippingAddress: "Planta A",
      shippingCity: "Ciudad Juárez",
      shippingState: "Chihuahua",
      shippingPostalCode: null,
      shippingCountry: "México",
    });
    expect(bytes.byteLength).toBeGreaterThan(200);
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
  });
});
