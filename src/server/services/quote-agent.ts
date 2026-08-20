import "server-only";

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AppError } from "@/lib/errors";
import {
  consoleEventsFromSdk,
  type QuoteAgentWireEvent,
} from "@/lib/quotes/agent-console";
import { parseAgentJson } from "@/lib/quotes/market-preview";

type CheapQuoteModel =
  | { id: "auto-smart"; params: [{ id: "optimize_for"; value: "cost" }] }
  | { id: "auto" };

export type PdfUpload = {
  originalName: string;
  bytes: Buffer;
};

function safeFileName(name: string) {
  const base = path.basename(name).replace(/[^\w.\-]+/g, "_");
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export async function pdfsFromUploads(files: PdfUpload[]): Promise<PdfUpload[]> {
  const out: PdfUpload[] = [];
  for (const file of files) {
    const lower = file.originalName.toLowerCase();
    if (lower.endsWith(".pdf")) {
      out.push(file);
      continue;
    }
    if (!lower.endsWith(".zip")) {
      throw new AppError(
        "Solo se aceptan PDF de planos o un ZIP de PDF.",
        "DRAWING_TYPE",
        400,
      );
    }
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file.bytes);
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;
      if (!entry.name.toLowerCase().endsWith(".pdf")) continue;
      const bytes = Buffer.from(await entry.async("nodebuffer"));
      if (bytes.byteLength === 0) continue;
      out.push({ originalName: path.basename(entry.name), bytes });
    }
  }
  if (out.length === 0) {
    throw new AppError("El ZIP no trae PDF de planos.", "DRAWING_REQUIRED", 400);
  }
  return out;
}

export async function cheapestQuoteModel(apiKey: string): Promise<CheapQuoteModel> {
  try {
    const { Cursor } = await import("@cursor/sdk");
    const models = await Cursor.models.list({ apiKey });
    const router = models.find((model) => model.id === "auto-smart");
    const optimize = router?.parameters?.find((parameter) => parameter.id === "optimize_for");
    const allowsCost = optimize?.values?.some((value) => value.value === "cost");
    if (router && allowsCost) {
      return {
        id: "auto-smart",
        params: [{ id: "optimize_for", value: "cost" }],
      };
    }
  } catch {
    /* fallback */
  }
  return { id: "auto" };
}

function quoteAgentPrompt(files: string[]) {
  return `Eres el agente de cotizaciones de AMD México (lámina: láser, doblez, acabado).

Lee TODOS estos PDF en el directorio de trabajo:
${files.map((name) => `- ${name}`).join("\n")}

Un PDF = una partida de fabricación. No inventes piezas que no estén en un plano.
La cantidad de lote NO está en el plano: no pongas quantity.

Estima como cotización de MERCADO (acero/aluminio comercial en Norte México), no uses un catálogo de proveedores.

Habla en español, breve, como en un chat: di qué plano abres y qué ves (pieza, material, espesor, doblez, hoyos). No te detengas si un dato no está escrito; estima con criterio de taller y sigue.

Al FINAL, después de narrar, entrega un bloque \`\`\`json con esta forma:
{"items":[{"source_file":"nombre.pdf","part_number":null,"part_name":"...","revision":null,"material":"A36","thickness_in":0.12,"unit_weight_lb":2.1,"scrap_weight_lb":0.3,"net_area_in2":80,"cut_length_in":40,"holes":4,"slots":0,"bends":2,"hem_count":0,"finish":null,"blank_length_in":12,"blank_width_in":8,"market_cost_per_kg":42,"notes":null}]}

Números en pulgadas y libras. market_cost_per_kg en MXN.`;
}

type AgentHandle = {
  send: (message: string) => Promise<{
    supports: (op: string) => boolean;
    stream: () => AsyncIterable<{ type?: string; [key: string]: unknown }>;
    wait: () => Promise<{
      status: string;
      result?: string;
      error?: { message?: string };
      model?: { id?: string };
    }>;
  }>;
  [Symbol.asyncDispose]?: () => Promise<void>;
  close?: () => void;
};

export async function runQuotePdfAgent(
  files: PdfUpload[],
  onEvent?: (event: QuoteAgentWireEvent) => void,
) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      "Falta CURSOR_API_KEY en .env.local para leer los PDF.",
      "CURSOR_API_KEY",
      503,
    );
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "amd-quote-"));
  let agent: AgentHandle | null = null;
  try {
    const written: string[] = [];
    for (const file of files) {
      const name = safeFileName(file.originalName);
      await writeFile(path.join(tmp, name), file.bytes);
      written.push(name);
      onEvent?.({
        kind: "status",
        text: `Plano listo: ${file.originalName}`,
      });
    }
    onEvent?.({
      kind: "status",
      text: "Arrancando el agente. Puede tardar varios minutos; no se cancela solo.",
    });
    const model = await cheapestQuoteModel(apiKey);
    const { Agent } = await import("@cursor/sdk");
    const prompt = quoteAgentPrompt(written);
    const baseOptions = {
      apiKey,
      model,
      name: "AMD cotizaciones PDF",
      local: { cwd: tmp, settingSources: [] },
    };
    try {
      agent = (await Agent.create({
        ...baseOptions,
        tools: ["read", "grep", "glob", "ls"],
      })) as AgentHandle;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/tool|configuration/i.test(message)) throw error;
      agent = (await Agent.create({
        ...baseOptions,
        disallowedTools: ["shell", "edit", "delete", "mcp"],
      })) as AgentHandle;
    }
    if (!agent) {
      throw new AppError("No se pudo arrancar el agente de cotizaciones.", "QUOTE_AGENT", 502);
    }
    const run = await agent.send(prompt);
    let transcript = "";
    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        const mapped = consoleEventsFromSdk(event);
        for (const item of mapped) {
          if (item.kind === "assistant") transcript += item.text;
          onEvent?.(item);
        }
      }
    } else {
      onEvent?.({
        kind: "status",
        text: "El agente está leyendo los planos. La consola se actualizará al terminar este paso.",
      });
    }
    const result = await run.wait();
    if (result.status !== "finished") {
      throw new AppError(
        result.error?.message || "El agente no pudo leer los planos.",
        "QUOTE_AGENT",
        502,
      );
    }
    const raw = result.result || transcript;
    if (!raw.trim()) {
      throw new AppError("El agente no devolvió el preliminar.", "QUOTE_AGENT", 502);
    }
    return {
      model: result.model?.id ?? model.id,
      extracts: parseAgentJson(raw).items,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "No se pudo ejecutar el agente de cotizaciones.",
      "QUOTE_AGENT",
      502,
    );
  } finally {
    if (agent) {
      const dispose = agent[Symbol.asyncDispose];
      if (typeof dispose === "function") {
        await dispose.call(agent);
      } else {
        agent.close?.();
      }
    }
    await rm(tmp, { recursive: true, force: true });
  }
}
