import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "ebay-automation", "src", "data");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");

function loadInventory(): any[] {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(INVENTORY_FILE, "utf-8"));
}

function saveInventory(items: any[]) {
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(items, null, 2));
}

// GET: Obtener un producto específico por ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = parseInt(id);

    if (isNaN(index)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const items = loadInventory();

    if (index < 0 || index >= items.length) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const item = items[index];
    const product = {
      id: index,
      imagen: item.imagen,
      producto: item.producto,
      fabricante: item.fabricante,
      modelo: item.modelo,
      cantidad: item.cantidad || 1,
      categoria: item.categoria,
      precio: item.precio || 0,
      sku: item.sku || item.modelo || `SKU-${index}`,
      status: item.status || "draft",
      createdAt: item.createdAt || null,
      offerId: item.offerId || null,
      publishedAt: item.publishedAt || null,
    };

    return NextResponse.json({ product, index });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar un producto específico
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = parseInt(id);

    if (isNaN(index)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const items = loadInventory();

    if (index < 0 || index >= items.length) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const updatedItem = {
      ...items[index],
      producto: body.producto || body.title || items[index].producto,
      fabricante: body.fabricante || body.manufacturer || items[index].fabricante,
      modelo: body.modelo || body.model || items[index].modelo,
      cantidad: body.cantidad ?? body.quantity ?? items[index].cantidad,
      precio: body.precio ?? body.price ?? items[index].precio,
      categoria: body.categoria || body.category || items[index].categoria,
      imagen: body.imagen || body.image || items[index].imagen,
      sku: body.sku || items[index].sku || items[index].modelo,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updatedItem;
    saveInventory(items);

    return NextResponse.json({ success: true, item: updatedItem, index });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un producto específico
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = parseInt(id);

    if (isNaN(index)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const items = loadInventory();

    if (index < 0 || index >= items.length) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const deleted = items.splice(index, 1)[0];
    saveInventory(items);

    return NextResponse.json({ success: true, deleted, newLength: items.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
