import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EBAY_ENV_PATH = path.join(process.cwd(), "..", "ebay-automation", ".env.local");
const EBAY_DATA_DIR = path.join(process.cwd(), "..", "ebay-automation", "src", "data");

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

function getEbayOAuthToken(): string {
  return readEnvVar("EBAY_OAUTH_TOKEN") || readEnvVar("EBAY_AUTH_TOKEN");
}

function getEbayApiBaseUrl(): string {
  const env = readEnvVar("EBAY_ENVIRONMENT") || "sandbox";
  return env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}

function loadItemsForPublishing() {
  const filePath = path.join(EBAY_DATA_DIR, "inventory.json");
  if (!fs.existsSync(filePath)) return [];
  const items = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return items.map((item: any) => ({
    sku: item.modelo || `SKU-${item.imagen.replace(".jpg", "")}`,
    title: `${item.producto} ${item.fabricante} ${item.modelo}`.trim(),
    description: `${item.producto} - ${item.fabricante} ${item.modelo}. ${item.categoria}. Producto nuevo en su empaque original.`,
    price: item.precio || 35.00,
    quantity: item.cantidad || 1,
    condition: "new",
    category: item.categoria || "Industrial",
    image: item.imagen,
    manufacturer: item.fabricante,
    model: item.modelo,
  }));
}

function createInventoryPayload(item: any, imageUrl: string) {
  return {
    availability: { shipToLocationAvailability: { quantity: item.quantity } },
    condition: item.condition.toUpperCase(),
    product: {
      title: item.title,
      description: item.description,
      imageUrls: [imageUrl],
      aspects: {
        "Manufacturer": [item.manufacturer || "Generic"],
        "Model": [item.model || item.sku],
        "Type": [item.category],
      },
      brand: item.manufacturer || "Generic",
      mpn: item.model || item.sku,
      sku: item.sku,
    },
  };
}

function createOfferPayload(item: any, merchantLocationKey: string) {
  return {
    sku: item.sku,
    marketplaceId: "EBAY_US",
    format: "FIXED_PRICE",
    availableQuantity: item.quantity,
    listingDescription: item.description,
    pricingSummary: { price: { value: item.price.toFixed(2), currency: "USD" } },
    quantityLimitPerBuyer: 1,
    merchantLocationKey,
    listingPolicies: { fulfillmentPolicyId: "", paymentPolicyId: "", returnPolicyId: "" },
    categoryId: "1",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json();
    const token = getEbayOAuthToken();
    const baseUrl = getEbayApiBaseUrl();

    if (!token) {
      return NextResponse.json({ error: "Token OAuth no configurado" }, { status: 401 });
    }

    const items = loadItemsForPublishing();
    const item = items[itemId];
    if (!item) {
      return NextResponse.json({ error: "Producto no encontrado", itemId }, { status: 404 });
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/inventory-images/${item.image}`;

    // Step 1: Create/Update Inventory Item
    const inventoryPayload = createInventoryPayload(item, imageUrl);
    const inventoryRes = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item/${item.sku}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Accept": "application/json",
      },
      body: JSON.stringify(inventoryPayload),
    });

    if (!inventoryRes.ok) {
      const errorText = await inventoryRes.text();
      return NextResponse.json({ error: "Error al crear inventory item", status: inventoryRes.status, details: errorText }, { status: inventoryRes.status });
    }

    // Step 2: Create Offer
    const offerPayload = createOfferPayload(item, "default");
    const offerRes = await fetch(`${baseUrl}/sell/inventory/v1/offer`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Accept": "application/json",
      },
      body: JSON.stringify(offerPayload),
    });

    if (!offerRes.ok) {
      const errorText = await offerRes.text();
      return NextResponse.json({ error: "Error al crear offer", status: offerRes.status, details: errorText }, { status: offerRes.status });
    }

    const offerData = await offerRes.json();

    // Step 3: Publish Offer
    const publishRes = await fetch(`${baseUrl}/sell/inventory/v1/offer/${offerData.offerId}/publish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Accept": "application/json",
      },
    });

    if (!publishRes.ok) {
      const errorText = await publishRes.text();
      return NextResponse.json({
        success: true,
        warning: "Offer creado pero no publicado",
        offerId: offerData.offerId,
        sku: item.sku,
        status: "created",
        publishError: errorText,
      });
    }

    const publishData = await publishRes.json();

    // Update inventory.json status
    const invPath = path.join(EBAY_DATA_DIR, "inventory.json");
    const inventoryItems = JSON.parse(fs.readFileSync(invPath, "utf-8"));
    if (inventoryItems[itemId]) {
      inventoryItems[itemId].status = "published";
      inventoryItems[itemId].offerId = offerData.offerId;
      inventoryItems[itemId].publishedAt = new Date().toISOString();
      fs.writeFileSync(invPath, JSON.stringify(inventoryItems, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: "Listing creado y publicado exitosamente",
      offerId: offerData.offerId,
      listingId: offerData.offerId,
      sku: item.sku,
      status: "published",
      listingUrl: publishData?.listingUrl || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: `Error: ${error.message || error}` }, { status: 500 });
  }
}

export async function GET() {
  const items = loadItemsForPublishing();
  return NextResponse.json({ items });
}