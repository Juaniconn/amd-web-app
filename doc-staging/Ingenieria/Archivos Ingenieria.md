# Archivos Ingeniería

Última actualización: 2026-08-14.  
Almacenamiento: tabla `documents` + disco local (ADR-022). `entity_type = engineering_request`.

Ver [[Proceso Ingenieria]], [[Estados Ingenieria]].

---

## Tipos permitidos

| Extensión | Uso |
|---|---|
| PDF | Plano / especificación para cliente y piso |
| DWG / DXF | CAD 2D |
| STEP / STP | CAD 3D intercambiable |
| IGES / IGS | CAD 3D legado |
| PNG / JPG / JPEG | Capturas, fotos de pieza, markup |
| ZIP | Paquete de revisiones (varios archivos) |

No se aceptan Excel/Word/STL en Ingeniería (esos siguen en la RFQ). No hay visor CAD en AMD Operations.

## Restricciones

1. Máximo **50 MB** por archivo (CAD pesa más que un PDF de cotización; RFQ sigue en 20 MB).
2. Solo se suben o eliminan archivos si la solicitud **no** está `liberado` ni `cancelado`.
3. Tras `Liberado`, el paquete queda congelado: ese es el plano vigente para cotización final y OP.
4. No hay control de versiones PDM. Cada archivo es una revisión más en la misma solicitud; el nombre del archivo debe incluir la revisión (regla operativa, no validada en código).
5. Descarga autenticada: `GET /api/documents/[id]` exige `engineering:read`.
6. Checksum SHA-256 y `object_key` como en cotizaciones. Runtime: storage local, no R2.
7. Datos `is_demo` no son planos reales de AMD.

## Relación con archivos de RFQ

- Escenario B: el plano del cliente puede vivir en la cotización. Si se abre validación, Ingeniería puede tener **copia o derivado** en la solicitud.
- Escenario A: el CAD de trabajo vive en la solicitud. La RFQ puede adjuntar el brief.
- Producción (Fase 5) debe leer primero documentos de la solicitud `liberado`, no un adjunto suelto de WhatsApp en la RFQ.
