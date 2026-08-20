import { NextResponse } from "next/server";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getSession } from "@/lib/auth/session";
import type { QuoteAgentWireEvent } from "@/lib/quotes/agent-console";
import { AppError } from "@/lib/errors";
import { userHasPermission } from "@/server/services/access";
import { createQuoteAgentPreview } from "@/server/services/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

function encodeEvent(event: QuoteAgentWireEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const allowed = await userHasPermission(session.user.id, PERMISSION_IDS.quotesWrite);
  if (!allowed) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const files: { originalName: string; bytes: Buffer }[] = [];
  for (const file of formData.getAll("files")) {
    if (file instanceof File && file.size > 0) {
      files.push({
        originalName: file.name,
        bytes: Buffer.from(await file.arrayBuffer()),
      });
    }
  }
  if (files.length === 0) {
    return NextResponse.json(
      { error: "Sube el plano PDF o un ZIP de PDF." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const started = Date.now();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let closed = false;
  let writes = Promise.resolve();

  const send = (event: QuoteAgentWireEvent) => {
    writes = writes.then(async () => {
      if (closed) return;
      try {
        await writer.write(encoder.encode(encodeEvent(event)));
      } catch {
        closed = true;
      }
    });
    return writes;
  };

  void (async () => {
    const heartbeat = setInterval(() => {
      void send({ kind: "heartbeat", elapsedMs: Date.now() - started });
    }, 10_000);
    try {
      const preview = await createQuoteAgentPreview(
        { quoteId: id, files },
        { userId: session.user.id, name: session.user.name },
        send,
      );
      await send({ kind: "done", preview });
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : "No se pudo calcular el preliminar.";
      console.error("[quote-agent-preview]", error);
      await send({ kind: "error", message });
    } finally {
      clearInterval(heartbeat);
      await writes;
      closed = true;
      try {
        await writer.close();
      } catch {
        /* el cliente ya cerró */
      }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
