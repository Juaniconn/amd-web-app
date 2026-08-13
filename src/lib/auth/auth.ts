import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getAllowedAuthHosts,
  getFallbackAuthUrl,
  resolveTrustedOrigins,
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
  trustedOrigins: resolveTrustedOrigins,
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
