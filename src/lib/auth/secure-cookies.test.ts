import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSecureAuthCookies } from "./trusted-hosts";

/**
 * Las cookies de sesión solo deben marcarse `Secure` cuando el ERP se sirve
 * por HTTPS. En HTTP el navegador descarta las cookies `Secure` (y las de
 * prefijo `__Secure-`), lo que dejaba al usuario en /login?reauth=1 tras un
 * login que respondía 200.
 */
describe("useSecureAuthCookies", () => {
  const original = process.env.BETTER_AUTH_URL;

  beforeEach(() => {
    delete process.env.BETTER_AUTH_URL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = original;
  });

  it("no usa cookies seguras en HTTP (beta interna por LAN)", () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    expect(useSecureAuthCookies()).toBe(false);
  });

  it("no usa cookies seguras al entrar por IP de LAN", () => {
    process.env.BETTER_AUTH_URL = "http://192.168.1.190:3000";
    expect(useSecureAuthCookies()).toBe(false);
  });

  it("usa cookies seguras cuando hay HTTPS (Fase 13)", () => {
    process.env.BETTER_AUTH_URL = "https://operations.amdmeexico.com";
    expect(useSecureAuthCookies()).toBe(true);
  });

  it("tolera mayúsculas en el esquema", () => {
    process.env.BETTER_AUTH_URL = "HTTPS://operations.amdmeexico.com";
    expect(useSecureAuthCookies()).toBe(true);
  });

  it("sin variable definida asume HTTP local", () => {
    expect(useSecureAuthCookies()).toBe(false);
  });
});
