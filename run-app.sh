#!/usr/bin/env bash
# مشغّل تطبيق Osamah vids ai — يبدأ الخادم والواجهة ثم نافذة Electron (idempotent).
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_PORT=8799
WEB_PORT=5173
LOGDIR="/tmp/osamah-vids-ai"
mkdir -p "$LOGDIR"

port_up() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

if ! port_up "$API_PORT"; then
  if [ ! -f "$ROOT/apps/server/dist/index.js" ]; then
    ( cd "$ROOT" && npm run build --workspace @osamah/server >"$LOGDIR/build.log" 2>&1 )
  fi
  ( cd "$ROOT" && setsid --fork node apps/server/dist/index.js >"$LOGDIR/server.log" 2>&1 < /dev/null )
fi

if ! port_up "$WEB_PORT"; then
  ( cd "$ROOT" && setsid --fork npm run dev:web >"$LOGDIR/web.log" 2>&1 < /dev/null )
fi

for _ in $(seq 1 120); do port_up "$WEB_PORT" && break; sleep 0.5; done

if ! pgrep -f "electron --no-sandbox \." >/dev/null 2>&1; then
  ( cd "$ROOT/apps/desktop" && setsid --fork "$ROOT/node_modules/.bin/electron" . --no-sandbox >"$LOGDIR/electron.log" 2>&1 < /dev/null )
fi
