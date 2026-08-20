import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogPagedTable } from "@/components/layout/catalog-paged-table";
import { requirePermission } from "@/lib/auth/session";
import { displayMoney } from "@/lib/quotes/money";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  listCalculatorMachines,
  listCalculatorMaterials,
  listCalculatorSuppliers,
} from "@/server/services/calculator";

export default async function CalculatorSettingsPage() {
  await requirePermission(PERMISSION_IDS.quotesRead);
  const [sheetMaterials, plantMachines, steelSuppliers] = await Promise.all([
    listCalculatorMaterials(),
    listCalculatorMachines(),
    listCalculatorSuppliers(),
  ]);
  const missingTariff = plantMachines.filter((row) => !row.hourlyCost);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Calculadora</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimado general para cotizar con plano PDF y CAD. Las tarifas salen de cada
          máquina (según su centro). Los materiales salen de las partidas del proveedor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cómo se arma el estimado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Costo = material (kg × MXN/kg de la partida del proveedor) + tiempo de cada
            centro con tarifa de su máquina + CAM de primer artículo + empaque. Precio de
            venta = costo / (1 − margen%). El margen vive en la partida (30% por defecto).
          </p>
          <p>
            El grado y el espesor del plano buscan la partida en Proveedores. La hora de
            cada proceso sale de la ficha de la máquina de ese centro. Si falta tarifa, el
            estimado avisa y usa un valor de referencia interno.
          </p>
          {missingTariff.length > 0 ? (
            <Badge variant="outline">
              {missingTariff.length} máquina(s) sin tarifa hora
            </Badge>
          ) : (
            <Badge variant="secondary">Máquinas con tarifa capturada</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CatalogPagedTable
            title="Materiales"
            href="/suppliers"
            hrefLabel="Abrir proveedores"
            headers={["Proveedor", "Descripción", "Grado", "Espesor", "MXN/kg"]}
            colSpan={5}
            empty="Agrega partidas de material en la ficha del proveedor."
            rows={sheetMaterials.map((row) => ({
              id: row.id,
              searchText: [row.supplierName, row.description, row.grade, row.thicknessIn]
                .filter(Boolean)
                .join(" "),
              cells: [
                <Link key="s" href={`/suppliers/${row.supplierId}`} className="hover:underline">
                  {row.supplierName}
                </Link>,
                row.description,
                row.grade ?? "—",
                row.thicknessIn ? `${row.thicknessIn} in` : "—",
                row.costPerKg ? displayMoney(row.costPerKg, "mxn") : "—",
              ],
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CatalogPagedTable
            title="Máquinas"
            href="/machines"
            hrefLabel="Abrir máquinas"
            headers={["Máquina", "Centro", "Tarifa", "Capacidad"]}
            colSpan={4}
            empty="Da de alta máquinas y captura la tarifa del centro."
            rows={plantMachines.map((row) => ({
              id: row.id,
              searchText: [row.brand, row.model, row.name, row.workCenterName]
                .filter(Boolean)
                .join(" "),
              cells: [
                <Link key="m" href={`/machines/${row.id}`} className="hover:underline">
                  {[row.brand, row.model || row.name].filter(Boolean).join(" ")}
                </Link>,
                row.workCenterName,
                row.hourlyCost ? displayMoney(row.hourlyCost, "mxn") : "Sin tarifa",
                row.workCenterCode === "doblado"
                  ? `${row.tonnageTon ?? "—"} t · ${row.bendLengthMm ?? "—"} mm`
                  : row.workCenterName,
              ],
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CatalogPagedTable
            title="Proveedor"
            href="/suppliers"
            hrefLabel="Abrir proveedores"
            headers={["Proveedor", "Ciudad", "Teléfono"]}
            colSpan={3}
            empty="Captura partidas de material en Proveedores."
            rows={steelSuppliers.map((row) => ({
              id: row.id,
              searchText: [row.legalName, row.city, row.phone].filter(Boolean).join(" "),
              cells: [
                <Link key="p" href={`/suppliers/${row.id}`} className="hover:underline">
                  {row.legalName}
                </Link>,
                row.city ?? "—",
                row.phone ?? "—",
              ],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
