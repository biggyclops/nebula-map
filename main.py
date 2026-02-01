
import subprocess
import json
import socket
import psutil
import platform
import os
import re
import httpx
from pathlib import Path
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_SERVICES = {
    11434: "Ollama",
    8188: "ComfyUI",
    7860: "Stable Diffusion",
    4000: "Pinokio",
    1234: "LM Studio"
}

# --- AI Configuration & Redaction ---

class AIConfig(BaseModel):
    provider: str = "ollama"  # "ollama" or "openai"
    baseUrl: str = "http://127.0.0.1:11434"
    apiKey: Optional[str] = ""
    model: str = "llama3"
    cloudEnabled: bool = False
    allowSensitive: bool = False

# Global state for prototype (usually persistent DB)
CONFIG = AIConfig()

def redact_sensitive(text: str) -> str:
    if CONFIG.allowSensitive:
        return text
    # Mask Tailscale IPs (100.x.y.z)
    text = re.sub(r'100\.\d{1,3}\.\d{1,3}\.\d{1,3}', '<IP_REDACTED>', text)
    # Mask internal .net names
    text = re.sub(r'[a-zA-Z0-9-]+\.tailscale\.net', '<HOST_REDACTED>', text)
    return text

def get_network_context():
    # Helper to build the text representation of the mesh for the LLM
    try:
        result = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True)
        data = json.loads(result.stdout) if result.returncode == 0 else MOCK_DATA
    except:
        data = MOCK_DATA
    
    context = "CURRENT NETWORK TOPOLOGY:\n"
    if "Self" in data:
        s = data["Self"]
        context += f"- THIS DEVICE: {s.get('HostName')} ({s.get('TailscaleIPs', [''])[0]}) Status: Online\n"
    
    peers = data.get("Peer", {})
    for pid, p in peers.items():
        online = "Online" if p.get("Online") else "Offline"
        context += f"- NODE: {p.get('HostName')} ({p.get('TailscaleIPs', [''])[0]}) Status: {online}, OS: {p.get('OS')}\n"
    
    return redact_sensitive(context)

# --- AI Providers ---

async def call_llm(system_prompt: str, user_prompt: str):
    if CONFIG.provider == "ollama":
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{CONFIG.baseUrl}/api/generate",
                    json={
                        "model": CONFIG.model,
                        "prompt": f"{system_prompt}\n\nUser: {user_prompt}\nAssistant:",
                        "stream": False
                    },
                    timeout=30.0
                )
                return response.json().get("response", "No response from Ollama.")
            except Exception as e:
                return f"Ollama Error: {str(e)}"
    else:
        # OpenAI Compatible
        headers = {"Authorization": f"Bearer {CONFIG.apiKey}"}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{CONFIG.baseUrl}/chat/completions",
                    headers=headers,
                    json={
                        "model": CONFIG.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ]
                    },
                    timeout=30.0
                )
                return response.json()["choices"][0]["message"]["content"]
            except Exception as e:
                return f"Cloud Provider Error: {str(e)}"

# --- Endpoints ---

MOCK_DATA = {
    "Self": {"DNSName": "nebula-host.tailscale.net", "TailscaleIPs": ["100.64.0.1"], "Online": True, "HostName": "nebula-host"},
    "Peer": {
        "node-1": {"DNSName": "gpu-server.tailscale.net", "TailscaleIPs": ["100.64.0.2"], "Online": True, "HostName": "gpu-server", "OS": "linux"},
        "node-2": {"DNSName": "macbook-pro.tailscale.net", "TailscaleIPs": ["100.64.0.3"], "Online": False, "HostName": "macbook-pro", "OS": "macos"},
        "node-3": {"DNSName": "homelab.tailscale.net", "TailscaleIPs": ["100.64.0.4"], "Online": True, "HostName": "homelab", "OS": "linux"}
    }
}

# Status API is provided by astra-core (port 5050). Proxy so frontend uses same origin.
STATUS_API_URL = os.environ.get("ASTRA_STATUS_API_URL", "http://127.0.0.1:5050")

@app.get("/api/health")
async def health_check():
    return {"ok": True}

@app.get("/api/status")
async def proxy_status():
    """Proxy to astra-core/astra-status for topology node data. Same-origin for frontend."""
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"{STATUS_API_URL}/api/status", timeout=5.0)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Status backend unreachable: {e}")

@app.get("/api/peers")
async def get_peers():
    try:
        result = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True)
        if result.returncode != 0:
            data = MOCK_DATA
        else:
            data = json.loads(result.stdout)
    except:
        data = MOCK_DATA
    
    # Normalize Tailscale JSON to array format expected by frontend
    peers = []
    if "Self" in data:
        peers.append({
            **data["Self"],
            "ID": "self",
            "Active": True,
        })
    
    if "Peer" in data:
        for peer_id, peer_data in data["Peer"].items():
            peers.append({
                **peer_data,
                "ID": peer_id,
                "Active": peer_data.get("Online", False),
            })
    
    return peers

@app.get("/api/scan/{ip}")
async def scan_node(ip: str):
    found_services = []
    for port, name in AI_SERVICES.items():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            if s.connect_ex((ip, port)) == 0:
                found_services.append({"name": name, "port": port})
    return {"ip": ip, "services": found_services}

@app.get("/api/stats")
async def get_local_stats():
    return {
        "cpu_usage": psutil.cpu_percent(),
        "memory": psutil.virtual_memory()._asdict(),
        "disk": psutil.disk_usage('/')._asdict(),
        "platform": platform.system()
    }

# --- New AI Endpoints ---

@app.post("/api/ai/config")
async def set_ai_config(config: AIConfig):
    global CONFIG
    CONFIG = config
    return {"status": "ok"}

@app.get("/api/ai/config")
async def get_ai_config():
    # Redact API key for security
    return {**CONFIG.dict(), "apiKey": "********" if CONFIG.apiKey else ""}

@app.post("/api/ai/chat")
async def ai_chat(message: str = Body(..., embed=True)):
    system = f"You are Nebula Assistant, a read-only network analyzer for a Tailscale mesh. {get_network_context()} Be concise and technical. Do not suggest running commands unless they are discovery commands (ping, dig)."
    response = await call_llm(system, message)
    return {"response": response}

@app.post("/api/ai/nlq")
async def ai_nlq(query: str = Body(..., embed=True)):
    # Natural Language Query to Filter structured data
    system = "Translate the user request into a JSON filter object. Valid keys: status (online/offline), role (gpu/host/ai_host/exit). Example: 'show me busy gpu nodes' -> {\"status\": \"online\", \"role\": \"gpu\"}. Return ONLY valid JSON."
    response = await call_llm(system, f"Translate: {query}")
    try:
        # Simple extraction if LLM adds markdown
        json_str = re.search(r'\{.*\}', response, re.DOTALL).group()
        return json.loads(json_str)
    except:
        return {}

@app.post("/api/ai/explain")
async def ai_explain(node_data: Dict = Body(...)):
    system = "Explain this network node's role and services in simple terms. Suggest why it might be important for an AI developer."
    response = await call_llm(system, f"Node Data: {json.dumps(node_data)}")
    return {"explanation": response}

@app.post("/api/ai/report")
async def ai_report(peers: List[Dict] = Body(...)):
    system = "Generate a professional narrative for a network export. Summarize node health and service distribution."
    response = await call_llm(system, f"Peers: {json.dumps(peers[:10])}") # Truncate for prompt length
    return {"narrative": response}

# Mount static files AFTER all API routes are defined
# This serves the Vite build output (dist/) for the UI
# Use absolute resolved path for systemd compatibility
dist_path = Path(__file__).resolve().parent / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
