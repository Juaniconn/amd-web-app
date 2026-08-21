import { NextResponse } from "next/server";
import { getTvDashboard } from "@/server/services/production-tv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getTvDashboard();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
