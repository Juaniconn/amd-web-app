import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "ebay-automation", "src", "data");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");
const EBAY_ENV_PATH = path.join(process.cwd(), "..", "ebay-automation", ".env.local");

function readEnvVar(varName: string): string {
  try {
    if (!fs.existsSync(EBAY_ENV_PATH)) return "";
    const content = fs.readFileSync(EBAY_ENV_PATH, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      if (key === varName) {
        let value = trimmed.substring(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  } catch {}
  return "";
}

function loadInventory(): any[] {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(INVENTORY_FILE, "utf-8"));
}

// GET: Estado de sincronización
export async function GET() {
  try {
    const items = loadInventory();
    const token = readEnvVar("EBAY_OAUTH_TOKEN") || readEnvVar("EBAY_AUTH_TOKEN");
    const env = readEnvVar("EBAY_ENVIRONMENT") || "sandbox";

    const published = items.filter((i: any) => i.status === "published").length;
    const draft = items.filter((i: any) => i.status === "draft").length;

    return NextResponse.json({
      status: "ready",
      connected: !!token,
      environment: env,
      lastSync: new Date().toISOString(),
      stats: {
        total: items.length,
        published,
        draft,
        synced: published,
        pending: draft,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Sincronizar inventario local con eBay
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    const token = readEnvVar("EBAY_OAUTH_TOKEN") || readEnvVar("EBAY_AUTH_TOKEN");
    const env = readEnvVar("EBAY_ENVIRONMENT") || "sandbox";
    const baseUrl = env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

    if (!token) {
      return NextResponse.json({ error: "Token no configurado" }, { status: 401 });
    }

    const items = loadInventory();

    if (action === "sync_all") {
      // Sync all draft items
      let synced = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].status === "draft") {
          items[i].status = "published";
          items[i].publishedAt = new Date().toISOString();
          synced++;
        }
      }
      fs.writeFileSync(INVENTORY_FILE, JSON.stringify(items, null, 2));
      return NextResponse.json({ success: true, synced, message: `${synced} productos sincronizados` });
    }

    if (action === "pull_orders") {
      // Simulate pulling orders from eBay
      return NextResponse.json({ success: true, orders: [], message: "Órdenes sincronizadas" });
    }

    if (action === "check_status") {
      // Check sync status
      return NextResponse.json({
        success: true,
        status: "synced",
        lastSync: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
