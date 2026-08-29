import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  listNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionView);
    const userId = session.user.id;
    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(userId),
      getUnreadNotificationCount(userId),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al cargar notificaciones" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { session } = await requirePermission(PERMISSION_IDS.productionView);
    const userId = session.user.id;
    const body = await request.json();
    const { action, id } = body;

    if (action === "markAllRead") {
      await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true });
    }

    if (action === "markRead" && id) {
      await markNotificationAsRead(id, userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar notificación" },
      { status: 500 },
    );
  }
}
