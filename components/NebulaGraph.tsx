import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { TailscalePeer, StatusNode, NetworkGraphNode, NetworkGraphLink, VisualState, NodeRole, NodeStatus } from '../types';
import { getVisualState, getRoleColor } from '../visual/getVisualState';

// ============================================================================
// NEBULA GRAPH COMPONENT
// 
// TOPOLOGY IS NO LONGER AI-GATED:
// This component now renders deterministically from /api/status data.
// - All nodes render immediately regardless of AI_CORE state
// - Gateway node (minibeast) is always the central hub
// - Offline nodes are dimmed (opacity 0.4) with dashed ring, never hidden
// - Links always flow from gateway → all other nodes
// ============================================================================

interface NebulaGraphProps {
  peers?: TailscalePeer[];              // Legacy peer data (optional)
  statusNodes?: StatusNode[];           // New status-based nodes (preferred)
  onSelectNode?: (peer: TailscalePeer | null) => void;
  onSelectStatusNode?: (node: StatusNode | null) => void;
}

const NebulaGraph: React.FC<NebulaGraphProps> = ({ 
  peers = [], 
  statusNodes,
  onSelectNode, 
  onSelectStatusNode 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (!svgRef.current) return;
    
    // DETERMINISTIC NODE BUILDING:
    // Prefer statusNodes from /api/status - no AI inference required
    // Fall back to legacy peers if statusNodes not provided
    const hasStatusNodes = statusNodes && statusNodes.length > 0;
    const hasPeers = peers && peers.length > 0;
    
    if (!hasStatusNodes && !hasPeers) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    let nodes: NetworkGraphNode[];
    let gatewayId: string | null = null;

    if (hasStatusNodes) {
      // BUILD FROM STATUS API DATA
      // This path bypasses all AI_CORE dependencies
      nodes = statusNodes.map(n => {
        const status: NodeStatus = n.online ? "online" : "offline";
        const role: NodeRole = n.role as NodeRole;
        
        // Track gateway node for central positioning
        if (n.role === "gateway") {
          gatewayId = n.name;
        }
        
        return {
          id: n.name,
          name: n.name,
          ip: '',  // Status API doesn't provide IPs
          status,
          role,
          visual: getVisualState(status, role, { reducedMotion: prefersReducedMotion })
        };
      });
    } else {
      // LEGACY PATH: Build from TailscalePeer data
      nodes = peers.map(p => {
        const status = p.status || (p.Online ? "online" : "offline");
        const role = p.role || "host";
        
        if (p.ID === 'self') gatewayId = p.ID;
        
        return {
          id: p.ID,
          name: p.HostName || p.DNSName.split('.')[0],
          ip: p.TailscaleIPs[0],
          status,
          role,
          visual: getVisualState(status, role, { reducedMotion: prefersReducedMotion })
        };
      });
      
      gatewayId = gatewayId || 'self';
    }

    // LINK TOPOLOGY:
    // Gateway connects to ALL other nodes. NEVER filter out nodes - include offline.
    // If no gateway in list, use first node as hub. Single-node graphs get no links (still render).
    const hubId = gatewayId ?? nodes[0]?.id ?? 'minibeast';
    const links: NetworkGraphLink[] = nodes
      .filter(n => n.id !== hubId)
      .map(n => ({
        source: hubId,
        target: n.id,
        linkStyle: n.visual.linkStyle,
        surgeSpeed: n.visual.surgeSpeed,
        particleDensity: n.visual.particleDensity
      }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Wrap in zoom container for auto-fit; applied after simulation stabilizes
    const zoomG = svg.append("g").attr("class", "zoom-container");

    const defs = svg.append("defs");
    
    // AsTrA Synaptic Glow
    const glowFilter = defs.append("filter")
      .attr("id", "nebula-glow")
      .attr("x", "-150%")
      .attr("y", "-150%")
      .attr("width", "400%")
      .attr("height", "400%");
    
    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", 3.5)
      .attr("result", "blur");
    
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const simulation = d3.forceSimulation<NetworkGraphNode>(nodes)
      .force("link", d3.forceLink<NetworkGraphNode, NetworkGraphLink>(links).id(d => d.id).distance(220))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const linkGroup = zoomG.append("g").attr("class", "links");
    
    const linkLines = linkGroup.selectAll(".link-line")
      .data(links)
      .join("line")
      .attr("stroke", d => d.linkStyle === "none" ? "transparent" : "rgba(129, 140, 248, 0.05)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", d => d.linkStyle === "dashed" ? "3,3" : "none");

    const particleData = links.flatMap(l => {
      if (l.linkStyle !== "flow" || l.particleDensity === 0) return [];
      return Array.from({ length: l.particleDensity }).map((_, i) => ({
        link: l,
        offset: i / l.particleDensity
      }));
    });

    const particles = linkGroup.selectAll(".particle")
      .data(particleData)
      .join("circle")
      .attr("class", "particle")
      .attr("r", d => 1.1 * (d.link.surgeSpeed > 2 ? 1.4 : 1))
      .attr("fill", d => d.link.surgeSpeed > 2 ? "#f472b6" : "#818cf8")
      .attr("filter", "url(#nebula-glow)")
      .style("opacity", 0.5);

    const nodeGroup = zoomG.append("g").attr("class", "nodes");
    
    const node = nodeGroup.selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node cursor-pointer group")
      .on("click", (event, d) => {
        // Handle both legacy peer selection and new status node selection
        if (statusNodes && onSelectStatusNode) {
          const statusNode = statusNodes.find(n => n.name === d.id);
          if (statusNode) onSelectStatusNode(statusNode);
        } else if (onSelectNode) {
          const peer = peers.find(p => p.ID === d.id);
          if (peer) onSelectNode(peer);
        }
      })
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    node.each(function(d) {
      const g = d3.select(this);
      const v = d.visual;

      // ROLE-BASED COLOR MAPPING (deterministic, no AI dependency)
      // Uses getRoleColor for consistent styling from /api/status data
      const baseColor = d3.rgb(getRoleColor(d.role));
      
      const color = v.colorShift > 0 
        ? baseColor.brighter(v.colorShift * 2.5) 
        : baseColor.darker(Math.abs(v.colorShift) * 1.5);

      // Gateway nodes are larger (central hub in topology)
      const coreSize = (d.role === "gateway" ? 16 : d.role === "host" ? 14 : 10) * v.glowRadius;
      
      // OFFLINE NODES: Dashed ring indicator
      // Renders nodes as dimmed with visual cue, never hides them
      if (v.ringState === "dashed") {
        g.append("circle")
          .attr("r", coreSize + 4)
          .attr("fill", "none")
          .attr("stroke", color.toString())
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3")
          .style("opacity", 0.5);
      }
      
      const core = g.append("circle")
        .attr("r", coreSize)
        .attr("fill", color.toString())
        .attr("filter", "url(#nebula-glow)")
        .style("opacity", v.opacity);

      // Metabolism Pulse: Smooth radial expansion for active nodes
      if (!prefersReducedMotion && v.pulseRate > 0) {
        core.append("animate")
          .attr("attributeName", "r")
          .attr("values", `${coreSize};${coreSize * 1.15};${coreSize}`)
          .attr("dur", `${1/v.pulseRate}s`)
          .attr("repeatCount", "indefinite")
          .attr("calcMode", "spline")
          .attr("keySplines", "0.4 0 0.2 1; 0.4 0 0.2 1");
      }

      // Synaptic Jitter: Fast irregular opacity flicker for degraded links
      if (!prefersReducedMotion && v.flicker > 0) {
        core.append("animate")
          .attr("attributeName", "opacity")
          .attr("values", `${v.opacity};${v.opacity * 0.1};${v.opacity * 0.8};${v.opacity * 0.05};${v.opacity * 0.6};${v.opacity}`)
          .attr("dur", "0.12s")
          .attr("repeatCount", "indefinite");
      }
    });

    node.append("text")
      .text(d => d.name)
      .attr("x", 24)
      .attr("y", 6)
      .attr("fill", "white")
      .attr("class", "text-[9px] font-mono font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none")
      .style("text-shadow", "0 2px 10px rgba(0,0,0,0.8)");

    simulation.on("tick", () => {
      linkLines
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      const time = Date.now() * 0.001;
      particles.each(function(d: any) {
        const speed = d.link.surgeSpeed;
        const progress = (time * speed + d.offset) % 1;
        const source = d.link.source as any;
        const target = d.link.target as any;
        if (source.x != null && target.x != null) {
          d3.select(this)
            .attr("cx", source.x + (target.x - source.x) * progress)
            .attr("cy", source.y + (target.y - source.y) * progress);
        }
      });

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Auto-fit: center and fit nodes in viewport after simulation stabilizes
    simulation.on("end", () => {
      const padding = 60;
      const nodeR = 24;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach((d: any) => {
        if (d.x != null && d.y != null) {
          minX = Math.min(minX, d.x - nodeR);
          maxX = Math.max(maxX, d.x + nodeR);
          minY = Math.min(minY, d.y - nodeR);
          maxY = Math.max(maxY, d.y + nodeR);
        }
      });
      if (minX === Infinity) return;
      const bw = maxX - minX + padding * 2;
      const bh = maxY - minY + padding * 2;
      const scale = Math.min(width / bw, height / bh, 1.8);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      zoomG.attr("transform", `translate(${width/2},${height/2}) scale(${scale}) translate(${-cx},${-cy})`);
    });

    return () => { simulation.stop(); };
  }, [peers, statusNodes, prefersReducedMotion, onSelectNode, onSelectStatusNode]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-3xl bg-black/60 border border-white/5 shadow-2xl">
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Visual cortex diagnostic legend - Updated for data-driven topology */}
      <div className="absolute bottom-10 left-10 flex flex-col gap-6 pointer-events-none">
        <div className="flex flex-col gap-1.5">
          <span className="text-[8px] font-mono font-bold text-slate-600 uppercase tracking-[0.3em]">Topology_Role_Map</span>
          <div className="flex gap-4 text-[9px] text-slate-400 font-mono">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-400" /> Gateway</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Storage</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> AI</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> GPU</div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <span className="text-[8px] font-mono font-bold text-slate-600 uppercase tracking-[0.3em]">Node_Status</span>
          <div className="flex gap-6 text-[9px] text-slate-500 font-mono italic">
            <span className="flex items-center gap-2"><div className="w-1 h-3 bg-indigo-500 opacity-50 animate-pulse" /> Online: Active</span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-dashed border-slate-500 opacity-40" /> 
              Offline: Dimmed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NebulaGraph;
