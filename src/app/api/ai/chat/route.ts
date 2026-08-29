import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSION_IDS.productionView);
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: "El asistente IA no está configurado. Agrega CURSOR_API_KEY en .env.local." },
      );
    }

    const res = await fetch("https://api.cursor.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente de AMD México, una empresa de manufactura. Ayudas con preguntas sobre producción, OTs, partes, inventario, cotizaciones. Responde en español mexicano, de forma clara y concisa.",
          },
          { role: "user", content: message },
        ],
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { response: "Error al conectar con el asistente. Intenta de nuevo." },
      );
    }

    const data = await res.json();
    const response = data.choices?.[0]?.message?.content || "Sin respuesta";

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({ response: "Error interno del asistente." });
  }
}
