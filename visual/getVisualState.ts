import { NodeStatus, NodeRole, VisualState } from '../types';

// ============================================================================
// VISUAL STATE CALCULATION
// Maps node status and role to visual properties for the topology graph.
// 
// TOPOLOGY IS NO LONGER AI-GATED:
// This function now supports the data-driven topology from /api/status.
// New roles (gateway, storage, ai, gpu) are mapped to specific colors.
// Offline nodes render with opacity 0.4 + dashed ring (never hidden).
// ============================================================================

export function getVisualState(
  status: NodeStatus,
  role: NodeRole,
  opts: { reducedMotion: boolean }
): VisualState {
  let state: VisualState;

  // AsTrA Visual Cortex Lexicon Mapping
  // Rule: State must be legible via metabolism (pulse) and clarity (flicker/jitter)
  switch (status) {
    case "online": // Nominal Metabolism
      state = { 
        opacity: 1.0, glowIntensity: 0.7, glowRadius: 1.0, colorShift: 0, 
        pulseRate: 0.2, flicker: 0, distortion: 0, ringState: "stable", 
        linkStyle: "flow", surgeSpeed: 1.0, particleDensity: 1
      };
      break;
    case "idle": // Low Metabolism / Hibernation
      state = { 
        opacity: 0.6, glowIntensity: 0.3, glowRadius: 0.8, colorShift: -0.4, 
        pulseRate: 0.08, flicker: 0, distortion: 0, ringState: "stable", 
        linkStyle: "thin", surgeSpeed: 0.4, particleDensity: 1
      };
      break;
    case "busy": // Neural Overload / Smooth Energy
      state = { 
        opacity: 1.0, glowIntensity: 1.0, glowRadius: 1.4, colorShift: 0.5, 
        pulseRate: 1.8, flicker: 0, distortion: 0, ringState: "stable", 
        linkStyle: "flow", surgeSpeed: 3.0, particleDensity: 3
      };
      break;
    case "degraded": // Signal Instability / Synaptic Jitter
      state = { 
        opacity: 0.8, glowIntensity: 0.5, glowRadius: 0.9, colorShift: -0.1, 
        pulseRate: 0, flicker: 1.0, distortion: 0.4, ringState: "stable", 
        linkStyle: "dashed", surgeSpeed: 0.6, particleDensity: 2
      };
      break;
    case "offline":
    default:
      // OFFLINE NODES ARE DIMMED, NOT HIDDEN
      // Opacity 0.4 ensures visibility while clearly indicating unavailability
      // Dashed ring provides secondary visual cue for offline state
      state = { 
        opacity: 0.4, glowIntensity: 0.1, glowRadius: 0.6, colorShift: -0.5, 
        pulseRate: 0, flicker: 0, distortion: 0, ringState: "dashed", 
        linkStyle: "dashed", surgeSpeed: 0, particleDensity: 0
      };
      break;
  }

  // Role specialization for data-driven topology
  // Gateway nodes are central and larger
  if (role === "gateway") {
    state.glowRadius *= 1.5;  // Larger to emphasize central position
    state.glowIntensity += 0.2;
  }
  
  // GPU nodes have enhanced glow
  if (role === "gpu") {
    state.glowRadius *= 1.2;
    if (status === "busy") state.colorShift += 0.2;
  }

  // Reduced motion support: stripping metabolic animations while preserving state color and opacity
  if (opts.reducedMotion) {
    state.pulseRate = 0;
    state.flicker = 0;
    state.distortion = 0;
    state.surgeSpeed = 0;
    state.particleDensity = Math.min(state.particleDensity, 1);
  }

  return state;
}

// ============================================================================
// ROLE COLOR MAPPING
// Deterministic color assignment based on node role from /api/status.
// No AI inference required - colors are data-driven.
// ============================================================================

export function getRoleColor(role: NodeRole): string {
  switch (role) {
    case "gateway":
      return "#f472b6"; // Pink - central gateway node
    case "storage":
      return "#c084fc"; // Purple - storage nodes
    case "ai":
      return "#818cf8"; // Blue/Indigo - AI nodes  
    case "gpu":
      return "#22d3ee"; // Cyan - GPU compute nodes
    case "ai_host":
      return "#c084fc"; // Purple (legacy)
    case "host":
      return "#818cf8"; // Indigo (legacy)
    case "exit":
      return "#f472b6"; // Pink (legacy)
    case "ephemeral":
      return "#475569"; // Gray
    default:
      return "#475569"; // Default gray
  }
}
