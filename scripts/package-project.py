#!/usr/bin/env python3
"""Package the current FLOWTRACE source into one clean, portable folder.

Usage from the project root:
    python scripts/package-project.py
    python scripts/package-project.py --output /path/to/FLOWTRACE_FINAL.zip

Requires Python 3.10+ and Git. Does not package dependencies or private settings.
"""
from __future__ import annotations

import argparse
from pathlib import Path, PurePosixPath
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRECTORIES = {
    ".git", ".webdev", ".manus-logs", "node_modules", ".pnpm-store",
    ".venv", "venv", "__pycache__", ".pytest_cache", "dist", "build",
    "coverage", "output",
}
EXCLUDED_FILES = {"TODO.md", "plan.md", "template.json"}
REQUIRED_FILES = {
    "START_HERE.md", "PROJECT_STRUCTURE.md", "README.md", ".env.example",
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "Dockerfile",
    "client/src/App.tsx", "client/src/pages/Home.tsx",
    "client/src/pages/Explorer.tsx", "client/src/pages/Compare.tsx",
    "client/src/pages/Insights.tsx", "client/src/pages/Evidence.tsx",
    "client/src/pages/Simulation.tsx", "client/src/lib/simulation.ts",
    "client/public/space-orbit.webp", "client/public/manus-routes.json",
    "server/_core/index.ts", "server/flowtraceProxy.ts",
    "backend/app/main.py", "backend/app/data/bass2_tests.csv",
    "backend/requirements.txt", "backend/.gitignore",
    "SIMULATION_PLAN.md", "SIMULATION_GUIDE.md", "SIMULATION_SOURCES.md",
}


def include_file(name: str) -> bool:
    path = PurePosixPath(name)
    if not name or path.is_absolute() or ".." in path.parts:
        return False
    if any(part in EXCLUDED_DIRECTORIES for part in path.parts):
        return False
    if name.startswith(".manus") or name in EXCLUDED_FILES:
        return False
    if path.name.startswith(".env") and path.name != ".env.example":
        return False
    if path.suffix in {".bak", ".log", ".pyc", ".zip"}:
        return False
    source = ROOT / name
    return source.is_file() and not source.is_symlink()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT.parent / "output" / "FLOWTRACE_FINAL.zip")
    arguments = parser.parse_args()
    output = arguments.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        candidates = subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT,
        ).decode().split("\0")
    except (OSError, subprocess.CalledProcessError) as error:
        raise SystemExit("Packaging requires Git and a working Git checkout of this project.") from error
    files = sorted({name for name in candidates if include_file(name) and (ROOT / name).resolve() != output})
    missing = REQUIRED_FILES.difference(files)
    if missing:
        raise SystemExit("Required source files missing: " + ", ".join(sorted(missing)))
    temporary = output.with_name(output.name + ".tmp")
    try:
        with ZipFile(temporary, "w", ZIP_DEFLATED) as archive:
            for name in files:
                archive.write(ROOT / name, "FLOWTRACE/" + name)
        with ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise RuntimeError("Archive integrity check failed.")
            names = archive.namelist()
            assert len(names) == len(set(names)), "Duplicate archive entries"
            assert {name.split("/")[0] for name in names} == {"FLOWTRACE"}, "Archive must have one root"
            for required in REQUIRED_FILES:
                assert "FLOWTRACE/" + required in names, required
            for name in names:
                assert include_file(name.removeprefix("FLOWTRACE/")), name
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    print(f"Created {output}")
    print(f"{len(files)} source files; one FLOWTRACE root; {output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
