"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatElapsed,
  hideJsonFence,
  newConsoleLineId,
  toolLabel,
} from "@/lib/quotes/agent-console";

export type QuoteAgentChatLine = {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "thinking";
  text: string;
};

export function QuoteAgentConsole({
  lines,
  pending,
  elapsedMs,
  collapseWhenIdle = false,
}: {
  lines: QuoteAgentChatLine[];
  pending: boolean;
  elapsedMs: number;
  collapseWhenIdle?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (pending) setCollapsed(false);
  }, [pending]);

  useEffect(() => {
    if (collapseWhenIdle && !pending) setCollapsed(true);
  }, [collapseWhenIdle, pending]);

  useEffect(() => {
    const node = scroller.current;
    if (!node || collapsed) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, pending, collapsed]);

  if (lines.length === 0 && !pending) return null;

  const lastVisible = [...lines]
    .reverse()
    .find((line) => line.role !== "thinking" && line.text.trim().length > 0);
  const lastText =
    lastVisible?.role === "assistant"
      ? hideJsonFence(lastVisible.text)
      : lastVisible?.text;
  const summary = pending
    ? `Leyendo planos · ${formatElapsed(elapsedMs)}`
    : lastText
      ? lastText.replace(/\s+/g, " ").slice(0, 80)
      : formatElapsed(elapsedMs);

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Consola del agente
          {collapsed ? (
            <span className="ml-2 font-normal normal-case tracking-normal">
              {summary}
            </span>
          ) : null}
        </p>
        {!collapsed ? (
          <p className="shrink-0 text-xs text-muted-foreground">
            {pending ? `Leyendo planos · ${formatElapsed(elapsedMs)}` : formatElapsed(elapsedMs)}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? (
            <>
              Mostrar
              <ChevronDownIcon />
            </>
          ) : (
            <>
              Minimizar
              <ChevronUpIcon />
            </>
          )}
        </Button>
      </div>
      {collapsed ? null : (
        <div
          ref={scroller}
          className="max-h-80 space-y-2 overflow-y-auto px-3 py-3"
          aria-live="polite"
        >
          {lines.map((line) => (
            <ConsoleLine key={line.id} line={line} />
          ))}
          {pending ? (
            <p className="text-xs text-muted-foreground">
              El agente sigue trabajando. No se corta solo.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ConsoleLine({ line }: { line: QuoteAgentChatLine }) {
  if (line.role === "user") {
    return (
      <div className="ml-8 rounded-lg bg-muted px-3 py-2 text-sm">{line.text}</div>
    );
  }
  if (line.role === "assistant") {
    const visible = hideJsonFence(line.text);
    if (!visible) return null;
    return (
      <div className="mr-4 whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm leading-relaxed">
        {visible}
      </div>
    );
  }
  if (line.role === "tool") {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        ▸ {line.text}
      </p>
    );
  }
  if (line.role === "thinking") {
    return (
      <p className="line-clamp-3 text-xs italic text-muted-foreground">{line.text}</p>
    );
  }
  return <p className="text-xs text-muted-foreground">{line.text}</p>;
}

export function applyConsoleEvent(
  lines: QuoteAgentChatLine[],
  event: import("@/lib/quotes/agent-console").QuoteAgentWireEvent,
): QuoteAgentChatLine[] {
  if (event.kind === "heartbeat" || event.kind === "done") return lines;
  if (event.kind === "error") {
    return [...lines, { id: newConsoleLineId(), role: "system", text: event.message }];
  }
  if (event.kind === "user") {
    return [...lines, { id: newConsoleLineId(), role: "user", text: event.text }];
  }
  if (event.kind === "status") {
    return [...lines, { id: newConsoleLineId(), role: "system", text: event.text }];
  }
  if (event.kind === "thinking") {
    const last = lines[lines.length - 1];
    if (last?.role === "thinking") {
      return [...lines.slice(0, -1), { ...last, text: event.text }];
    }
    return [...lines, { id: newConsoleLineId(), role: "thinking", text: event.text }];
  }
  if (event.kind === "assistant") {
    const last = lines[lines.length - 1];
    if (last?.role === "assistant") {
      const text = event.text.startsWith(last.text) ? event.text : `${last.text}${event.text}`;
      return [...lines.slice(0, -1), { ...last, text }];
    }
    return [...lines, { id: newConsoleLineId(), role: "assistant", text: event.text }];
  }
  if (event.kind === "tool") {
    const text = `${toolLabel(event.name)} ${event.detail}${
      event.status === "completed" ? " · listo" : event.status === "error" ? " · error" : "…"
    }`;
    const idx = lines.findIndex((line) => line.id === event.id);
    const next = { id: event.id, role: "tool" as const, text };
    if (idx >= 0) {
      const copy = [...lines];
      copy[idx] = next;
      return copy;
    }
    return [...lines, next];
  }
  return lines;
}
