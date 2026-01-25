
import * as d3 from 'd3';

export type NodeStatus = "online" | "idle" | "busy" | "degraded" | "offline";
export type NodeRole = "host" | "ai_host" | "gpu" | "exit" | "ephemeral";

export type VisualState = {
  opacity: number;          // 0–1
  glowIntensity: number;    // 0–1
  glowRadius: number;       // multiplier
  colorShift: number;       // -1 cold → +1 warm
  pulseRate: number;        // Hz (0 = none)
  flicker: number;          // 0–1 (stability/jitter)
  distortion: number;       // 0–1 (morphing/glitch)
  ringState?: "stable" | "collapsing" | "hidden";
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
