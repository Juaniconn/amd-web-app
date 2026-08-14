# Rutas de Fabricación

Última actualización: 2026-08-13.  
Decisión de negocio ADR-028. **No hay tabla de rutas ni UI.** Semilla para que Planeación de piso asigne operaciones a una OP (Fase 5).

El paso **Ingeniería** de estas rutas es el módulo formal de diseño/CAD (Fase 4, ADR-031), no la programación de VMC/láser. No confundir escenarios de negocio A/B (¿AMD diseña?) con rutas de piso A/B/C (CNC / lámina / EDM).

Ver [[Flujo Orden Produccion]], [[Centros de Trabajo]], [[Maquinas]], [[Estados Produccion]], ADR-025, ADR-028.

---

## Principio

Una OP sigue una **ruta**: secuencia de centros (y, al programar, máquina + operador).  
Las tres rutas de abajo son el catálogo **inicial**. El administrador podrá crear, editar, desactivar y eliminar rutas futuras (mismo patrón que [[Maquinas]]).

Hoy no hay código. `convertQuoteToOrder` no elige ruta.

Press Brake en la Ruta B es el **tipo de máquina**; el centro asociado es **Doblado**.

---

## Ruta A — Pieza maquinada

```
RFQ
    ↓
Ingeniería
    ↓
CNC
    ↓
Calidad
    ↓
Entrega
```

| Paso | Qué es | Estado en el sistema |
|---|---|---|
| RFQ | Cotización; compromiso al convertir a pedido | ✅ |
| Ingeniería | Manufacturabilidad y confirmación de esta ruta | ⬜ |
| CNC | Centro CNC (máquinas verticales configurables) | ⬜ |
| Calidad | Inspección y permiso **Liberar Calidad** | ⬜ |
| Entrega | Embarque; permiso **Cerrar Orden** | ⬜ |

Uso típico: pieza de aluminio, acero o inox en CNC vertical. No incluye torno, láser ni EDM. Si la pieza requiere torno u otro centro, no forzar Ruta A: usar una ruta futura o ampliar esta (admin).

---

## Ruta B — Gabinete metálico

```
RFQ
    ↓
Ingeniería
    ↓
Láser
    ↓
Press Brake
    ↓
Soldadura
    ↓
Calidad
    ↓
Entrega
```

| Paso | Centro / recurso | Estado |
|---|---|---|
| RFQ | Cotización → pedido mínimo | ✅ |
| Ingeniería | Definir lámina, doblados, soldadura | ⬜ |
| Láser | Centro Láser | ⬜ |
| Press Brake | Centro **Doblado**, máquina tipo Press Brake | ⬜ |
| Soldadura | Centro Soldadura (estaciones aún no numeradas) | ⬜ |
| Calidad | Liberar Calidad | ⬜ |
| Entrega | Cerrar Orden | ⬜ |

Uso típico: gabinetes y brackets de lámina. Ensamble posterior no está en esta ruta inicial; si planta lo necesita, se agrega como ruta futura.

---

## Ruta C — Pieza Wire EDM

```
RFQ
    ↓
Ingeniería
    ↓
CNC
    ↓
Wire EDM
    ↓
Calidad
    ↓
Entrega
```

| Paso | Centro | Estado |
|---|---|---|
| RFQ | Cotización → pedido | ✅ |
| Ingeniería | Premaquinado + electroerosión | ⬜ |
| CNC | Desbaste / preparación | ⬜ |
| Wire EDM | Alta precisión, herramental, moldes, geometrías complejas | ⬜ |
| Calidad | Liberar Calidad | ⬜ |
| Entrega | Cerrar Orden | ⬜ |

Uso típico: herramental, moldes, geometría que el CNC solo no cierra.

---

## Rutas futuras (configurables)

El administrador podrá definir rutas adicionales, por ejemplo (no son catálogo cerrado ni semilla obligatoria):

- Torneado (Tornos → Calidad)
- Lámina sin soldadura (Láser → Doblado → Calidad)
- Router / no metales
- Moldeo
- Prototipado 3D (Ultimaker S5)
- Con rectificado o ensamble

Atributos diseñados de una ruta (no persistidos):

- Nombre
- Código o identificador
- Secuencia de centros (orden)
- Activo / Inactivo
- Observaciones

Una OP referencia **una ruta** (o una copia de la secuencia al crearse, para no romper historial si el admin edita la plantilla). Esa mecánica se decide en implementación; no hay código.

No inventar rutas por cliente o número de parte hasta que Dirección las pida.

---

## Relación con permisos

| Momento en la ruta | Permiso operativo (diseño) |
|---|---|
| Pasar de OP Pendiente a piso | Autorizar Producción |
| Entregar insumo a la operación | Liberar Material (Inventario ⬜) |
| Asignar máquina/operador/ventana | Programar Máquinas |
| Calidad → Terminada | Liberar Calidad |
| OP Terminada → Entregada / cierre | Cerrar Orden |

Detalle: [[Operadores y Roles]]. Quién programa y quién libera: ADR-030 (aprobado).
