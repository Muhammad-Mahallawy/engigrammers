#!/usr/bin/env bash
set -Eeuo pipefail

backend_pid=""
frontend_pid=""

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$status"
}

trap cleanup EXIT
trap 'exit 143' INT TERM

if [[ -z "${FLOWTRACE_API_URL:-}" ]]; then
  echo "Starting bundled FLOWTRACE FastAPI backend on 0.0.0.0:8000"
  /opt/flowtrace-venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 &
  backend_pid=$!
  echo "Waiting for the experimental API to become ready"
  /opt/flowtrace-venv/bin/python - <<'PY'
import json, time, urllib.request
for attempt in range(40):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=1) as response:
            if json.load(response).get('status') == 'ok':
                break
    except (OSError, ValueError):
        pass
    time.sleep(0.25)
else:
    raise SystemExit('FLOWTRACE API did not become ready; frontend startup aborted')
PY
else
  echo "Using external FLOWTRACE API at ${FLOWTRACE_API_URL}; bundled backend disabled"
fi

echo "Starting FLOWTRACE frontend on 0.0.0.0:${PORT:-3000}"
node dist/index.js &
frontend_pid=$!

if [[ -n "$backend_pid" ]]; then
  wait -n "$frontend_pid" "$backend_pid"
else
  wait "$frontend_pid"
fi
