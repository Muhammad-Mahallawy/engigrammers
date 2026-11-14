#!/usr/bin/env python3
"""Create clean FLOWTRACE source and cumulative no-new-dependency update ZIPs."""
from pathlib import Path, PurePosixPath
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'output'
OUTPUT.mkdir(parents=True, exist_ok=True)

PATCH_FILES = [
    'client/src/main.tsx',
    'client/src/pages/Home.tsx',
    'client/src/pages/Explorer.tsx',
    'client/src/components/SpaceHero.tsx',
    'client/src/components/OrbitalSelect.tsx',
    'client/src/components/ExperimentSearch.tsx',
    'client/src/lib/experimentSearch.ts',
    'client/src/pages/Compare.tsx',
    'client/src/pages/Insights.tsx',
    'client/src/orbital.css',
    'client/src/orbital-panels.css',
    'client/public/space-orbit.webp',
    'client/src/App.tsx',
    'client/public/manus-routes.json',
    'client/src/pages/Chatbot.tsx',
    'client/src/components/ChatMessage.tsx',
    'client/src/lib/chat.ts',
    'client/src/chat.css',
    'shared/chat.ts',
    'server/chatProxy.ts',
    'server/_core/index.ts',
    '.env.example',
    'N8N_CHAT_SETUP.md',
    'UPDATE_STYLE.md',
    'client/src/pages/Simulation.tsx',
    'client/src/components/SimulationCanvas.tsx',
    'client/src/components/SimulationTrace.tsx',
    'client/src/lib/simulation.ts',
    'client/src/simulation.css',
    'SIMULATION_PLAN.md',
    'SIMULATION_GUIDE.md',
    'SIMULATION_SOURCES.md',
]

for name in PATCH_FILES:
    assert (ROOT / name).is_file(), f'Missing update file: {name}'

patch_path = OUTPUT / 'FLOWTRACE_simulation_update.zip'
with ZipFile(patch_path, 'w', ZIP_DEFLATED) as archive:
    for name in PATCH_FILES:
        archive.write(ROOT / name, name)

file_names = subprocess.check_output(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    cwd=ROOT,
).decode().split('\0')

source_path = OUTPUT / 'FLOWTRACE_with_simulation.zip'
with ZipFile(source_path, 'w', ZIP_DEFLATED) as archive:
    for name in sorted(set(file_names)):
        if not name or name.startswith(('.manus', '.git/', '.webdev/')):
            continue
        if name in {'TODO.md', 'plan.md', 'template.json'} or name.endswith('.bak'):
            continue
        basename = PurePosixPath(name).name
        if basename.startswith('.env') and basename != '.env.example':
            continue
        source = ROOT / name
        if source.is_file():
            archive.write(source, 'FLOWTRACE_frontend/' + name)

for path in [patch_path, source_path]:
    with ZipFile(path) as archive:
        assert archive.testzip() is None, f'Corrupt archive: {path}'
        assert not any('/node_modules/' in name or '/.git/' in name for name in archive.namelist())
        print(f'{path}: {len(archive.namelist())} files, {path.stat().st_size} bytes')

with ZipFile(source_path) as archive:
    for name in ['README.md', 'package.json', 'pnpm-lock.yaml', 'backend/app/main.py', *PATCH_FILES]:
        assert 'FLOWTRACE_frontend/' + name in archive.namelist(), f'Missing source: {name}'
with ZipFile(patch_path) as archive:
    assert set(archive.namelist()) == set(PATCH_FILES)
    assert archive.read('client/public/space-orbit.webp')[8:12] == b'WEBP'
