#!/bin/bash
# Verify production ports and services for AsTrA Nebula Map.
#
# Production path: dist/ is served via main.py (port 8000), NOT vite preview (5173).
# - 8000: Nebula Map UI + API (main.py / astra-nebula)
# - 5050: astra-core (AI Router, /api/status)
# - 5173: NOT required for production; must be free for local vite preview.
#
# Usage: ./scripts/verify_ports.sh [--fix-5173]
#   --fix-5173: Kill any stale vite preview on 5173 before checking

set -e

FIX_5173=false
for arg in "$@"; do
  case "$arg" in
    --fix-5173) FIX_5173=true ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

report_ok()  { echo -e "${GREEN}✓${NC} $1"; }
report_fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
report_warn() { echo -e "${YELLOW}!${NC} $1"; }

# --- Optional: kill stale vite preview on 5173 ---
if [ "$FIX_5173" = true ]; then
  PID=$(ss -ltnp 2>/dev/null | grep ':5173' | grep -oP 'pid=\K[0-9]+' | head -1)
  if [ -n "$PID" ]; then
    CMD=$(ps -p "$PID" -o comm= 2>/dev/null)
    if echo "$CMD" | grep -q node; then
      echo "Killing stale process on 5173 (PID $PID)..."
      kill "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
      sleep 1
      report_ok "Freed port 5173 (was: $CMD)"
    fi
  fi
fi

# --- Assert 5050 is listening (astra-core /api/status) ---
if ss -ltn 2>/dev/null | grep -q ':5050'; then
  report_ok "Port 5050 listening (astra-core)"
else
  report_fail "Port 5050 NOT listening. Start astra-core (e.g. systemctl start astra-core.service)"
fi

# --- Assert 8000 is listening (Nebula Map UI + API) ---
if ss -ltn 2>/dev/null | grep -q ':8000'; then
  report_ok "Port 8000 listening (Nebula Map / astra-nebula)"
else
  report_fail "Port 8000 NOT listening. Run ./run.sh or start astra-nebula@nebula.service"
fi

# --- Assert 5173 is free (not required for production, but needed for local vite preview) ---
if ss -ltn 2>/dev/null | grep -q ':5173'; then
  report_warn "Port 5173 is in use. Not required for production (use 8000). For local preview, run: ./scripts/verify_ports.sh --fix-5173"
else
  report_ok "Port 5173 free (or not needed for production)"
fi

# --- Curl UI at 8000 ---
if command -v curl &>/dev/null; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/ 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "304" ]; then
    report_ok "UI at http://127.0.0.1:8000/ returns $CODE"
  else
    report_fail "UI at http://127.0.0.1:8000/ returned $CODE (expected 200)"
  fi
else
  report_warn "curl not found, skipping HTTP checks"
fi

# --- Curl /api/status (prefer 5050 direct, fallback 8000 proxied) ---
if command -v curl &>/dev/null; then
  JSON=$(curl -s http://127.0.0.1:5050/api/status 2>/dev/null || curl -s http://127.0.0.1:8000/api/status 2>/dev/null || echo "")
  if echo "$JSON" | grep -q '"nodes"'; then
    report_ok "/api/status returns valid JSON (nodes array present)"
  else
    report_fail "/api/status did not return valid JSON. Response: ${JSON:0:100}..."
  fi
fi

echo ""
if [ $FAILED -eq 1 ]; then
  echo -e "${RED}Verification FAILED. Fix the issues above.${NC}"
  exit 1
else
  echo -e "${GREEN}Verification PASSED. Production services OK.${NC}"
  exit 0
fi
