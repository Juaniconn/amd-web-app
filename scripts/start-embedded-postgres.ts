import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".data", "postgres");
mkdirSync(dataDir, { recursive: true });

const port = Number(process.env.PG_PORT ?? 5432);
const alreadyInitialized = existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "amd",
  password: "amd",
  port,
  persistent: true,
});

async function main() {
  if (!alreadyInitialized) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase("amd_operations");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      throw error;
    }
  }

  console.log(
    `PostgreSQL listo en postgresql://amd:amd@localhost:${port}/amd_operations`,
  );
  console.log(
    "Deja este proceso abierto mientras desarrollas. Ctrl+C para detener.",
  );

  await new Promise<void>((resolve) => {
    const stop = async () => {
      await pg.stop();
      resolve();
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
