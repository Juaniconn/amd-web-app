import { describe, expect, it } from "vitest";
import {
  consoleEventsFromSdk,
  hideJsonFence,
  newConsoleLineId,
  toolDetail,
  toolLabel,
} from "./agent-console";

describe("agent console", () => {
  it("maps a read tool call to Spanish", () => {
    const events = consoleEventsFromSdk({
      type: "tool_call",
      call_id: "1",
      name: "read",
      status: "running",
      args: { path: "/tmp/BRACKET.pdf" },
    });
    expect(events).toEqual([
      {
        kind: "tool",
        id: "1",
        name: "read",
        status: "running",
        detail: "BRACKET.pdf",
      },
    ]);
    expect(toolLabel("read")).toBe("Leyendo");
    expect(toolDetail("read", { path: "a/b/c.pdf" })).toBe("c.pdf");
  });

  it("hides the JSON dump while keeping the narration", () => {
    expect(hideJsonFence("Vi un bracket A36.\n```json\n{\"items\":[]}\n```")).toBe(
      "Vi un bracket A36.",
    );
  });

  it("makes unique console line ids without Web Crypto", () => {
    const a = newConsoleLineId();
    const b = newConsoleLineId();
    expect(a).toMatch(/^line-\d+-[0-9a-z]+$/);
    expect(b).not.toBe(a);
  });
});
