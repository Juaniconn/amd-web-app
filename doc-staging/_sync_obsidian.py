#!/usr/bin/env python3
"""Copy Obsidian vault files from doc-staging/ to docs/. No code, no DB."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path("/home/juaniconn/projects/amd-app")
DOCS = ROOT / "docs"
STAGING = ROOT / "doc-staging"

FILES = (
    "roadmap.md",
    "AMD_OPERATIONS_BUSINESS_SPEC.md",
    "AMD_OPERATIONS_TECHNICAL_SPEC.md",
    "ARCHITECTURE_DECISIONS.md",
)
FOLDERS = ("Procesos", "modules", "Produccion", "Ingenieria", "changelogs", "executive-summary", "audits")


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
            print(f"copied {target.relative_to(DOCS)}")


def main() -> None:
    if not DOCS.is_dir():
        raise SystemExit(f"docs vault missing: {DOCS}")
    for name in FILES:
        src = STAGING / name
        if not src.is_file():
            raise SystemExit(f"missing {src}")
        shutil.copy2(src, DOCS / name)
        print(f"copied {name}")
    for folder in FOLDERS:
        src = STAGING / folder
        if src.is_dir():
            copy_tree(src, DOCS / folder)
    print("\n======= DOCS TREE (sin .obsidian) =======")
    for p in sorted(DOCS.rglob("*")):
        if ".obsidian" in p.parts:
            continue
        kind = "DIR " if p.is_dir() else "FILE"
        print(f"{kind} {p.relative_to(DOCS)}")
    print("\nOK")


if __name__ == "__main__":
    main()
