
import { NodeStatus, NodeRole, VisualState } from '../types';

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
    default: // Link Severed / Inert
      state = { 
        opacity: 0.2, glowIntensity: 0.05, glowRadius: 0.5, colorShift: -0.9, 
        pulseRate: 0, flicker: 0, distortion: 0, ringState: "collapsing", 
        linkStyle: "none", surgeSpeed: 0, particleDensity: 0
      };
      break;
  }

  // Role specialization
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
