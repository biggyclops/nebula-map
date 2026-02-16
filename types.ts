
import * as d3 from 'd3';

export type NodeStatus = "online" | "idle" | "busy" | "degraded" | "offline";
export type NodeRole = "host" | "ai_host" | "gpu" | "exit" | "ephemeral" | "gateway" | "storage" | "ai";

// ============================================================================
// DATA-DRIVEN TOPOLOGY TYPES
// These types support the deterministic topology graph that renders from
// /api/status instead of requiring AI_CORE inference.
// ============================================================================

/** Node data from GET /api/status - deterministic, no AI dependency */
export interface StatusNode {
  name: string;
  role: "storage" | "gateway" | "ai" | "gpu";
  online: boolean;
}

/** Response from GET /api/status endpoint */
export interface StatusResponse {
  nodes: StatusNode[];
  source?: 'astra-core' | 'nebula-fallback';
  error?: string;
}

/** Topology state with metadata for UI feedback */
export interface TopologyState {
  nodes: StatusNode[];
  isLive: boolean;         // true if loaded from API, false if from cache
  lastUpdated: number;     // timestamp
  error: string | null;    // non-blocking error message for warning badge
}

export type VisualState = {
  opacity: number;          // 0–1
  glowIntensity: number;    // 0–1
  glowRadius: number;       // multiplier
  colorShift: number;       // -1 cold → +1 warm
  pulseRate: number;        // Hz (0 = none)
  flicker: number;          // 0–1 (stability/jitter)
  distortion: number;       // 0–1 (morphing/glitch)
  ringState?: "stable" | "collapsing" | "hidden" | "dashed";
  linkStyle: "flow" | "thin" | "dashed" | "none";
  surgeSpeed: number;       // particle velocity multiplier
  particleDensity: number;  // number of particles per link
};

export interface AIConfig {
  provider: 'ollama' | 'openai';
  baseUrl: string;
  apiKey?: string;
  model: string;
  cloudEnabled: boolean;
  allowSensitive: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TailscalePeer {
  ID: string;
  HostName: string;
  DNSName: string;
  TailscaleIPs: string[];
  Online: boolean;
  OS: string;
  Active: boolean;
  Services?: AIService[];
  Hardware?: HardwareStats;
  status?: NodeStatus;
  role?: NodeRole;
}

export interface AIService {
  name: string;
  port: number;
}

export interface HardwareStats {
  cpu_usage: number;
  memory: {
    percent: number;
    used: number;
    total: number;
  };
  disk: {
    percent: number;
  };
  platform: string;
}

export interface NetworkGraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  ip: string;
  status: NodeStatus;
  role: NodeRole;
  visual: VisualState;
}

export interface NetworkGraphLink extends d3.SimulationLinkDatum<NetworkGraphNode> {
  source: string | NetworkGraphNode;
  target: string | NetworkGraphNode;
  linkStyle: "flow" | "thin" | "dashed" | "none";
  surgeSpeed: number;
  particleDensity: number;
}
