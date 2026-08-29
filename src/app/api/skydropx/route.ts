import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  createQuotation,
  getQuotation,
  createShipment,
  getShipment,
  getShipmentByTracking,
  cancelShipment,
  getCredits,
} from "@/server/services/skydropx";
import { listAddresses } from "@/server/services/skydropx-addresses";

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSION_IDS.deliveriesWrite);
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "quotation":
        const quotation = await createQuotation(data);
        return NextResponse.json(quotation);
      case "shipment":
        const shipment = await createShipment(data);
        return NextResponse.json(shipment);
      case "cancel":
        await cancelShipment(data.id);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSION_IDS.deliveriesRead);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "quotation":
        const quotation = await getQuotation(url.searchParams.get("id")!);
        return NextResponse.json(quotation);
      case "shipment":
        const shipment = await getShipment(url.searchParams.get("id")!);
        return NextResponse.json(shipment);
      case "tracking":
        const tracked = await getShipmentByTracking(
          url.searchParams.get("number")!,
        );
        return NextResponse.json(tracked);
      case "credits":
        const creditsData = await getCredits();
        return NextResponse.json(creditsData);
      case "addresses":
        const addresses = await listAddresses();
        return NextResponse.json({ addresses });
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}
