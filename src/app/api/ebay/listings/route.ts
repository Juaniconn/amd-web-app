import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "ebay-automation", "src", "data");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");

function loadInventory(): any[] {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(INVENTORY_FILE, "utf-8"));
}

// GET: Obtener listados publicados
export async function GET(req: NextRequest) {
  try {
    const items = loadInventory();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search")?.toLowerCase() || "";

    let listings = items.map((item: any, index: number) => ({
      id: index,
      sku: item.modelo || `SKU-${index}`,
      title: `${item.producto} ${item.fabricante} ${item.modelo}`,
      description: `${item.producto} - ${item.fabricante} ${item.modelo}. ${item.categoria}`,
      price: item.precio || 0,
      quantity: item.cantidad || 1,
      category: item.categoria,
      manufacturer: item.fabricante,
      model: item.modelo,
      image: item.imagen,
      status: item.status || "draft",
      views: item.views || 0,
      watchers: item.watchers || 0,
      offerId: item.offerId || null,
      publishedAt: item.publishedAt || null,
    }));

    if (status) {
      listings = listings.filter((l: any) => l.status === status);
    }

    if (search) {
      listings = listings.filter(
        (l: any) =>
          l.title.toLowerCase().includes(search) ||
          l.sku.toLowerCase().includes(search) ||
          l.manufacturer.toLowerCase().includes(search)
      );
    }

    const stats = {
      total: listings.length,
      draft: listings.filter((l: any) => l.status === "draft").length,
      published: listings.filter((l: any) => l.status === "published").length,
      ended: listings.filter((l: any) => l.status === "ended").length,
    };

    return NextResponse.json({ listings, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Publicar un listado en eBay
export async function POST(req: NextRequest) {
  try {
    const { listingId, action } = await req.json();

    if (action === "publish") {
      const items = loadInventory();
      const item = items[listingId];

      if (!item) {
        return NextResponse.json({ error: "Listado no encontrado" }, { status: 404 });
      }

      // Update status to published
      items[listingId].status = "published";
      items[listingId].publishedAt = new Date().toISOString();
      fs.writeFileSync(INVENTORY_FILE, JSON.stringify(items, null, 2));

      return NextResponse.json({
        success: true,
        message: "Listado publicado exitosamente",
        listing: {
          id: listingId,
          status: "published",
          title: `${item.producto} ${item.fabricante} ${item.modelo}`,
        },
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
