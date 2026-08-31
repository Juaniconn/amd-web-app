import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "ebay-automation", "src", "data");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");

function loadInventory(): any[] {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(INVENTORY_FILE, "utf-8"));
}

// GET: Obtener órdenes simuladas
export async function GET(req: NextRequest) {
  try {
    const items = loadInventory();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search")?.toLowerCase() || "";

    // Generate mock orders from published items
    const publishedItems = items
      .map((item: any, index: number) => ({ ...item, originalIndex: index }))
      .filter((item: any) => item.status === "published");

    const orders = publishedItems.slice(0, 5).map((item: any, index: number) => ({
      id: `ORD-${1000 + index}`,
      itemId: item.originalIndex,
      productTitle: `${item.producto} ${item.fabricante} ${item.modelo}`,
      productSku: item.modelo || `SKU-${index}`,
      buyerName: `Buyer ${index + 1}`,
      buyerEmail: `buyer${index + 1}@example.com`,
      quantity: Math.min(item.cantidad, Math.floor(Math.random() * 3) + 1),
      unitPrice: item.precio || 0,
      totalPrice: (item.precio || 0) * Math.min(item.cantidad, 2),
      status: index % 3 === 0 ? "pending" : index % 3 === 1 ? "shipped" : "delivered",
      shippingAddress: `${100 + index} Main St, City, ST 12345`,
      orderDate: new Date(Date.now() - index * 86400000).toISOString(),
      trackingNumber: index % 3 !== 0 ? `TRK${100000 + index}` : null,
    }));

    let filtered = orders;
    if (status) {
      filtered = filtered.filter((o: any) => o.status === status);
    }
    if (search) {
      filtered = filtered.filter(
        (o: any) =>
          o.productTitle.toLowerCase().includes(search) ||
          o.productSku.toLowerCase().includes(search) ||
          o.buyerName.toLowerCase().includes(search)
      );
    }

    const stats = {
      total: orders.length,
      pending: orders.filter((o: any) => o.status === "pending").length,
      shipped: orders.filter((o: any) => o.status === "shipped").length,
      delivered: orders.filter((o: any) => o.status === "delivered").length,
      revenue: orders.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0),
    };

    return NextResponse.json({ orders: filtered, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Actualizar estado de orden
export async function POST(req: NextRequest) {
  try {
    const { orderId, action } = await req.json();

    if (action === "mark_shipped") {
      return NextResponse.json({
        success: true,
        message: `Orden ${orderId} marcada como enviada`,
      });
    }

    if (action === "refund") {
      return NextResponse.json({
        success: true,
        message: `Reembolso procesado para orden ${orderId}`,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
