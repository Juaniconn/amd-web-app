# Roles Ingeniería

Última actualización: 2026-08-14.

Puestos de proceso y su mapeo a `src/lib/permissions/catalog.ts`.

Rol RBAC nuevo: **`ingenieria`**. Permisos `engineering:*`.

Ver [[Operadores y Roles]] (piso), ADR-029, ADR-031, ADR-033.

---

## Ingeniero Diseño (rol Ingeniería)

- Ejecutar la solicitud: CAD, modificación, reverse engineering, prototipo digital.
- Registrar horas de ingeniería.
- Subir revisiones de plano.
- No convierte cotizaciones (`quotes:write` es de Ventas, salvo que un usuario tenga ambos roles).
- No programa máquinas de piso (Supervisor de Producción, ADR-030).

---

## Supervisor Ingeniería (mismo rol RBAC en MVP)

- Crear/asignar solicitudes.
- Revisión interna.
- Liberar (`Liberado`) hacia cotización final / producción.
- Escalar al cliente vía Ventas.

En MVP no hay `role_id` separado supervisor vs ingeniero: ambos usan `ingenieria`. La distinción es operativa (quién pulsa Liberar).

---

## Ventas

- Alta de RFQ, tipo, flag Requiere Ingeniería y adjuntos.
- Abrir (o auto-crear) la solicitud cuando el cliente no trae plano o pide diseño.
- Registrar aprobación o correcciones del cliente (`engineering:approve`).
- Cotización final y conversión tras `Liberado` en escenario A.

---

## Cliente

- Actor **externo**. No es usuario de AMD Operations.
- Entrega brief o plano.
- Aprueba o pide correcciones.
- La aprobación la registra un usuario interno.

---

## Producción

- Consulta el plano vigente (`engineering:read`).
- Validación de manufacturabilidad (acto de revisión interna; no hay pantalla aparte).
- Recibe el plano **liberado** para la OP (Fase 5).

---

## Calidad

- Consulta cotas/tolerancias del plano (`engineering:read`).
- Inspección de pieza es Fase 8; no es aprobación de CAD.

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
