import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const users = await client`
    select
      u.id, u.email, u.name, u.email_verified,
      (select count(*)::int from accounts a where a.user_id = u.id and a.provider_id = 'credential') as has_credential,
      (select string_agg(r.name, ', ') from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = u.id) as roles,
      (select count(*)::int from production_operations po where po.operator_user_id = u.id) as ops_assigned
    from users u
    order by u.email
  `;

  console.log("=== USUARIOS EN LA BASE ===\n");
  for (const u of users) {
    const cred = Number(u.has_credential) > 0 ? "SI" : "NO";
    console.log(`${u.email}`);
    console.log(`   nombre: ${u.name} | verificado: ${u.email_verified} | password: ${cred}`);
    console.log(`   roles:  ${u.roles ?? "SIN ROL"}`);
    console.log(`   procesos asignados: ${u.ops_assigned}`);
    console.log("");
  }

  console.log("=== ROLES DISPONIBLES ===");
  const roles = await client`select id, name from roles order by name`;
  for (const r of roles) console.log(`  ${r.id} — ${r.name}`);

  await client.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("ERROR:", e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
