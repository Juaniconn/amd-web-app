import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { activityLogs, contacts, customers } from "./schema";
import { activitySummary } from "../lib/audit/activity";
import type { CustomerStatus, CustomerType } from "../lib/validation/customers";

type DemoContact = {
  suffix: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  department: string;
  isPrimary: boolean;
};

type DemoCustomer = {
  code: string;
  legalName: string;
  tradeName: string;
  rfc: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  type: CustomerType;
  status: CustomerStatus;
  notes: string;
  contacts: DemoContact[];
};

const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    code: "DEMO_CLIENTE_001",
    legalName: "Cliente Industrial A",
    tradeName: "CIA",
    rfc: "CIA010101AAA",
    phone: "656-100-0001",
    email: "contacto@cliente-industrial-a.example",
    address: "Av. Industria 100",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "industrial",
    status: "activo",
    notes: "Cliente demo de manufactura. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Ana Compras",
        title: "Gerente de compras",
        email: "ana.compras@cliente-industrial-a.example",
        phone: "656-100-0101",
        whatsapp: "656-100-0101",
        department: "Compras",
        isPrimary: true,
      },
      {
        suffix: "2",
        name: "Luis Ingeniería",
        title: "Ingeniero de proyecto",
        email: "luis.ingenieria@cliente-industrial-a.example",
        phone: "656-100-0102",
        whatsapp: "656-100-0102",
        department: "Ingeniería",
        isPrimary: false,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_002",
    legalName: "Cliente Industrial B",
    tradeName: "CIB",
    rfc: "CIB010101AAB",
    phone: "656-100-0002",
    email: "contacto@cliente-industrial-b.example",
    address: "Blvd. Independencia 200",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "industrial",
    status: "activo",
    notes: "Cliente demo. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Marta Calidad",
        title: "Coordinadora de calidad",
        email: "marta.calidad@cliente-industrial-b.example",
        phone: "656-100-0201",
        whatsapp: "656-100-0201",
        department: "Calidad",
        isPrimary: true,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_003",
    legalName: "Maquiladora A",
    tradeName: "Maq A",
    rfc: "MAQ010101AAA",
    phone: "656-100-0003",
    email: "contacto@maquiladora-a.example",
    address: "Parque Industrial 300",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "maquiladora",
    status: "activo",
    notes: "Maquiladora demo. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Carlos Materiales",
        title: "Buyer",
        email: "carlos.materiales@maquiladora-a.example",
        phone: "656-100-0301",
        whatsapp: "656-100-0301",
        department: "Materiales",
        isPrimary: true,
      },
      {
        suffix: "2",
        name: "Sofía Planeación",
        title: "Planeadora",
        email: "sofia.planeacion@maquiladora-a.example",
        phone: "656-100-0302",
        whatsapp: "656-100-0302",
        department: "Planeación",
        isPrimary: false,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_004",
    legalName: "Maquiladora B",
    tradeName: "Maq B",
    rfc: "MAQ010101AAB",
    phone: "656-100-0004",
    email: "contacto@maquiladora-b.example",
    address: "Parque Industrial 400",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "maquiladora",
    status: "activo",
    notes: "Maquiladora demo. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Elena Compras",
        title: "Compras",
        email: "elena.compras@maquiladora-b.example",
        phone: "656-100-0401",
        whatsapp: "656-100-0401",
        department: "Compras",
        isPrimary: true,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_005",
    legalName: "Cliente Comercial A",
    tradeName: "CCA",
    rfc: "CCA010101AAA",
    phone: "656-100-0005",
    email: "contacto@cliente-comercial-a.example",
    address: "Av. Tecnológico 500",
    city: "Chihuahua",
    state: "Chihuahua",
    type: "comercial",
    status: "activo",
    notes: "Cliente demo comercial. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Pedro Ventas",
        title: "Contacto comercial",
        email: "pedro.ventas@cliente-comercial-a.example",
        phone: "656-100-0501",
        whatsapp: "656-100-0501",
        department: "Ventas",
        isPrimary: true,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_006",
    legalName: "Cliente Industrial C",
    tradeName: "CIC",
    rfc: "CIC010101AAA",
    phone: "656-100-0006",
    email: "contacto@cliente-industrial-c.example",
    address: "Calle Acero 600",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "industrial",
    status: "inactivo",
    notes: "Cliente demo inactivo. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Rita Archivo",
        title: "Administración",
        email: "rita.archivo@cliente-industrial-c.example",
        phone: "656-100-0601",
        whatsapp: "656-100-0601",
        department: "Administración",
        isPrimary: true,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_007",
    legalName: "Maquiladora C",
    tradeName: "Maq C",
    rfc: "MAQ010101AAC",
    phone: "656-100-0007",
    email: "contacto@maquiladora-c.example",
    address: "Parque Industrial 700",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "maquiladora",
    status: "activo",
    notes: "Maquiladora demo. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Hugo Producción",
        title: "Supervisor",
        email: "hugo.produccion@maquiladora-c.example",
        phone: "656-100-0701",
        whatsapp: "656-100-0701",
        department: "Producción",
        isPrimary: true,
      },
      {
        suffix: "2",
        name: "Diana Calidad",
        title: "Inspectora",
        email: "diana.calidad@maquiladora-c.example",
        phone: "656-100-0702",
        whatsapp: "656-100-0702",
        department: "Calidad",
        isPrimary: false,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_008",
    legalName: "Cliente Comercial B",
    tradeName: "CCB",
    rfc: "CCB010101AAA",
    phone: "656-100-0008",
    email: "contacto@cliente-comercial-b.example",
    address: "Av. Universidad 800",
    city: "Chihuahua",
    state: "Chihuahua",
    type: "comercial",
    status: "activo",
    notes: "Cliente demo comercial. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Irene Operaciones",
        title: "Operaciones",
        email: "irene.operaciones@cliente-comercial-b.example",
        phone: "656-100-0801",
        whatsapp: "656-100-0801",
        department: "Operaciones",
        isPrimary: true,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_009",
    legalName: "Cliente Industrial D",
    tradeName: "CID",
    rfc: "CID010101AAA",
    phone: "656-100-0009",
    email: "contacto@cliente-industrial-d.example",
    address: "Blvd. Frontera 900",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "industrial",
    status: "activo",
    notes: "Cliente demo. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Oscar Mantenimiento",
        title: "Mantenimiento",
        email: "oscar.mantenimiento@cliente-industrial-d.example",
        phone: "656-100-0901",
        whatsapp: "656-100-0901",
        department: "Mantenimiento",
        isPrimary: true,
      },
    ],
  },
  {
    code: "DEMO_CLIENTE_010",
    legalName: "Servicios Industriales Demo",
    tradeName: "SID",
    rfc: "SID010101AAA",
    phone: "656-100-0010",
    email: "contacto@servicios-industriales-demo.example",
    address: "Calle Herramienta 1000",
    city: "Ciudad Juárez",
    state: "Chihuahua",
    type: "otro",
    status: "inactivo",
    notes: "Cliente demo de tipo otro. No es un cliente real de AMD.",
    contacts: [
      {
        suffix: "1",
        name: "Patricia Administración",
        title: "Administración",
        email: "patricia.admin@servicios-industriales-demo.example",
        phone: "656-100-1001",
        whatsapp: "656-100-1001",
        department: "Administración",
        isPrimary: true,
      },
    ],
  },
];

