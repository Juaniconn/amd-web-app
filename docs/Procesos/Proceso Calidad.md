# Proceso Calidad

Última actualización: 2026-08-14.  
Fuente de diseño: BUSINESS_SPEC §27 y Regla 9, ADR-030, **ADR-043**.  
Estado real: **no implementado.** No hay tabla `quality_inspections`, ruta `/quality` ni permisos `quality:*`.

El rol Calidad tiene `dashboard:read` y `engineering:read` (planos vigentes).

Ver [[quality]], [[Proceso Producción]], [[Estados Produccion]], [[Flujo Orden Produccion]], [[engineering]].

---

# Objetivo

Inspeccionar producto (primera pieza, en proceso y final), registrar resultado y **liberar** o devolver a producción. Sin liberación de calidad, la OP no debe pasar a entrega cuando el trabajo lo requiera (Regla 9).

Hoy: el proceso no corre. El plano de referencia, si hubo ingeniería, es el paquete **Liberado**.

---

# Cierre físico vs administrativo (ADR-043)

| Cierre | Quién | Qué sella |
|---|---|---|
| **Físico** | Inspector de Calidad | El producto (Liberar Calidad) |
| **Administrativo** | Supervisor de Producción | La OP (Cerrar Orden) |

Calidad no cierra administrativamente la orden. El Supervisor es alternativa de liberación de producto si no hay inspector (ADR-030).

---

# Retrabajos (oficial, no persistido)

Cada retrabajo de piso debe registrar:

| Campo | Uso |
|---|---|
| OP | Orden de producción |
| Parte | Número / `AMD-PART-XXXX_REV-*` |
| Cantidad | Piezas afectadas |
| Scrap | Cantidad no recuperable |
| Causa raíz | Texto / catálogo futuro |
| Horas hombre | Retrabajo |
| Horas máquina | Retrabajo |
| Liberación calidad | Sello tras el retrabajo |

Distinto de **retrabajo de ingeniería** (`correcciones` / ECO). Este catálogo es de Calidad/piso.

---

# Flujo General

```
OP en estado Calidad ⬜
    → Inspección primera pieza ⬜
    → Inspección en proceso ⬜
    → Inspección final ⬜
    → Resultado (Aprobado / Aprobado con observaciones / Rechazado) ⬜
    → Retrabajo o no conformidad si aplica ⬜
    → Liberación física ⬜  → Cierre administrativo ⬜ → Entregas
```

Plano de inspección: Liberado de Ingeniería (flujo A) o adjunto de RFQ (flujo B).

---

# KPI relacionados

Diseñados (ADR-030): inspecciones pendientes, rechazos, no conformidades. Ninguno se calcula. Scrap alimentará KPI de producción cuando exista.

Ver [[KPI Produccion]], [[Proceso Ingenieria]].
