import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import {
  inventoryBalances,
  materials,
  plantRates,
  supplierMaterials,
  suppliers,
} from "./schema";

const PLANT_RATES_ID = "default";
const BRANCH_CJS = "amd-branch-cjs";

const STEEL_SUPPLIERS = [
  {
    id: "sup-calc-kalisch-cjs",
    code: "CAL-KAL-CJS",
    legalName: "Kalisch Acero — sucursal Oscar Flores",
    phone: "(656) 610 7682 / (656) 610 7691",
    address: "Av. Oscar Flores y Benemérito de las Américas, Infonavit Casas Grandes, C.P. 32600",
    city: "Ciudad Juárez",
    country: "México",
    website: "https://kalischacero.com",
    materialAvailable: "Lámina negra RC/RF, placa, galvanizado, estructural. A36 típico en planos.",
    leadTime: "Mostrador mismo día si hay existencia; surtido 1–2 días",
    classification: "mejor_tiempo",
    advantages: "Red local (9 sucursales Juárez + El Paso). Inventario de planos. Horario sábados.",
    disadvantages: "Precio de 0.120 A36 no publicado. Hay que pedir existencia de calibre 11 / 0.120.",
    distanceNote: "Dentro de Cd. Juárez.",
    notes: "Catálogo de materiales para la calculadora. No es una cotización formal.",
  },
  {
    id: "sup-calc-collado-cjs",
    code: "CAL-COL-CJS",
    legalName: "Grupo Collado — Planta Ciudad Juárez",
    phone: "(656) 634 6943 / 800 900 3333",
    address: "Av. de las Torres No. 2445, Col. Los Bravos, C.P. 32575",
    city: "Ciudad Juárez",
    country: "México",
    website: "https://www.collado.com.mx",
    materialAvailable: "Aceros planos, corte, doblez, pintura. Centro de servicio OEM.",
    leadTime: "2–5 días hábiles según proceso (confirmar)",
    classification: "mejor_proveedor",
    advantages: "Certificación, blanks a medida, láser, prensa y pintura.",
    disadvantages: "Puede ser más caro que distribuidor. También es competidor potencial en corte.",
    distanceNote: "Dentro de Cd. Juárez.",
    notes: "Catálogo de materiales para la calculadora.",
  },
  {
    id: "sup-calc-alcalde-cjs",
    code: "CAL-ALC-CJS",
    legalName: "Aceros Alcalde Cd. Juárez",
    phone: "(656) 397 5024",
    address: "Calle Paraguay 1665 Norte, Melchor Ocampo, C.P. 32380",
    city: "Ciudad Juárez",
    country: "México",
    website: "https://www.acerosalcalde.com.mx",
    materialAvailable: "Lámina, placa A36, galvanizado, perfiles.",
    leadTime: "Según existencia",
    classification: "mejor_costo",
    advantages: "Catálogo amplio. Posible mejor precio en commodity.",
    disadvantages: "Teléfono inconsistente según reseñas. Precio 0.120 no publicado.",
    distanceNote: "Dentro de Cd. Juárez.",
    notes: "Catálogo de materiales para la calculadora.",
  },
  {
    id: "sup-calc-kloeckner-cjs",
    code: "CAL-KLO-CJS",
    legalName: "Kloeckner Metals Juárez",
    phone: null,
    address: "C. Ampere No. 8215, Parque Industrial J. Bermúdez, C.P. 32470",
    city: "Ciudad Juárez",
    country: "México",
    website: "https://www.kloecknermetals.com/es/branches/juarez/",
    materialAvailable: "HR, CR, HDGI, inoxidable, aluminio. Blanking y cut-to-length.",
    leadTime: "Service center: típico 3–7 días en blanks",
    classification: "calidad_mill",
    advantages: "Trazabilidad, mill test reports, no ferrosos.",
    disadvantages: "Teléfono de sucursal no publicado. 0.120 A36 sheet hay que confirmar.",
    distanceNote: "Parque industrial Bermúdez, Juárez.",
    notes: "Catálogo de materiales para la calculadora.",
  },
  {
    id: "sup-calc-kalisch-elp",
    code: "CAL-KAL-ELP",
    legalName: "Kalisch Steel — El Paso, TX",
    phone: "(915) 599 2044 / (915) 771 0805",
    address: "6937 Commerce Ave, El Paso, TX 79915",
    city: "El Paso",
    country: "Estados Unidos",
    website: "https://www.kalischsteel.com",
    materialAvailable: "Planos y estructurales; puente si falta calibre en Juárez.",
    leadTime: "1–3 días + cruce si se importa a MX",
    classification: "backup_us",
    advantages: "Respaldo de inventario lado US. Mismo grupo Kalisch.",
    disadvantages: "Importación, pedimento, tiempo de cruce.",
    distanceNote: "El Paso (cruce fronterizo; no es Juárez).",
    notes: "Catálogo de materiales para la calculadora.",
  },
] as const;

