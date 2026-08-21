import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getAllowedAuthHosts,
  getFallbackAuthUrl,
  resolveTrustedOrigins,
  useSecureAuthCookies,
} from "@/lib/auth/trusted-hosts";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: getAllowedAuthHosts(),
    protocol: "auto",
    fallback: getFallbackAuthUrl(),
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    // La beta interna se sirve por HTTP plano en la LAN de planta. Con
    // cookies `Secure` (y prefijo `__Secure-`) el navegador las descarta en
    // HTTP: el login devolvía 200 pero la sesión nunca se guardaba y el
    // usuario quedaba atrapado en /login?reauth=1.
    //
    // Se fuerza a false solo cuando BETTER_AUTH_URL no es https. En cuanto el
    // ERP se sirva por HTTPS (Fase 13 / ADR-058), las cookies vuelven a ser
    // seguras automáticamente sin tocar código.
    useSecureCookies: useSecureAuthCookies(),
  },
  trustedOrigins: resolveTrustedOrigins,
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
