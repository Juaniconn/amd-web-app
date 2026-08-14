# Control Documental — Ingeniería

Última actualización: 2026-08-14.  
ADR-038, ADR-040. Ver [[Archivos Ingenieria]], [[Proceso Ingenieria]], [[Flujo Ingenieria]], [[Proceso Producción]].

Regla operativa validada por Dirección. El código **no** valida aún el patrón de nombre ni un campo `revision` en `documents`.

---

# Nomenclatura oficial

```
AMD-PART-XXXX_REV-A
AMD-PART-XXXX_REV-B
AMD-PART-XXXX_REV-C
```

| Parte | Significado |
|---|---|
| `AMD-PART` | Prefijo de pieza AMD México |
| `XXXX` | Consecutivo de parte (operativo; sin generador en AMD Operations) |
| `REV-A` … | Revisión. La primera liberación es A; cada ECO/ECN avanza una letra |

El nombre del archivo exportado (PDF, DWG, STEP, programa CAM) **debe** incluir esta nomenclatura. Hasta que exista validación en código, es disciplina de Ingeniería.

Software de origen (no se sube el nativo como fuente de verdad del piso):

- SolidWorks (modelo 3D)
- AutoCAD (2D)
- Mastercam / Fusion 360 (programas CAM)

En AMD Operations se adjuntan los **exportados** permitidos ([[Archivos Ingenieria]]).

---

# Estados del paquete

| Estado de solicitud | Sello de negocio | ¿Piso puede usarlo? |
|---|---|---|
| Cualquiera anterior a `liberado` | Trabajo en curso | No |
| `aprobado` | Cliente aceptó el diseño | No (falta sello de manufactura) |
| `liberado` | **Aprobado para manufactura** | Sí |
| `cancelado` | Muerto | No |

**Solo archivos en estado Liberado pueden utilizarse en Producción.**

---

# Trazabilidad hacia Producción

```
Cliente
    → RFQ (quotes)
        → Solicitud ING-YYYY-NNNNN
            → Archivos documents (entity_type = engineering_request)
                → Liberado = Aprobado para manufactura
                    → Pedido (orders.origin = rfq_ingenieria, engineering_request_id)
                        → OP (Fase 5)
```

Si origen `rfq_directa`, el plano vigente es el adjunto de la cotización (escenario flujo B, cobro A).

Producción consume únicamente:

- Planos
- Modelos
- Programas CAM

del paquete **Liberado**. Un PDF suelto en WhatsApp o un adjunto de RFQ no sustituye ese paquete cuando hubo ingeniería.

Tras Liberado los archivos de la solicitud quedan congelados. Un cambio posterior es [[ECO ECN]], no editar el paquete.

---

# Qué no es este control

- No es PDM de SolidWorks.
- No hay visor CAD.
- No hay campo `revision` / `part_number` en `documents` (cambio recomendado, no bloqueante para abrir Fase 5).
