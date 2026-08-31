import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "ebay-automation", "src", "data");

function loadInventory() {
  const consolidatedPath = path.join(DATA_DIR, "inventory.json");
  if (fs.existsSync(consolidatedPath)) {
    return JSON.parse(fs.readFileSync(consolidatedPath, "utf-8"));
  }
  return [];
}

export async function GET(req: NextRequest) {
  const items = loadInventory();
  
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  
  let filtered = items;
  if (search) {
    filtered = items.filter(
      (p: any) =>
        p.producto.toLowerCase().includes(search) ||
        p.fabricante.toLowerCase().includes(search) ||
        p.modelo.toLowerCase().includes(search)
    );
  }

  const totalCajas = items.length;
  const conQty = items.filter((i: any) => i.cantidad && String(i.cantidad).match(/^\d+$/));
  const totalUnidades = conQty.reduce((sum: number, i: any) => sum + parseInt(i.cantidad), 0);
  const sinQty = totalCajas - conQty.length;
  const valorTotal = items.reduce((sum: number, i: any) => sum + (i.precio || 0) * (i.cantidad || 1), 0);

  const byMfr: Record<string, number> = {};
  for (const item of items) {
    const mfr = item.fabricante || "No visible";
    byMfr[mfr] = (byMfr[mfr] || 0) + 1;
  }

  return NextResponse.json({
    items: filtered,
    stats: {
      totalCajas,
      totalUnidades: totalUnidades + sinQty,
      valorTotal,
      byManufacturer: Object.entries(byMfr)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    },
  });
}