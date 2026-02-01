# Patch Summary: Port 5173 and Production Path

## What was binding port 5173

**Process:** `node /home/comea/nebula-map/node_modules/.bin/vite preview --host 0.0.0.0 --port 5173 --strictPort`

**Parent chain:** `systemd(1) → sshd → bash → sh → node (npm) → sh → node (vite preview)`

**CWD:** `/home/comea/nebula-map`

**Root cause:** A manually started `npm run preview -- --host 0.0.0.0 --port 5173 --strictPort` from an interactive SSH session (pts/3) was left running. There was no systemd unit, cron, tmux resurrect, or pm2—it was a leftover interactive process. Killing the process freed the port.

## What was changed

1. **Killed the stale vite preview process** (PID 3516105 and parents) to free port 5173.

2. **Created `scripts/verify_ports.sh`**
   - Asserts 5050 is listening (astra-core /api/status)
   - Asserts 8000 is listening (Nebula Map UI + API)
   - Asserts 5173 is free (or warns if in use)
   - Curl-checks UI at http://127.0.0.1:8000/ (200)
   - Curl-checks /api/status returns valid JSON
   - Optional `--fix-5173` flag: kills any stale vite preview on 5173

3. **Documented production path in README**
   - Production: dist/ is served via main.py (port 8000), NOT vite preview (5173)
   - Do not use `npm run preview` for production; use `./run.sh` or astra-nebula@nebula.service

4. **Added `preview:safe` script to package.json**
   - Runs `./scripts/verify_ports.sh --fix-5173` first, then `vite preview`
   - Use `npm run preview:safe` if port 5173 is stuck

## Files touched

| File | Change |
|------|--------|
| `scripts/verify_ports.sh` | **NEW** – verification and optional --fix-5173 |
| `README.md` | Added "Production run path (no vite preview)" section |
| `package.json` | Added `preview:safe` script |
| `PATCH_SUMMARY.md` | **NEW** – this file |

## How to verify

```bash
# 1. Run verification
./scripts/verify_ports.sh

# 2. If 5173 is stuck, free it and re-check
./scripts/verify_ports.sh --fix-5173
./scripts/verify_ports.sh

# 3. Production UI (port 8000)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/
# Expected: 200

# 4. API status (port 5050)
curl -s http://127.0.0.1:5050/api/status | head -c 200
# Expected: {"nodes":[...]}

# 5. Local preview (port 5173) – only when needed
npm run preview -- --host 0.0.0.0 --port 5173 --strictPort
# Or if 5173 was stuck: npm run preview:safe
```

## Verification output (after patch)

```
✓ Port 5050 listening (astra-core)
✓ Port 8000 listening (Nebula Map / astra-nebula)
✓ Port 5173 free (or not needed for production)
✓ UI at http://127.0.0.1:8000/ returns 200
✓ /api/status returns valid JSON (nodes array present)

Verification PASSED. Production services OK.
```

## HTTPS/WSS and Tailwind

The codebase already has scheme-aware URL helpers and local Tailwind (no CDN). No changes were made to those. When accessed over HTTPS (e.g. via Tailscale serve), the UI uses same-origin for API calls, avoiding Mixed Content.
