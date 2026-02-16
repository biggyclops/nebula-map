// ============================================================================
// ASTRA VISUAL CORTEX - MAIN APPLICATION
// 
// TOPOLOGY IS NO LONGER AI-GATED:
// The graph now renders deterministically from /api/status data.
// No AI_CORE inference required - nodes appear immediately.
// Offline nodes are dimmed, never hidden. No empty canvas states.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TailscalePeer, HardwareStats, NodeStatus, NodeRole, AIConfig, StatusNode } from './types';
import * as api from './services/api';
import * as gemini from './services/gemini';
import * as aiApi from './services/ai';
import NebulaGraph from './components/NebulaGraph';
import DeviceInspector from './components/DeviceInspector';
import NebulaAssistant from './components/NebulaAssistant';
import AISettings from './components/AISettings';
import NebulaBackground from './components/NebulaBackground';
import { useNebulaActivity } from './hooks/useNebulaActivity';
import { useTopologyStatus } from './hooks/useTopologyStatus';
import { 
  Network, 
  RefreshCw, 
  Shield, 
  BarChart3, 
  Map as MapIcon, 
  Download,
  AlertCircle,
  WifiOff,
  Terminal,
  ExternalLink,
  Zap,
  PlayCircle,
  XCircle,
  Bug,
  Search,
  Monitor,
  Activity,
  Cpu,
  Bot,
  Sparkles,
  Settings,
  Eye
} from 'lucide-react';

