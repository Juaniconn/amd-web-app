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

// GET: Obtener todos los productos
export async function GET(req: NextRequest) {
  try {
    const items = loadInventory();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const sku = searchParams.get("sku")?.toLowerCase() || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";
    const manufacturer = searchParams.get("manufacturer") || "";

    let filtered = items;
    if (search) {
      filtered = filtered.filter(
        (p: any) =>
          p.producto?.toLowerCase().includes(search) ||
          p.fabricante?.toLowerCase().includes(search) ||
          p.modelo?.toLowerCase().includes(search) ||
          p.categoria?.toLowerCase().includes(search)
      );
    }
    if (sku) {
      filtered = filtered.filter(
        (p: any) => p.modelo?.toLowerCase().includes(sku) || p.sku?.toLowerCase().includes(sku)
      );
    }
    if (status) {
      filtered = filtered.filter((p: any) => (p.status || "draft") === status);
    }
    if (category) {
      filtered = filtered.filter((p: any) => p.categoria === category);
    }
    if (manufacturer) {
      filtered = filtered.filter((p: any) => p.fabricante === manufacturer);
    }

    const products = filtered.map((item: any, index: number) => ({
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
    }));

    return NextResponse.json({ products, total: products.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo producto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = body.title || body.producto;
    const price = body.price ?? body.precio;
    const quantity = body.quantity ?? body.cantidad;

    if (!title) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    }
    if (price === undefined || price === null || isNaN(parseFloat(price))) {
      return NextResponse.json({ error: "El precio es requerido" }, { status: 400 });
    }
    if (!quantity || isNaN(parseInt(quantity))) {
      return NextResponse.json({ error: "La cantidad es requerida" }, { status: 400 });
    }

    let sku = body.sku || body.modelo;
    if (!sku) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const prefix = (body.manufacturer || body.fabricante || "PRD").substring(0, 3).toUpperCase();
      sku = `${prefix}-${timestamp}`;
    }

    const newItem = {
      imagen: body.imagen || body.image || "placeholder.jpg",
      producto: title,
      fabricante: body.manufacturer || body.fabricante || "",
      modelo: body.model || body.modelo || sku,
      cantidad: parseInt(quantity) || 1,
      categoria: body.category || body.categoria || "Industrial",
      precio: parseFloat(price) || 0,
      sku: sku,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    const items = loadInventory();
    items.push(newItem);
    saveInventory(items);

    return NextResponse.json({
      success: true,
      item: newItem,
      id: items.length - 1,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar producto por índice en query param
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id === null) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const items = loadInventory();
    const index = parseInt(id);

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

// DELETE: Eliminar producto por índice
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id === null) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const items = loadInventory();
    const index = parseInt(id);

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