const SUPPLIER_PARTIDAS = [
  {
    id: "sm-calc-a36-0120",
    supplierId: "sup-calc-kalisch-cjs",
    position: 1,
    description: "A36 0.120 in (11 ga) hoja 48×96",
    grade: "A36",
    thicknessIn: "0.120",
    costPerKg: "38",
    densityGCm3: "7.85",
    notes: "11 ga nominal. ASTM A36. Costo/kg de referencia, no PO.",
  },
  {
    id: "sm-calc-a36-0250",
    supplierId: "sup-calc-kalisch-cjs",
    position: 2,
    description: "A36 0.250 in hoja 48×96",
    grade: "A36",
    thicknessIn: "0.250",
    costPerKg: "38",
    densityGCm3: "7.85",
    notes: "1/4 in placa/lámina según disponibilidad.",
  },
  {
    id: "sm-calc-a36-0187",
    supplierId: "sup-calc-alcalde-cjs",
    position: 1,
    description: "A36 0.187 in (3/16) hoja 48×96",
    grade: "A36",
    thicknessIn: "0.187",
    costPerKg: "36",
    densityGCm3: "7.85",
    notes: "Referencia de costo commodity.",
  },
  {
    id: "sm-calc-hrpo-0120",
    supplierId: "sup-calc-collado-cjs",
    position: 1,
    description: "HRPO 0.120 in hoja 48×96",
    grade: "A36",
    thicknessIn: "0.120",
    costPerKg: "41",
    densityGCm3: "7.85",
    notes: "Pickled & oiled. Centro de servicio.",
  },
  {
    id: "sm-calc-1018-0125",
    supplierId: "sup-calc-kloeckner-cjs",
    position: 1,
    description: "1018 0.125 in CRS hoja 48×96",
    grade: "1018",
    thicknessIn: "0.125",
    costPerKg: "42",
    densityGCm3: "7.87",
    notes: "CRS; costo de ejemplo.",
  },
  {
    id: "sm-calc-304-0120",
    supplierId: "sup-calc-kloeckner-cjs",
    position: 2,
    description: "304 0.120 in inoxidable hoja 48×96",
    grade: "304",
    thicknessIn: "0.120",
    costPerKg: "95",
    densityGCm3: "8.00",
    notes: "Inoxidable; costo de ejemplo.",
  },
  {
    id: "sm-calc-316-0120",
    supplierId: "sup-calc-kloeckner-cjs",
    position: 3,
    description: "316 0.120 in inoxidable hoja 48×96",
    grade: "316",
    thicknessIn: "0.120",
    costPerKg: "120",
    densityGCm3: "8.00",
    notes: "Inoxidable; costo de ejemplo.",
  },
  {
    id: "sm-calc-5052-0125",
    supplierId: "sup-calc-kloeckner-cjs",
    position: 4,
    description: "Aluminio 5052 0.125 in hoja 48×96",
    grade: "5052",
    thicknessIn: "0.125",
    costPerKg: "85",
    densityGCm3: "2.68",
    notes: "No ferroso; costo de ejemplo.",
  },
  {
    id: "sm-calc-a36-0120-elp",
    supplierId: "sup-calc-kalisch-elp",
    position: 1,
    description: "A36 0.120 in sheet 48×96 (El Paso)",
    grade: "A36",
    thicknessIn: "0.120",
    costPerKg: "44",
    densityGCm3: "7.85",
    notes: "Respaldo US. Costo incluye referencia de cruce, no pedimento real.",
  },
] as const;

export async function seedCalculatorCatalogs(
  db: PostgresJsDatabase,
  actor: { id: string; name: string } | null,
) {
  const now = new Date();

  await db
    .insert(plantRates)
    .values({
      id: PLANT_RATES_ID,
      isPlaceholder: true,
      updatedBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  for (const supplier of STEEL_SUPPLIERS) {
    await db
      .insert(suppliers)
      .values({
        ...supplier,
        paymentTerm: "net_30",
        status: "activo",
        usedInCalculator: true,
        isDemo: false,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: suppliers.id,
        set: {
          usedInCalculator: true,
          isDemo: false,
          updatedAt: now,
        },
      });
  }

  for (const partida of SUPPLIER_PARTIDAS) {
    await db
      .insert(supplierMaterials)
      .values({
        id: partida.id,
        supplierId: partida.supplierId,
        position: partida.position,
        description: partida.description,
        grade: partida.grade,
        thicknessIn: partida.thicknessIn,
        costPerKg: partida.costPerKg,
        sheetWidthIn: "48",
        sheetLengthIn: "96",
        densityGCm3: partida.densityGCm3,
        unit: "kg",
        notes: partida.notes,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: supplierMaterials.id,
        set: {
          description: partida.description,
          grade: partida.grade,
          thicknessIn: partida.thicknessIn,
          costPerKg: partida.costPerKg,
          notes: partida.notes,
          active: true,
          updatedAt: now,
        },
      });
  }

  for (const partida of SUPPLIER_PARTIDAS) {
    const materialId = `mat-${partida.id}`;
    await db
      .insert(materials)
      .values({
        id: materialId,
        code: `MAT-${partida.id.replace("sm-calc-", "").toUpperCase()}`,
        description: partida.description,
        category: "materia_prima",
        unitId: "uom-kg",
        warehouseId: "wh-mp",
        branchId: BRANCH_CJS,
        isCritical: false,
        active: true,
        grade: partida.grade,
        thicknessIn: partida.thicknessIn,
        costPerKg: partida.costPerKg,
        sheetWidthIn: "48",
        sheetLengthIn: "96",
        densityGCm3: partida.densityGCm3,
        supplierId: partida.supplierId,
        supplierMaterialId: partida.id,
        usedInCalculator: true,
        notes: partida.notes,
        isDemo: false,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: materials.id,
        set: {
          usedInCalculator: true,
          isDemo: false,
          branchId: BRANCH_CJS,
          supplierMaterialId: partida.id,
          supplierId: partida.supplierId,
          updatedAt: now,
        },
      });
    const [balance] = await db
      .select({ id: inventoryBalances.id })
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.materialId, materialId),
          eq(inventoryBalances.warehouseId, "wh-mp"),
        ),
      )
      .limit(1);
    if (!balance) {
      await db.insert(inventoryBalances).values({
        id: `bal-${materialId}`,
        materialId,
        warehouseId: "wh-mp",
        onHand: "0",
        reserved: "0",
      });
    }
  }

  console.log("Seeded calculator catalogs (supplier partidas, inventory CJS, machine-fed rates).");
}
