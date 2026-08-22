/**
 * Verifica que ningun rol quede en bucle de redirecciones al entrar.
 * Replica landingPathFor() con los permisos reales de la base y comprueba
 * que la ruta destino sea alcanzable con esos permisos.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

/** Mismo orden que src/lib/auth/session.ts */
function landingPathFor(perms: Set<string>): string {
  if (perms.has("dashboard:read")) return "/dashboard";
  if (perms.has("production:my_work")) return "/my-production";
  return "/sin-acceso";
}

/** Permiso que exige cada pagina de aterrizaje */
const REQUIRED: Record<string, string | null> = {
  "/dashboard": "dashboard:read",
  "/my-production": "production:my_work",
  "/sin-acceso": null, // solo requiere sesion
};

async function main() {
  const users = await client`
    select u.email, u.name,
      coalesce(string_agg(distinct r.name, ' + '), 'SIN ROL') as roles
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    group by u.id, u.email, u.name
    order by u.email
  `;

  console.log("=== ATERRIZAJE POR ROL (sin bucles) ===\n");
  let allOk = true;

  for (const u of users) {
    const rows = await client`
      select distinct p.id
      from users usr
      join user_roles ur on ur.user_id = usr.id
      join role_permissions rp on rp.role_id = ur.role_id
      join permissions p on p.id = rp.permission_id
      where usr.email = ${u.email}
    `;
    const perms = new Set(rows.map((r) => r.id as string));
    const landing = landingPathFor(perms);
    const needed = REQUIRED[landing];
    const reachable = needed === null || perms.has(needed);
    if (!reachable) allOk = false;

    console.log(
      `  ${reachable ? "OK   " : "BUCLE"} ${u.email.padEnd(36)} ${String(u.roles).padEnd(20)} -> ${landing}`,
    );
  }

  console.log(
    `\n${allOk ? "Ningun usuario queda en bucle de redirecciones." : "HAY usuarios que rebotarian en bucle."}`,
  );

  await client.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
