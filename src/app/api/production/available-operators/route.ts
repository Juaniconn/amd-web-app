import { NextResponse } from "next/server";
import { getAvailableOperators } from "@/server/services/available-operators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workCenterId = searchParams.get("workCenterId") ?? undefined;
    const operators = await getAvailableOperators(workCenterId);
    return NextResponse.json(operators);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load operators" },
      { status: 500 },
    );
  }
}
