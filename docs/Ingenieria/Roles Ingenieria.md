# Roles Ingeniería

Última actualización: 2026-08-14.  
ADR-036, ADR-037, ADR-041.

Puestos de proceso y su mapeo a `src/lib/permissions/catalog.ts`.

Rol RBAC: **`ingenieria`**. Permisos `engineering:*`.

Ver [[Operadores y Roles]] (piso), ADR-029, ADR-031, ADR-033.

---

## Ingeniero de Diseño y Manufactura / Programador CNC

Puesto responsable principal (ADR-036). Un puesto, dos sombreros: CAD y CAM.

- Ejecutar la solicitud: SolidWorks / AutoCAD, modificación, reverse engineering, prototipo digital.
- Programar CAM (Mastercam / Fusion 360) **fuera** del ERP; adjuntar el programa exportado cuando aplique.
- Registrar horas reales de ingeniería.
- Subir revisiones `AMD-PART-XXXX_REV-*`.
- Participar en DFM.
- No convierte cotizaciones (`quotes:write` es de Ventas, salvo que un usuario tenga ambos roles).
- No programa máquinas de piso (Supervisor de Producción, ADR-030).

En RBAC: rol `ingenieria`.

---

## Líder de Ingeniería (mismo rol RBAC en MVP)

- Crear/asignar solicitudes.
- Revisión interna y DFM.
- Firma de **Diseño Interno** (junto con Gerente de Operaciones).
- Liberar (`Liberado` = Aprobado para manufactura).
- Escalar al cliente vía Ejecutivo de Ventas Técnicas.

No hay `role_id` separado líder vs ingeniero: ambos usan `ingenieria`. La distinción es operativa (quién pulsa Liberar / quién firma).

---

## Gerente de Operaciones

- Segunda firma de **Diseño Interno** (ADR-037).
- No existe como `role_id`. Cubrir con Dirección o usuario con roles combinados.
- En Compras urgentes sigue siendo el autorizador **futuro** (ADR-030 / ADR-043).

---

## Ejecutivo de Ventas Técnicas (rol Ventas)

- Alta de RFQ, tipo, flag Requiere Ingeniería y adjuntos.
- Abrir (o auto-crear) la solicitud cuando el cliente no trae plano o pide diseño.
- **Canal único** con el cliente para envío de planos y registro de aprobación / correcciones (`engineering:approve`).
- Cotización final y conversión tras `Liberado` en flujo A.
- Considerar cliente estratégico al cotizar (definición ADR-043; flag CRM ⬜).

---

## Cliente (externo)

Actores que firman **Diseño Cliente** (no son usuarios):

- Cliente
- Ingeniería del cliente
- Calidad del cliente

Entrega brief o plano. Aprueba o pide correcciones. La aprobación la registra Ventas Técnicas.

---

## Jefe de Taller / Producción

- Consulta el plano (`engineering:read`).
- Participa en DFM (ADR-041). No hay permiso de firma DFM en el catálogo.
- Recibe el paquete **Liberado** para la OP (Fase 5).

---

## Calidad AMD

- Consulta cotas/tolerancias del plano (`engineering:read`).
- Inspección de pieza es Fase 8; no es aprobación de CAD.
- Retrabajos de piso: [[Proceso Calidad]] (no es retrabajo de ingeniería).

---

## Matriz

| Acto | Permiso | Roles |
|---|---|---|
| Ver solicitudes / KPIs | `engineering:read` | Admin, Dirección, Ventas, Ingeniería, Producción, Calidad |
| Crear solicitud | `engineering:create` | Admin, Ventas, Ingeniería |
| Editar / horas / archivos / diseño | `engineering:update` | Admin, Ingeniería |
| Asignar | `engineering:assign` | Admin, Ingeniería |
| Aprobar / enviar a cliente / correcciones | `engineering:approve` | Admin, Ventas, Ingeniería |
| Liberar | `engineering:release` | Admin, Ingeniería |
| Archivar pendiente/cancelada | `engineering:delete` | Admin, Ingeniería |
| Firmar DFM como Jefe de Taller | ⬜ no existe | Producción solo lee |
| Segunda firma Gerente de Operaciones | ⬜ no existe | — |
