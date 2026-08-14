#!/usr/bin/env python3
"""Apply Obsidian documentation updates to docs/ without rewriting master specs."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path("/home/juaniconn/projects/amd-app")
DOCS = ROOT / "docs"
STAGING = ROOT / "doc-staging"
PATCHES = STAGING / "_patches"

MARKER_BIZ = "# 0. ESTADO DE IMPLEMENTACIÓN"
MARKER_TECH = "# 0. ESTADO TÉCNICO ACTUAL"
MARKER_ADR021 = "# ADR-021 — Estructura de documentación Obsidian"
MARKER_ADR020_IMPACTO = "## Impacto"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    print(f"updated {path}")


def insert_after_first(text: str, needle: str, insertion: str) -> str:
    idx = text.find(needle)
    if idx < 0:
        raise SystemExit(f"needle not found: {needle!r}")
    end = idx + len(needle)
    return text[:end] + insertion + text[end:]


def replace_all_exact(text: str, old: str, new: str) -> tuple[str, int]:
    count = text.count(old)
    return text.replace(old, new), count


def patch_business() -> None:
    path = DOCS / "AMD_OPERATIONS_BUSINESS_SPEC.md"
    text = read(path)
    if MARKER_BIZ in text:
        print("business spec already has section 0; skip insert")
    else:
        section0 = read(PATCHES / "business_section_0.md").rstrip() + "\n"
        # After the first horizontal rule that closes the opening context.
        needle = "Esta plataforma será el centro operativo de AMD.\n\n---\n"
        if needle not in text:
            raise SystemExit("business insert anchor not found")
        text = text.replace(needle, needle + "\n" + section0 + "\n", 1)

    replacements = [
        ("## FASE 1 — FUNDACIÓN\n", "## FASE 1 — FUNDACIÓN ✅ Completado\n"),
        ("## FASE 2 — CRM\n", "## FASE 2 — CRM ✅ Completado\n"),
        ("## FASE 3 — COTIZACIONES\n", "## FASE 3 — COTIZACIONES ⬜ Pendiente\n"),
        ("## FASE 4 — PEDIDOS\n", "## FASE 4 — PEDIDOS ⬜ Pendiente\n"),
        ("## FASE 5 — PRODUCCIÓN\n", "## FASE 5 — PRODUCCIÓN ⬜ Pendiente\n"),
        ("## FASE 6 — INVENTARIO\n", "## FASE 6 — INVENTARIO ⬜ Pendiente\n"),
        ("## FASE 7 — COMPRAS\n", "## FASE 7 — COMPRAS ⬜ Pendiente\n"),
        ("## FASE 8 — CALIDAD Y ENTREGAS\n", "## FASE 8 — CALIDAD Y ENTREGAS ⬜ Pendiente\n"),
        ("## FASE 9 — REPORTES\n", "## FASE 9 — REPORTES ⬜ Pendiente\n"),
    ]
    for old, new in replacements:
        if new in text:
            continue
        text, n = replace_all_exact(text, old, new)
        print(f"  business phase marker {old.strip()!r} x{n}")

    cliente_note = (
        "# 7. MÓDULO CLIENTES\n\n"
        "> **Estado 2026-08-13:** ✅ Implementado (Fase 2). "
        "Cotizaciones, pedidos, producción, facturación, pagos y documentos "
        "en la ficha son placeholders. Ver [[crm]].\n\n"
    )
    if "> **Estado 2026-08-13:** ✅ Implementado (Fase 2)." not in text:
        text, n = replace_all_exact(text, "# 7. MÓDULO CLIENTES\n\n", cliente_note)
        print(f"  section 7 note x{n}")

    contact_note = (
        "# 8. MÓDULO CONTACTOS\n\n"
        "> **Estado 2026-08-13:** ✅ Implementado (Fase 2). Ver [[crm]].\n\n"
    )
    if "# 8. MÓDULO CONTACTOS\n\n> **Estado 2026-08-13:**" not in text:
        text, n = replace_all_exact(text, "# 8. MÓDULO CONTACTOS\n\n", contact_note)
        print(f"  section 8 note x{n}")

    success_note = (
        "Consideraré que el MVP funciona cuando pueda realizar este flujo completamente:\n\n"
        "> **Progreso 2026-08-13:** solo el paso 1 (crear cliente) está ✅. "
        "Pasos 2–22 permanecen ⬜. El MVP aún no está cerrado.\n\n"
    )
    if "**Progreso 2026-08-13:**" not in text:
        text, n = replace_all_exact(
            text,
            "Consideraré que el MVP funciona cuando pueda realizar este flujo completamente:\n\n",
            success_note,
        )
        print(f"  section 54 note x{n}")

    write(path, text)


def patch_technical() -> None:
    path = DOCS / "AMD_OPERATIONS_TECHNICAL_SPEC.md"
    text = read(path)
    if MARKER_TECH in text:
        print("technical spec already has section 0; skip insert")
    else:
        section0 = read(PATCHES / "tech_section_0.md").rstrip() + "\n"
        needle = (
            "> Ambos documentos deben leerse conjuntamente y tratarse como una única fuente de verdad.\n\n---\n"
        )
        if needle not in text:
            raise SystemExit("technical insert anchor not found")
        text = text.replace(needle, needle + "\n" + section0 + "\n", 1)

    replacements = [
        ("FASE 1 — FUNDACIÓN\n", "FASE 1 — FUNDACIÓN ✅ Completado\n"),
        ("FASE 2 — CRM\n", "FASE 2 — CRM ✅ Completado\n"),
        ("FASE 3 — COTIZACIONES\n", "FASE 3 — COTIZACIONES ⬜ Pendiente\n"),
        ("FASE 4 — PEDIDOS\n", "FASE 4 — PEDIDOS ⬜ Pendiente\n"),
        ("FASE 5 — PRODUCCIÓN\n", "FASE 5 — PRODUCCIÓN ⬜ Pendiente\n"),
        ("FASE 6 — INVENTARIO\n", "FASE 6 — INVENTARIO ⬜ Pendiente\n"),
        ("FASE 7 — COMPRAS\n", "FASE 7 — COMPRAS ⬜ Pendiente\n"),
        ("FASE 8 — CALIDAD Y ENTREGAS\n", "FASE 8 — CALIDAD Y ENTREGAS ⬜ Pendiente\n"),
        ("FASE 9 — REPORTES\n", "FASE 9 — REPORTES ⬜ Pendiente\n"),
    ]
    for old, new in replacements:
        if new in text:
            continue
        text, n = replace_all_exact(text, old, new)
        print(f"  technical phase marker {old.strip()!r} x{n}")

    write(path, text)


def patch_adrs() -> None:
    path = DOCS / "ARCHITECTURE_DECISIONS.md"
    text = read(path)

    addendum = read(PATCHES / "adr_020_addendum.md").rstrip() + "\n"
    adr020_body = text.split("# ADR-020", 1)[-1] if "# ADR-020" in text else ""
    already_has_impacto = "## Impacto\n\n- El maestro de clientes" in adr020_body
    if already_has_impacto:
        print("  ADR-020 already has Impacto addendum")
    else:
        adr020_fecha = (
            "## Razón\n\n"
            "Cumple el alcance de Fase 2 reutilizando auth, layout, RBAC y Server Actions de Fase 1.\n\n"
            "## Fecha\n"
        )
        if adr020_fecha in text:
            text = text.replace(
                adr020_fecha,
                "## Razón\n\n"
                "Cumple el alcance de Fase 2 reutilizando auth, layout, RBAC y Server Actions de Fase 1.\n\n"
                + addendum
                + "\n## Fecha\n",
                1,
            )
            print("  ADR-020 Impacto/Consecuencias inserted")
        else:
            print("WARNING: ADR-020 Fecha anchor not found; dump nearby")
            idx = text.find("# ADR-020")
            print(text[idx : idx + 1200] if idx >= 0 else "ADR-020 missing")

    if MARKER_ADR021 in text:
        print("  ADR-021 already present")
    else:
        adr021 = read(PATCHES / "adr_021.md").rstrip() + "\n"
        plantilla = "# PLANTILLA PARA NUEVAS DECISIONES"
        if plantilla not in text:
            raise SystemExit("ADR template heading not found")
        text = text.replace(plantilla, adr021 + "\n---\n\n" + plantilla, 1)
        print("  ADR-021 inserted")

    write(path, text)


def copy_tree(src: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if item.name.startswith("_"):
            continue
        target = dest / item.name
        if item.is_dir():
            copy_tree(item, target)
        else:
            shutil.copy2(item, target)
            print(f"copied {item} -> {target}")


def copy_staging() -> None:
    shutil.copy2(STAGING / "roadmap.md", DOCS / "roadmap.md")
    print("copied roadmap.md")
    for name in (
        "AMD_OPERATIONS_BUSINESS_SPEC.md",
        "AMD_OPERATIONS_TECHNICAL_SPEC.md",
        "ARCHITECTURE_DECISIONS.md",
    ):
        src = STAGING / name
        if src.is_file():
            shutil.copy2(src, DOCS / name)
            print(f"copied {name}")
    for folder in ("changelogs", "modules", "executive-summary", "audits", "Produccion"):
        src = STAGING / folder
        if src.is_dir():
            copy_tree(src, DOCS / folder)
    procesos_src = STAGING / "Procesos"
    procesos_dest = DOCS / "Procesos"
    procesos_dest.mkdir(parents=True, exist_ok=True)
    for item in procesos_src.iterdir():
        shutil.copy2(item, procesos_dest / item.name)
        print(f"copied {item.name} -> Procesos/")


def inventory() -> None:
    print("\n======= DOCS TREE =======")
    for p in sorted(DOCS.rglob("*")):
        if ".obsidian" in p.parts:
            continue
        rel = p.relative_to(DOCS)
        kind = "DIR " if p.is_dir() else "FILE"
        print(f"{kind} {rel}")


def main() -> None:
    if not DOCS.is_dir():
        raise SystemExit(f"docs vault missing: {DOCS}")
    patch_business()
    patch_technical()
    patch_adrs()
    copy_staging()
    inventory()
    print("\nOK")


if __name__ == "__main__":
    main()
