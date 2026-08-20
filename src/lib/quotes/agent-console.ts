import type { QuoteAgentPreview } from "@/lib/quotes/market-preview";

export type QuoteAgentChatRole = "user" | "assistant" | "system" | "tool" | "thinking";

export type QuoteAgentWireEvent =
  | { kind: "status"; text: string }
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | {
      kind: "tool";
      id: string;
      name: string;
      status: "running" | "completed" | "error";
      detail: string;
    }
  | { kind: "thinking"; text: string }
  | { kind: "heartbeat"; elapsedMs: number }
  | { kind: "done"; preview: QuoteAgentPreview }
  | { kind: "error"; message: string };

const TOOL_LABELS: Record<string, string> = {
  read: "Leyendo",
  grep: "Buscando en el plano",
  glob: "Listando archivos",
  ls: "Revisando carpeta",
};

export function toolLabel(name: string) {
  return TOOL_LABELS[name] ?? name;
}

let consoleLineSeq = 0;

/** React keys only. Avoid Web Crypto: it is incomplete on http://LAN-IP. */
export function newConsoleLineId() {
  consoleLineSeq += 1;
  return `line-${consoleLineSeq}-${Date.now().toString(36)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function toolDetail(name: string, args: unknown) {
  const rec = asRecord(args);
  const raw = String(
    rec.path ?? rec.file ?? rec.target_file ?? rec.glob_pattern ?? rec.pattern ?? "",
  );
  const file = raw.replace(/^.*[\\/]/, "").trim();
  return file || name;
}

export function hideJsonFence(text: string) {
  const idx = text.search(/```json/i);
  if (idx < 0) {
    const brace = text.indexOf('{"items"');
    if (brace < 0) return text;
    return `${text.slice(0, brace).trimEnd()}\nArmando el preliminar…`.trim();
  }
  const closed = text.indexOf("```", idx + 6) >= 0;
  return `${text.slice(0, idx).trimEnd()}${closed ? "" : "\nArmando el preliminar…"}`.trim();
}

type LooseSdkMessage = {
  type?: string;
  call_id?: string;
  name?: string;
  status?: string;
  args?: unknown;
  text?: string;
  message?: {
    content?: Array<{ type?: string; text?: string; name?: string; input?: unknown }>;
  };
};

export function consoleEventsFromSdk(message: LooseSdkMessage): QuoteAgentWireEvent[] {
  if (message.type === "assistant") {
    const chunks: string[] = [];
    for (const block of message.message?.content ?? []) {
      if (block.type === "text" && block.text) chunks.push(block.text);
    }
    if (chunks.length === 0) return [];
    return [{ kind: "assistant", text: chunks.join("") }];
  }
  if (message.type === "thinking" && message.text) {
    return [{ kind: "thinking", text: message.text }];
  }
  if (message.type === "tool_call") {
    const status =
      message.status === "completed" || message.status === "error" ? message.status : "running";
    return [
      {
        kind: "tool",
        id: message.call_id || `${message.name ?? "tool"}-${status}`,
        name: message.name || "tool",
        status,
        detail: toolDetail(message.name || "tool", message.args),
      },
    ];
  }
  if (message.type === "status") {
    const label =
      message.status === "RUNNING"
        ? "El agente está leyendo los planos…"
        : message.status === "FINISHED"
          ? "El agente terminó de leer."
          : message.status
            ? `Estado: ${message.status}`
            : "";
    return label ? [{ kind: "status", text: label }] : [];
  }
  return [];
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0
    ? `${minutes} min ${seconds.toString().padStart(2, "0")} s`
    : `${seconds} s`;
}

export async function readSseJson(
  response: Response,
  onEvent: (event: QuoteAgentWireEvent) => void,
) {
  if (!response.body) {
    throw new Error("El servidor no envió la consola del agente.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function consume(chunk: string) {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      dispatch(part);
    }
  }

  function dispatch(part: string) {
    const line = part
      .split("\n")
      .map((row) => row.trimEnd())
      .find((row) => row.startsWith("data:"));
    if (!line) return;
    const payload = line.replace(/^data:\s?/, "");
    if (!payload || payload === "[DONE]") return;
    try {
      onEvent(JSON.parse(payload) as QuoteAgentWireEvent);
    } catch {
      /* chunk incompleto o ruido del proxy */
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    consume(decoder.decode(value, { stream: true }));
  }
  consume(decoder.decode());
  if (buffer.trim()) dispatch(buffer);
}
