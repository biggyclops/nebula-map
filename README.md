
# Nebula Map - Tailscale AI Network Visualizer

Nebula Map allows you to visualize your Tailscale mesh network, identify AI services running on peers, and monitor hardware performance using a private, AI-assisted interface.

## What is nebula-map?

Nebula Map is a visualization tool for Tailscale networks that helps you explore your mesh topology, discover AI services on connected peers, and monitor system performance. It provides a private, AI-assisted interface that keeps your network data within your Tailscale mesh. The tool integrates with local AI assistants like Ollama, allowing you to interact with your network map using natural language while maintaining privacy.

## 🌌 Nebula Assistant (Local AI)
Nebula Map features an integrated AI Assistant designed to run locally on your mesh.

### Configuring Ollama
1. **Local**: Install [Ollama](https://ollama.com/) on your machine.
2. **Remote (Over Tailscale)**: You can use an Ollama instance running on a different peer!
   - In Nebula Assistant Settings, set the **Base URL** to the Tailscale IP of your AI server (e.g., `http://100.x.y.z:11434`).
   - Ensure `OLLAMA_HOST=0.0.0.0` is set on the target machine to allow remote mesh connections.

### Privacy Firewall
- **Local Mode**: All data stays within your mesh.
- **Redaction**: By default, Nebula masks your `100.x.y.z` IPs and `.tailscale.net` hostnames before sending data to AI providers, ensuring your network map remains private even when using cloud LLMs.

## Prerequisites
- **Tailscale installed** and authenticated.
- **Python 3.10+** for the backend.
- **Node.js** for the frontend.

## HTTPS/WSS and Tailwind build

### Mixed Content (HTTPS/WSS)
All API calls and WebSocket connections use **scheme-aware URLs** so an HTTPS page never requests HTTP or ws://, avoiding Mixed Content errors.

- **Default**: Same-origin. API uses `https://` when page is HTTPS; WebSocket uses `wss://` when page is HTTPS.
- **Optional env overrides** (when API/WS are on a different host):
  - `VITE_API_ORIGIN` – e.g. `https://api.example.com`
  - `VITE_WS_ORIGIN` – e.g. `wss://api.example.com`

API paths: `/api/status`, `/api/health`, `/api/peers`, `/api/ai/*`, etc. WebSocket paths (if used): `/v1/events`, etc.

### Tailwind
Tailwind is bundled locally (no CDN). Run dev or build as usual; styles are built via PostCSS.

### Dev
```bash
# Terminal 1: start nebula backend
python main.py

# Terminal 2: start Vite frontend
npm install
npm run dev
```
Opens at `http://localhost:3000` (or the port Vite shows). API is proxied to `VITE_API_PROXY_TARGET` (default `http://127.0.0.1:8000`) for `/api/*` routes. `VITE_STATUS_API_TARGET` is still accepted as a backward-compatible alias.

### Prod build
```bash
npm run build
```
Output in `dist/`. Serve with your backend (e.g. nebula `main.py`).

## Production run path (no vite preview)

**Port 5173 is NOT used in production.** The Nebula Map UI is served by the Python backend (`main.py`) on port 8000.

- **Build:** `./build.sh` → produces `dist/`
- **Run:** `./run.sh` → uvicorn serves `dist/` + API on `127.0.0.1:8000`
- **Deploy:** astra-nebula@nebula.service runs from `/opt/astra-nebula` on port 8000

Do not use `npm run preview` for production. Use `./run.sh` or the systemd service.

**Verify:** `./scripts/verify_ports.sh` checks 5050 (astra-core), 8000 (nebula UI), and that 5173 is free.
If port 5173 is stuck: `./scripts/verify_ports.sh --fix-5173` kills any stale vite preview.

## Run locally

### Prerequisites
- **Node.js LTS** installed
- **npm** (comes with Node.js)

### Commands
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open the application in your browser at the localhost URL shown in the terminal (typically `http://localhost:5173` or similar).

### Optional: Build for production
To build the application for production:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

## Installation (Development)
1. `pip install fastapi uvicorn psutil httpx`
2. `python main.py`
3. In another terminal: `npm run dev`

## Deployment (Ubuntu + Tailscale)

### Prerequisites
- Ubuntu server with Tailscale installed and authenticated
- Python 3.10+ and Node.js installed
- Root or sudo access for systemd service setup

### Build and Deploy

1. **Install Python dependencies:**
   ```bash
   pip install fastapi uvicorn psutil httpx
   ```

2. **Build the frontend:**
   ```bash
   ./build.sh
   ```
   This will install npm dependencies and create the `dist/` directory.

3. **Test the server locally:**
   ```bash
   ./run.sh
   ```
   The server will start on `127.0.0.1:8000` (localhost only).

4. **Set up systemd service:**
   ```bash
   # Copy the service file to systemd directory
   sudo cp scripts/systemd/astra-nebula.service /etc/systemd/system/
   
   # Edit the service file to match your deployment:
   # - Update User, Group, and WorkingDirectory paths
   sudo nano /etc/systemd/system/astra-nebula.service
   
   # Reload systemd and enable the service
   sudo systemctl daemon-reload
   sudo systemctl enable astra-nebula.service
   sudo systemctl start astra-nebula.service
   
   # Check status
   sudo systemctl status astra-nebula.service
   ```

5. **Expose via Tailscale:**
   ```bash
   # Use Tailscale serve to expose the localhost service
   sudo tailscale serve --set / http://127.0.0.1:8000
   ```
   This makes the service accessible via your Tailscale network at your machine's Tailscale hostname.

### Service Management
- **View logs:** `sudo journalctl -u astra-nebula.service -f`
- **Restart service:** `sudo systemctl restart astra-nebula.service`
- **Stop service:** `sudo systemctl stop astra-nebula.service`

### Architecture Notes
- The UI and API share port 8000 (unified deployment)
- All API endpoints are under `/api` prefix
- Static files (Vite build) are served from `dist/` directory
- Server binds to `127.0.0.1:8000` (localhost) - Tailscale serve handles external access

## Steps Cursor cannot perform (run on Mini-Beast)

These steps must be executed on the Ubuntu server (Mini-Beast) after transferring the deployment archive:

1. **Extract the deployment archive:**
   ```bash
   sudo unzip astra-nebula-deploy.zip -d /opt/astra-nebula
   sudo chown -R ubuntu:ubuntu /opt/astra-nebula
   cd /opt/astra-nebula
   ```

2. **Create Python virtual environment and install dependencies:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn psutil httpx
   ```

3. **Install and enable systemd service:**
   ```bash
   sudo cp scripts/systemd/astra-nebula.service /etc/systemd/system/
   # Verify User, Group, and WorkingDirectory in the service file match your setup
   sudo systemctl daemon-reload
   sudo systemctl enable astra-nebula.service
   sudo systemctl start astra-nebula.service
   sudo systemctl status astra-nebula.service
   ```

4. **Expose via Tailscale:**
   ```bash
   sudo tailscale serve --bg http://127.0.0.1:8000
   ```

The service will be accessible via your Tailscale network at your machine's Tailscale hostname.
