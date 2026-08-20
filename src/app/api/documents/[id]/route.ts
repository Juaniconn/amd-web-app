import { NextResponse } from "next/server";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getSession } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { AppError } from "@/lib/errors";
import { userHasPermission } from "@/server/services/access";
import { getDocumentForDownload } from "@/server/services/documents";
import {
  engineeringRequestHasProductionOrder,
  quoteHasProductionOrder,
} from "@/server/services/production";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const doc = await getDocumentForDownload(id);
    if (doc.entityType === "quote") {
      const allowed = await userHasPermission(
        session.user.id,
        PERMISSION_IDS.quotesRead,
      );
      if (!allowed) {
        const canViewProduction = await userHasPermission(
          session.user.id,
          PERMISSION_IDS.productionView,
        );
        const linked = canViewProduction
          ? await quoteHasProductionOrder(doc.entityId)
          : false;
        if (!linked) {
          return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
        }
      }
    } else if (doc.entityType === "quote_item") {
      const allowed = await userHasPermission(
        session.user.id,
        PERMISSION_IDS.quotesRead,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
      }
    } else if (doc.entityType === "engineering_request") {
      const allowed = await userHasPermission(
        session.user.id,
        PERMISSION_IDS.engineeringRead,
      );
      if (!allowed) {
        const canReadQuotes = await userHasPermission(
          session.user.id,
          PERMISSION_IDS.quotesRead,
        );
        const canViewProduction = await userHasPermission(
          session.user.id,
          PERMISSION_IDS.productionView,
        );
        const linked = canViewProduction
          ? await engineeringRequestHasProductionOrder(doc.entityId)
          : false;
        if (!canReadQuotes && !linked) {
          return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
        }
      }
    } else if (doc.entityType === "order") {
      const allowed = await userHasPermission(
        session.user.id,
        PERMISSION_IDS.ordersView,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
      }
    } else if (doc.entityType === "project") {
      const allowed = await userHasPermission(
        session.user.id,
        PERMISSION_IDS.projectsView,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
      }
    } else if (doc.entityType === "production_order") {
      const allowed = await userHasPermission(
        session.user.id,
        PERMISSION_IDS.productionView,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const bytes = await getStorage().get(doc.objectKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Length": String(doc.sizeBytes),
        "Content-Disposition": `attachment; filename="${doc.originalName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudo descargar el archivo." }, { status: 500 });
  }
}
