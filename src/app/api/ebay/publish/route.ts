import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getToken(): string {
  try {
    const envPath = path.join(process.cwd(), "..", "ebay-automation", ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/^EBAY_OAUTH_TOKEN=(.+)$/m) || envContent.match(/^EBAY_AUTH_TOKEN=(.+)$/m);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json();
    const token = getToken();
    if (!token) return NextResponse.json({ error: "Token not configured" }, { status: 401 });

    const invPath = path.join(process.cwd(), "..", "ebay-automation", "src", "data", "inventory.json");
    const items = JSON.parse(fs.readFileSync(invPath, "utf-8"));
    const item = items[itemId];
    if (!item) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Use Trading API for AddItem (Auth'n'Auth compatible)
    const sku = item.modelo || item.imagen.replace(".jpg", "");
    const title = `${item.producto} ${item.fabricante} ${item.modelo}`.trim();

    const addItemXml = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <Title>${title.substring(0, 80)}</Title>
    <Description>${item.producto} - ${item.fabricante} ${item.modelo}. Industrial product, new.</Description>
    <PrimaryCategory><CategoryID>262394</CategoryID></PrimaryCategory>
    <StartPrice>${item.precio}</StartPrice>
    <Quantity>${item.cantidad || 1}</Quantity>
    <SKU>${sku}</SKU>
    <ConditionID>1000</ConditionID>
    <ItemSpecifics>
      <NameValueList><Name>Brand</Name><Value>${item.fabricante}</Value></NameValueList>
      <NameValueList><Name>MPN</Name><Value>${item.modelo}</Value></NameValueList>
    </ItemSpecifics>
    <Country>US</Country>
    <Currency>USD</Currency>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PictureDetails><PictureURL>http://localhost:3000/inventory-images/${item.imagen}</PictureURL></PictureDetails>
    <PostalCode>88200</PostalCode>
    <Location>Ciudad Juarez, CH</Location>
    <DispatchTimeMax>3</DispatchTimeMax>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>UPSGround</ShippingService>
        <ShippingServiceCost currencyID="USD">0.00</ShippingServiceCost>
        <FreeShipping>true</FreeShipping>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
  </Item>
</AddItemRequest>`;

    const res = await fetch("https://api.sandbox.ebay.com/ws/api.dll", {
      method: "POST",
      headers: {
        "X-EBAY-API-IAF-TOKEN": token,
        "X-EBAY-API-CALL-NAME": "AddItem",
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "Content-Type": "text/xml",
      },
      body: addItemXml,
    });

    const text = await res.text();
    if (text.includes("<Ack>Success</Ack>") || text.includes("<Ack>Warning</Ack>")) {
      items[itemId].status = "published";
      fs.writeFileSync(invPath, JSON.stringify(items, null, 2));
      return NextResponse.json({ success: true, message: "Product published to eBay", sku, title });
    } else {
      return NextResponse.json({ success: false, error: "eBay API error", details: text.substring(0, 500) }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 });
  }
}

export async function GET() {
  const invPath = path.join(process.cwd(), "..", "ebay-automation", "src", "data", "inventory.json");
  const items = JSON.parse(fs.readFileSync(invPath, "utf-8"));
  const publishItems = items.map((item: any, index: number) => ({
    id: index,
    sku: item.modelo || `SKU-${item.imagen.replace(".jpg", "")}`,
    title: `${item.producto} ${item.fabricante} ${item.modelo}`.trim(),
    price: item.precio || 0,
    quantity: item.cantidad || 1,
    category: item.categoria,
    manufacturer: item.fabricante,
    model: item.modelo,
    image: item.imagen,
    status: item.status || "draft",
  }));
  return NextResponse.json({ items: publishItems });
}