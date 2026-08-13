import { describe, expect, it } from "vitest";
import { isLocalNetworkOrigin } from "./trusted-hosts";

describe("isLocalNetworkOrigin", () => {
  it("accepts localhost and private LAN origins", () => {
    expect(isLocalNetworkOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalNetworkOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalNetworkOrigin("http://192.168.1.50:3000")).toBe(true);
    expect(isLocalNetworkOrigin("http://10.0.0.12:3000")).toBe(true);
    expect(isLocalNetworkOrigin("http://172.16.4.8:3000")).toBe(true);
    expect(isLocalNetworkOrigin("http://pc-taller.local:3000")).toBe(true);
  });

  it("rejects public origins", () => {
    expect(isLocalNetworkOrigin("https://evil.example")).toBe(false);
    expect(isLocalNetworkOrigin("http://8.8.8.8:3000")).toBe(false);
    expect(isLocalNetworkOrigin("not-a-url")).toBe(false);
  });
});
