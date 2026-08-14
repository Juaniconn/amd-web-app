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
3. Tras `Liberado`, el paquete queda congelado: **Aprobado para manufactura**. Es el único que Producción puede usar (planos, modelos, programas CAM).
4. Nomenclatura oficial: `AMD-PART-XXXX_REV-A` (ADR-038, [[Control Documental]]). No hay PDM. El código **no** valida el patrón; es disciplina operativa.
5. Software de origen: SolidWorks, AutoCAD, Mastercam, Fusion 360. Se adjuntan exportados, no se integra el CAD.
6. Descarga autenticada: `GET /api/documents/[id]` exige `engineering:read`.
7. Checksum SHA-256 y `object_key` como en cotizaciones. Runtime: storage local, no R2.
8. Datos `is_demo` no son planos reales de AMD.
9. Cambio posterior a Liberado: [[ECO ECN]] (nueva revisión), no reemplazar archivos.

## Relación con archivos de RFQ

- Escenario B: el plano del cliente puede vivir en la cotización. Si se abre validación, Ingeniería puede tener **copia o derivado** en la solicitud.
- Escenario A: el CAD de trabajo vive en la solicitud. La RFQ puede adjuntar el brief.
- Producción (Fase 5) debe leer primero documentos de la solicitud `liberado`, no un adjunto suelto de WhatsApp en la RFQ.
