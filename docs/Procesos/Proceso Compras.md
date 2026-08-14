# Proceso Compras

Última actualización: 2026-08-14.  
ADR-030, **ADR-043**. Fase **7** vigente. **No implementado.**

Ver [[purchasing]], [[inventory]], [[Proceso Producción]].

---

# Objetivo

Cubrir faltantes de material: solicitud → orden de compra → recepción → inventario.

---

# Material crítico (definición oficial)

Un ítem es **material crítico** si cumple cualquiera:

- Inconel
- Titanio
- Aceros especiales
- PEEK
- Proveedor único
- Lead time > 15 días

KPI Dirección: «Material crítico» (Fase 11; no hay cifras hoy).

---

# Compras urgentes

**Autoriza:** Dirección General. **Futuro:** Gerente de Operaciones.

Condiciones oficiales (ADR-043):

- Riesgo de paro de producción
- Cliente estratégico
- Penalización contractual
- Material defectuoso

Sin módulo de compras no hay OC. La regla queda documentada para Fase 7.

---

# Flujo General

```
Faltante ⬜ → Solicitud ⬜ → OC ⬜ → Recepción ⬜ → Inventario ⬜
```

Una recepción debe generar movimiento de inventario (ADR-009). No ejecutable.

# Responsables

Diseñados: Compras, Almacén. En el sistema solo tienen `dashboard:read`.

# KPI

Placeholders: «Material por comprar · Fase 6», «Compras pendientes» (tablero Dirección).
