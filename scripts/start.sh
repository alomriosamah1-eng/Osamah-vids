#!/usr/bin/env bash
# One-command launcher for Osamah Vids on a free Google Colab T4 runtime.
#
# Free Colab cannot be started from a script (the official Colab runtimes API is
# allowlist-only), so the only manual step left is pressing "Run all" in the
# notebook. Everything else -- resolving the tunnel URL, registering the worker,
# verifying CUDA, and reconnecting -- happens here.
#
# Worker URL is resolved in this order:
#   1. $GPU_WORKER_URL (already exported)
#   2. GPU_WORKER_URL in .env
#   3. storage/worker-url.txt   <- drop the tunnel URL in this file
#   4. the system clipboard     <- just copy the URL from the Colab output
#   5. nothing -> server starts, connect manually from the UI

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
ROOT="$PWD"
ENV_FILE="$ROOT/.env"
URL_FILE="$ROOT/storage/worker-url.txt"
LOG_FILE="$ROOT/storage/server.log"
PORT="${PORT:-3000}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/v1/health"

TUNNEL_RE='https://[a-zA-Z0-9._-]+\.(ngrok-free\.app|ngrok\.io|ngrok\.app|loca\.lt|trycloudflare\.com)[a-zA-Z0-9._/-]*'

log() { printf '\033[1;36m[vids]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[vids]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[vids]\033[0m %s\n' "$*" >&2; }

read_clipboard() {
  if command -v wl-paste >/dev/null 2>&1; then wl-paste -n 2>/dev/null
  elif command -v xclip >/dev/null 2>&1; then xclip -selection clipboard -o 2>/dev/null
  elif command -v pbpaste >/dev/null 2>&1; then pbpaste 2>/dev/null
  elif powershell.exe -NoProfile -Command Get-Clipboard >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command Get-Clipboard 2>/dev/null | tr -d '\r'
  fi
}

# Pulls the first public tunnel URL out of arbitrary text (Colab logs, a copied
# cell, a browser URL bar paste).
extract_url() {
  printf '%s' "$1" | grep -oE "$TUNNEL_RE" | head -n1
}

load_env_file() {
  [ -f "$ENV_FILE" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
    esac
    line="${line#export }"
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    case "$key" in
      *[!a-zA-Z0-9_]*) continue ;;
    esac
    export "$key=$val"
  done <"$ENV_FILE"
}

resolve_worker_url() {
  if [ -n "${GPU_WORKER_URL:-}" ]; then
    printf '%s' "$GPU_WORKER_URL"; return 0
  fi
  if [ -f "$URL_FILE" ]; then
    url=$(extract_url "$(cat "$URL_FILE" 2>/dev/null)")
    [ -n "$url" ] && { printf '%s' "$url"; return 0; }
  fi
  clip=$(read_clipboard)
  if [ -n "$clip" ]; then
    url=$(extract_url "$clip")
    if [ -n "$url" ]; then
      printf '%s' "$url"
      printf 'Colab tunnel URL: %s\n' "$url" >"$URL_FILE.tmp"
      mv "$URL_FILE.tmp" "$URL_FILE"
      return 0
    fi
  fi
  return 1
}

http_field() {
  # $1 = curl url, $2 = json field
  curl -s -m 8 "$1" 2>/dev/null | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      try{const j=JSON.parse(d);const f=process.argv[1];
      let v=f.split(".").reduce((a,k)=>(a==null?a:a[k]),j);
      console.log(v===undefined||v===null?"":v);}catch{console.log("")}
    });' "$2" 2>/dev/null
}

