import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

function getClient() {
  if (!globalForDb.postgresClient) {
    globalForDb.postgresClient = postgres(getConnectionString(), {
      max: 10,
    });
  }
  return globalForDb.postgresClient;
}

export const db = drizzle(getClient(), { schema });
