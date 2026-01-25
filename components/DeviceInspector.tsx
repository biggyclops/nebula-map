
import React, { useState } from 'react';
import { TailscalePeer } from '../types';
import { Box, Cpu, HardDrive, Activity, ExternalLink, ShieldCheck, Zap, Sparkles, RefreshCw } from 'lucide-react';
import * as aiApi from '../services/ai';

interface DeviceInspectorProps {
  peer: TailscalePeer | null;
  onClose: () => void;
}

const DeviceInspector: React.FC<DeviceInspectorProps> = ({ peer, onClose }) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  if (!peer) return null;

  const handleExplain = async () => {
    setIsExplaining(true);
    try {
      const text = await aiApi.explainNode(peer);
      setExplanation(text);
    } catch (e) {
      setExplanation("Analysis unavailable.");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="w-96 glass-panel border-l border-white/10 h-full p-6 flex flex-col gap-6 overflow-y-auto z-40">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{peer.HostName || "Unknown Node"}</h2>
          <p className="text-xs text-slate-500 font-mono tracking-tighter">{peer.TailscaleIPs[0]}</p>
        </div>
        <button onClick={() => { setExplanation(null); onClose(); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">✕</button>
      </div>

      <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
        <div className={`w-2 h-2 rounded-full ${peer.Online ? 'bg-green-500' : 'bg-slate-700'}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {peer.Online ? 'Topology Linked' : 'Link Severed'}
        </span>
      </div>

      <section>
        <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Box size={14} /> Local Services
        </h3>
        <div className="space-y-2">
          {peer.Services && peer.Services.length > 0 ? (
            peer.Services.map(service => (
              <div key={service.port} className="flex items-center justify-between p-3 bg-indigo-500/5 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">{service.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">PORT: {service.port}</p>
                  </div>
                </div>
                <button className="text-slate-500 hover:text-white">
                  <ExternalLink size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-slate-600 italic uppercase tracking-wider">No service markers found.</p>
          )}
        </div>
      </section>

      {/* AsTrA Analysis Block */}
      <section className="bg-indigo-600/5 rounded-2xl p-4 border border-indigo-500/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={12} /> AsTrA Analysis
          </h4>
          {!explanation && !isExplaining && (
             <button 
              onClick={handleExplain}
              className="text-[9px] bg-indigo-600 text-white px-3 py-1 rounded-full font-bold hover:bg-indigo-500 transition-all uppercase tracking-tighter"
             >
               Probe Role
             </button>
          )}
        </div>
        {isExplaining ? (
          <div className="flex items-center gap-2 text-indigo-500 animate-pulse text-[9px] font-mono">
            <RefreshCw size={12} className="animate-spin" /> RUNNING_HEURISTICS...
          </div>
        ) : explanation ? (
          <p className="text-[11px] text-slate-400 leading-relaxed font-light italic">"{explanation}"</p>
        ) : (
          <p className="text-[9px] text-slate-600 uppercase tracking-tighter">Initiate topological inquiry for AsTrA role synthesis.</p>
        )}
      </section>

      {peer.Hardware && (
        <section>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Activity size={14} /> Heuristics
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] mb-1 font-mono uppercase">
                <span className="text-slate-500">Compute</span>
                <span className="text-slate-300">{peer.Hardware.cpu_usage}%</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${peer.Hardware.cpu_usage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1 font-mono uppercase">
                <span className="text-slate-500">Memory</span>
                <span className="text-slate-300">{peer.Hardware.memory.percent}%</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 transition-all duration-500" style={{ width: `${peer.Hardware.memory.percent}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono bg-white/5 p-3 rounded-xl border border-white/5 uppercase tracking-tighter">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Tailscale WireGuard&reg; Path Encrypted</span>
        </div>
        <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/10">
          Establish SSH Link
        </button>
      </div>
    </div>
  );
};

export default DeviceInspector;