wait_for_http() {
  for _ in $(seq 1 60); do
    if curl -s -m 2 "$1" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

mkdir -p "$ROOT/storage"

if [ ! -d "$ROOT/node_modules" ]; then
  log "Installing dependencies..."
  npm install || { fail "npm install failed"; exit 1; }
fi

load_env_file
PORT="${PORT:-3000}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/v1/health"

if url=$(resolve_worker_url); then
  export GPU_WORKER_URL="$url"
  log "Worker URL resolved: $url"
else
  warn "No Colab tunnel URL found."
  warn "Run the notebook at colab/osamah_vids_wan21_worker.ipynb, copy the"
  warn "public ngrok/localtunnel URL, then either:"
  warn "  - paste it in the UI (Worker button), or"
  warn "  - save it to storage/worker-url.txt and re-run this script."
fi

# Stop a previous instance so the port is free and state is not duplicated.
if [ -f "$ROOT/storage/server.pid" ]; then
  old=$(cat "$ROOT/storage/server.pid" 2>/dev/null)
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
    log "Stopping previous server (pid $old)..."
    kill "$old" 2>/dev/null
    sleep 2
    kill -9 "$old" 2>/dev/null
  fi
  rm -f "$ROOT/storage/server.pid"
fi

# Also handle a server started outside this script (e.g. a bare `npm run dev`),
# which leaves no pid file and would otherwise fail with EADDRINUSE.
if command -v fuser >/dev/null 2>&1; then
  if fuser "${PORT}/tcp" >/dev/null 2>&1; then
    log "Freeing port $PORT held by another process..."
    fuser -k "${PORT}/tcp" >/dev/null 2>&1
    sleep 2
  fi
elif command -v lsof >/dev/null 2>&1; then
  stale=$(lsof -ti "tcp:${PORT}" 2>/dev/null)
  if [ -n "$stale" ]; then
    log "Freeing port $PORT held by $stale..."
    kill -9 $stale 2>/dev/null
    sleep 2
  fi
else
  if curl -s -m 2 "$HEALTH_URL" >/dev/null 2>&1; then
    warn "Port $PORT already serves a vids instance and no pid tool is"
    warn "available to stop it. Stop it manually, then re-run."
    exit 1
  fi
fi

log "Starting server on port $PORT (logs: storage/server.log)..."
: >"$LOG_FILE"
npm run dev >>"$LOG_FILE" 2>&1 &
SERVER_PID=$!
printf '%s' "$SERVER_PID" >"$ROOT/storage/server.pid"

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  rm -f "$ROOT/storage/server.pid"
}
trap cleanup EXIT INT TERM

if ! wait_for_http "$HEALTH_URL"; then
  fail "Server did not come up. Last 30 log lines:"
  tail -n 30 "$LOG_FILE"
  exit 1
fi

log "Server is up. Checking the Colab GPU worker..."

# First-time Colab load of Wan2.1 pulls ~8GB, so allow a generous window.
ready=""
for i in $(seq 1 90); do
  ready=$(http_field "$HEALTH_URL" remoteWorkerReady)
  if [ "$ready" = "true" ]; then break; fi
  sleep 2
done

if [ "$ready" = "true" ]; then
  gpu=$(http_field "$HEALTH_URL" worker.gpuName)
  loaded=$(http_field "$HEALTH_URL" worker.loadedModel)
  log "Worker READY (${gpu:-GPU}${loaded:+, model: $loaded}) -- generation is enabled."
else
  warn "Worker not ready yet. Model download on first run can take several minutes."
  warn "It will be picked up automatically; no restart needed."
  warn "Status: curl -s $HEALTH_URL"
fi

# Auto-reconnect: Colab tunnels get a new URL when the runtime restarts. If
# storage/worker-url.txt is updated (or a new URL is pasted there), re-register
# it without restarting the server.
(
  while kill -0 "$SERVER_PID" 2>/dev/null; do
    sleep 15
    [ -f "$URL_FILE" ] || continue
    new=$(extract_url "$(cat "$URL_FILE" 2>/dev/null)")
    [ -n "$new" ] || continue
    if [ "$new" != "${GPU_WORKER_URL:-}" ]; then
      export GPU_WORKER_URL="$new"
      curl -s -m 10 -X POST "http://127.0.0.1:${PORT}/api/v1/worker/connect" \
        -H 'Content-Type: application/json' \
        -d "{\"workerUrl\":\"$new\"}" >/dev/null 2>&1 &&
        printf '\033[1;36m[vids]\033[0m Re-connected to new tunnel: %s\n' "$new"
    fi
  done
) &

log "Open http://localhost:${PORT} and start generating."
wait "$SERVER_PID"