const App: React.FC = () => {
  const [peers, setPeers] = useState<TailscalePeer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<TailscalePeer | null>(null);
  const [selectedStatusNode, setSelectedStatusNode] = useState<StatusNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<'none' | 'offline' | 'api'>('none');
  const [errorMessage, setErrorMessage] = useState("");
  const [insights, setInsights] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // AI State
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [osFilter, setOsFilter] = useState<string>('all');
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false);

  // Nebula Animation Control
  const { isActive: isWarping, focalPoint, startActivity, stopActivity } = useNebulaActivity();

  // ============================================================================
  // DATA-DRIVEN TOPOLOGY
  // Uses /api/status for deterministic rendering - NO AI_CORE DEPENDENCY
  // The topology renders immediately with all nodes visible.
  // ============================================================================
  const { topology, refresh: refreshTopology, isLoading: isTopologyLoading } = useTopologyStatus();

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await aiApi.getAIConfig();
      setAiConfig(config);
      if (!config) setShowSettings(true);
    };
    fetchConfig();
  }, []);

  const loadNetwork = useCallback(async (isDemo = false) => {
    setLoading(true);
    setErrorType('none');
    setErrorMessage("");
    setIsDemoMode(isDemo);
    startActivity();

    try {
      let peerData: TailscalePeer[];
      if (isDemo) {
        await new Promise(r => setTimeout(r, 800));
        peerData = api.fetchDemoPeers();
      } else {
        try {
          peerData = await api.fetchPeers();
          const localStats = await api.getHardwareStats();

          const enrichedPeers = await Promise.all(peerData.map(async (peer) => {
            if (peer.Online) {
              try {
                const services = await api.scanNode(peer.TailscaleIPs[0]);
                return { ...peer, Services: services };
              } catch {
                return peer;
              }
            }
            return peer;
          }));

          peerData = enrichedPeers.map(p => {
            if (p.ID === 'self' && localStats) {
              return { ...p, Hardware: localStats };
            }
            return p;
          });
        } catch (error: any) {
          if (error.message === 'Backend offline') {
            setIsDemoMode(true);
            setErrorType('offline');
            peerData = api.fetchDemoPeers();
          } else {
            throw error;
          }
        }
      }

      const processedPeers = peerData.map(p => {
        let status: NodeStatus = p.Online ? "online" : "offline";
        if (p.Hardware && p.Hardware.cpu_usage > 85) status = "busy";
        else if (p.Hardware && p.Hardware.cpu_usage < 10) status = "idle";
        else if (p.Hardware && p.Hardware.cpu_usage > 70) status = "degraded"; // Semantic jitter
        
        let role: NodeRole = "host";
        if (p.ID === 'self') role = "host";
        else if (p.Services && p.Services.length > 0) role = "ai_host";
        else if (p.HostName?.toLowerCase().includes("gpu") || p.Hardware?.cpu_usage > 90) role = "gpu";
        else if (p.HostName?.toLowerCase().includes("exit") || p.ID === "peer-3") role = "exit";

        return { ...p, status, role };
      });

      setPeers(processedPeers);
      
      // TOPOLOGY STATUS MESSAGE
      // No longer depends on AI_CORE - shows deterministic status from live feed
      // AI insights are optional enhancement, not a gate for rendering
      try {
        const insightText = await gemini.getNetworkInsights(processedPeers);
        setInsights(insightText || "Topology loaded from live status feed.");
      } catch {
        // AI insights failed - show deterministic status message instead
        setInsights("Topology loaded from live status feed.");
      }

    } catch (error: any) {
      console.error('🌌 AsTrA Sensing Error:', error.message);
      setErrorType('api');
      setErrorMessage(error.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
        stopActivity();
      }, 1000);
    }
  }, [startActivity, stopActivity]);

  useEffect(() => {
    loadNetwork();
  }, []);

  const handleMagicSearch = async () => {
    if (!searchQuery.trim() || !aiConfig) return;
    startActivity();
    try {
      const filters = await aiApi.queryNLQ(searchQuery);
      if (filters.status) setStatusFilter(filters.status);
      if (filters.role) {
        setSearchQuery("");
        setAiOnlyFilter(filters.role === 'ai_host');
      }
    } catch (e) {
      console.error("AsTrA Logic Jitter", e);
    } finally {
      stopActivity();
    }
  };

  const filteredPeers = useMemo(() => {
    return peers.filter(peer => {
      const matchesSearch = (peer.HostName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                           peer.TailscaleIPs.some(ip => ip.includes(searchQuery));
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'online' && peer.Online) || 
                            (statusFilter === 'offline' && !peer.Online);
      const matchesOS = osFilter === 'all' || peer.OS === osFilter;
      const matchesAI = !aiOnlyFilter || (peer.Services && peer.Services.length > 0);

      return matchesSearch && matchesStatus && matchesOS && matchesAI;
    });
  }, [peers, searchQuery, statusFilter, osFilter, aiOnlyFilter]);

  const uniqueOSs = useMemo(() => {
    const oss = new Set(peers.map(p => p.OS).filter(Boolean));
    return Array.from(oss);
  }, [peers]);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-200 bg-transparent relative selection:bg-indigo-500/30">
      <NebulaBackground isActive={isWarping} focalPoint={focalPoint} />
      
      {/* AsTrA Neural Core Indicator */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent z-[100]" />

      {/* Primary Module Navigation */}
      <nav className="w-20 border-r border-white/5 glass-panel flex flex-col items-center py-8 gap-10 z-10">
        <div className="w-12 h-12 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/40 group relative">
          <Eye className="text-white" size={24} />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#020617] rounded-full" />
        </div>
        
        <div className="flex flex-col gap-8">
          <button 
            className={`p-3 rounded-2xl transition-all ${!isDemoMode ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => isDemoMode && loadNetwork(false)}
            title="Cortex Visualization"
          >
            <MapIcon size={20} />
          </button>
          
          <button 
            className={`p-3 rounded-2xl transition-all ${isAssistantOpen ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            title="Core Consciousness Link"
          >
            <Bot size={20} />
          </button>

          <div className="h-px w-6 bg-white/5 mx-auto" />

          <button className="p-3 text-slate-500 hover:text-slate-300 transition-all">
            <Shield size={20} />
          </button>
          <button className="p-3 text-slate-500 hover:text-slate-300 transition-all">
            <Activity size={20} />
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-6 pb-4">
          <button onClick={() => setShowSettings(true)} className="p-3 text-slate-500 hover:text-slate-300 transition-all">
            <Settings size={20} />
          </button>
          <button 
            onClick={() => loadNetwork(false)} 
            disabled={loading}
            className={`p-3 text-slate-500 hover:text-slate-300 transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </nav>

      {/* Visual Cortex Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-0">
        <header className="h-20 border-b border-white/5 glass-panel flex items-center justify-between px-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-xl tracking-tight flex items-center gap-3">
                <span className="font-bold text-white tracking-[0.05em] uppercase text-sm">AsTrA</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-slate-400 font-medium text-xs uppercase tracking-[0.2em]">Visual Cortex Overlay</span>
              </h1>
              <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                {/* Status indicator reflects live topology state, not AI_CORE */}
                <span className={`${topology.isLive ? 'text-emerald-500/60' : 'text-amber-500/60'} font-bold`}>
                  ● {topology.isLive ? 'Feed_Live' : 'Feed_Cached'}
                </span>
                <span className="mx-1 opacity-20">|</span>
                <span>Active_Sense: Topology_Grid</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-mono text-slate-600 uppercase font-bold">Topology_Sync</span>
                <div className="flex gap-1">
                    {/* Status bars: reflect topology feed state, not AI state */}
                    {[1,2,3,4].map(i => (
                      <div 
                        key={i} 
                        className={`w-3 h-1 rounded-full transition-colors ${
                          isTopologyLoading ? 'bg-slate-800 animate-pulse' : 
                          topology.isLive ? 'bg-emerald-500/40' : 
                          'bg-amber-500/40'
                        }`} 
                      />
                    ))}
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 p-8 relative flex flex-col gap-6">
          {!loading && (
            <div className="flex flex-wrap items-center gap-4 glass-panel p-4 rounded-3xl border border-white/5 z-20 shadow-xl">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="text" 
                  placeholder="Inquire synaptic state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMagicSearch()}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-2.5 pl-12 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all placeholder:text-slate-700 font-mono"
                />
                <button 
                  onClick={handleMagicSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-400 p-1 transition-colors"
                  title="Direct Core Logic Inquiry"
                >
                  <Sparkles size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/5">
                {['all', 'online', 'offline'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <select 
                value={osFilter}
                onChange={(e) => setOsFilter(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-2xl py-2 px-4 text-[9px] font-bold uppercase tracking-widest text-slate-400 outline-none cursor-pointer hover:bg-black/60 transition-colors"
              >
                <option value="all">Platform: All</option>
                {uniqueOSs.map(os => <option key={os} value={os}>{os}</option>)}
              </select>

              <button 
                onClick={() => setAiOnlyFilter(!aiOnlyFilter)}
                className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all border ${aiOnlyFilter ? 'bg-fuchsia-600/10 border-fuchsia-500/30 text-fuchsia-300' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
              >
                <Cpu size={14} /> AI_CORE
              </button>
            </div>
          )}

          <div className="flex-1 w-full relative">
            {/* 
              TOPOLOGY GRAPH - DATA-DRIVEN, NOT AI-GATED
              
              Prioritizes statusNodes from /api/status for deterministic rendering.
              Falls back to filteredPeers for legacy compatibility.
              
              Key behaviors:
              - Renders immediately without waiting for AI_CORE
              - Shows ALL nodes (offline nodes are dimmed, not hidden)
              - Gateway node (minibeast) is always central hub
              - No empty canvas states - always shows something
            */}
            <NebulaGraph 
              statusNodes={topology.nodes.length > 0 ? topology.nodes : undefined}
              peers={filteredPeers} 
              onSelectNode={setSelectedPeer}
              onSelectStatusNode={setSelectedStatusNode}
            />

            {/* DEBUG OVERLAY - Proves we receive data; renders even if graph fails */}
            <div className="absolute bottom-10 right-8 w-56 glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 z-30 font-mono text-[10px]">
              <div className="text-amber-400 font-bold uppercase tracking-wider mb-2">Debug: Status Feed</div>
              <div className="space-y-1 text-slate-400">
                <div>Last fetch: {topology.lastUpdated ? new Date(topology.lastUpdated).toLocaleTimeString() : '—'}</div>
                <div>nodes.length: {topology.nodes.length}</div>
                <div className="mt-2 text-slate-300">
                  {topology.nodes.map(n => (
                    <div key={n.name} className="flex justify-between gap-4">
                      <span>{n.name}</span>
                      <span className={n.online ? 'text-emerald-400' : 'text-slate-500'}>{n.online ? 'online' : 'offline'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Topology Status Overlay - Data-driven, not AI-gated */}
            <div className="absolute top-8 right-8 w-80 pointer-events-none group">
              <div className="glass-panel p-6 rounded-3xl shadow-2xl pointer-events-auto bg-indigo-950/10 border border-indigo-500/10 backdrop-blur-xl group-hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={14} className="text-indigo-500" /> Topology_Status
                  </h3>
                  {/* Status indicator: green = live, amber = stale/cached */}
                  <div className={`w-1.5 h-1.5 rounded-full ${topology.isLive ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                </div>
                
                {/* Warning badge for API failures - non-blocking */}
                {topology.error && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertCircle size={12} className="text-amber-500" />
                    <span className="text-[9px] text-amber-400 font-mono">Using cached data</span>
                  </div>
                )}
                
                <div className="text-[11px] text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-3 custom-scrollbar font-light italic">
                  {/* Keep status copy aligned with live/cached feed state */}
                  {topology.isLive 
                    ? "Topology loaded from live status feed."
                    : topology.error
                      ? "Topology loaded from cached/local fallback data."
                      : insights || "Topology loaded from cached data."}
                </div>
                
                {/* Node count summary */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Nodes: {topology.nodes.length}</span>
                    <span>Online: {topology.nodes.filter(n => n.online).length}</span>
                    <span>Offline: {topology.nodes.filter(n => !n.online).length}</span>
                  </div>
                </div>
                
                {aiConfig && (
                   <button className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-2xl text-[9px] font-bold uppercase tracking-widest text-indigo-400 transition-all border border-indigo-500/10 hover:border-indigo-500/30">
                    <Sparkles size={12} /> Analyze_Topology
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Footer Telemetry */}
        <footer className="h-10 border-t border-white/5 glass-panel flex items-center justify-between px-10 text-[9px] font-mono text-slate-600 uppercase tracking-[0.3em]">
            <div className="flex gap-8">
                <span>Core: Nominal</span>
                <span>Nodes: {topology.nodes.length}</span>
                <span className={`${topology.isLive ? 'text-emerald-500/60' : 'text-amber-500/60'} font-bold`}>
                  Status_Feed: {topology.isLive ? 'Live' : 'Cached'}
                </span>
            </div>
            <div className="flex gap-4 items-center">
                <span>Lat: {loading || isTopologyLoading ? '--' : '42ms'}</span>
                <div className="h-3 w-px bg-white/5" />
                <span>Enc: WireGuard_Operational</span>
            </div>
        </footer>
      </main>

      {/* Auxiliary Modules */}
      <DeviceInspector peer={selectedPeer} onClose={() => setSelectedPeer(null)} />
      <NebulaAssistant config={aiConfig} isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
      
      {showSettings && (
        <AISettings 
          currentConfig={aiConfig} 
          onSave={(c) => setAiConfig(c)} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
};

export default App;