export async function seedCrmDemo(
  db: PostgresJsDatabase,
  actor: { id: string; name: string } | null,
) {
  const now = new Date();

  for (const demo of DEMO_CUSTOMERS) {
    const customerId = `demo-customer-${demo.code.slice(-3)}`;

    await db
      .insert(customers)
      .values({
        id: customerId,
        code: demo.code,
        legalName: demo.legalName,
        tradeName: demo.tradeName,
        rfc: demo.rfc,
        phone: demo.phone,
        email: demo.email,
        address: demo.address,
        city: demo.city,
        state: demo.state,
        country: "México",
        type: demo.type,
        status: demo.status,
        notes: demo.notes,
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: customers.code,
        set: {
          legalName: demo.legalName,
          tradeName: demo.tradeName,
          rfc: demo.rfc,
          phone: demo.phone,
          email: demo.email,
          address: demo.address,
          city: demo.city,
          state: demo.state,
          type: demo.type,
          status: demo.status,
          notes: demo.notes,
          isDemo: true,
          deletedAt: null,
          updatedAt: now,
        },
      });

    await db.delete(contacts).where(eq(contacts.customerId, customerId));

    if (demo.contacts.length > 0) {
      await db.insert(contacts).values(
        demo.contacts.map((contact) => ({
          id: `${customerId}-contact-${contact.suffix}`,
          customerId,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          whatsapp: contact.whatsapp,
          department: contact.department,
          isPrimary: contact.isPrimary,
          notes: null,
          isDemo: true,
          createdBy: actor?.id ?? null,
          updatedBy: actor?.id ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    const existingLog = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.entityType, "customer"),
          eq(activityLogs.entityId, customerId),
          eq(activityLogs.action, "created"),
        ),
      )
      .limit(1);

    if (existingLog.length === 0) {
      await db.insert(activityLogs).values({
        id: `${customerId}-created`,
        actorUserId: actor?.id ?? null,
        action: "created",
        entityType: "customer",
        entityId: customerId,
        summary: activitySummary({
          actorName: actor?.name ?? null,
          action: "created",
          entityType: "customer",
          entityLabel: demo.legalName,
        }),
        newValue: { code: demo.code, source: "demo-seed" },
      });
    }
  }

  console.log(`Seeded ${DEMO_CUSTOMERS.length} demo customers.`);
}
