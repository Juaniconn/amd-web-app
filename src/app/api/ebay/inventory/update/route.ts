import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const INVENTORY_PATH = path.join(process.cwd(), "public", "inventory-ebay.json");

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, brand, partNumber, quantity, estimatedPriceUSD, ebayCategory, ebayCategoryId, origin, image, description, keywords } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const items = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf-8"));
    const index = items.findIndex((p: any) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    items[index] = {
      ...items[index],
      brand,
      partNumber,
      quantity,
      estimatedPriceUSD,
      ebayCategory,
      ebayCategoryId,
      origin,
      image,
      description,
      keywords,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(items, null, 2));
    return NextResponse.json({ success: true, item: items[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
