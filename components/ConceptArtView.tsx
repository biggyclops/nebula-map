
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, ImageIcon } from 'lucide-react';
import { generateConceptArt } from '../services/gemini';

const ConceptArtView: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const synthesize = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await generateConceptArt();
      setImageUrl(url);
    } catch (e: any) {
      setError(e.message || "Failed to synthesize nebula vision.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    synthesize();
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40">
      {loading ? (
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="relative">
            <Sparkles className="text-indigo-400" size={64} />
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-indigo-200 font-bold uppercase tracking-[0.4em] text-lg mb-2">Synthesizing Vision</h3>
            <p className="text-slate-500 font-mono text-xs">Mapping constellations from mesh topology...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center p-8 glass-panel rounded-2xl border-red-500/20 max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Synthesis Failed</h3>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button 
            onClick={synthesize}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} /> Re-initialize Design
          </button>
        </div>
      ) : (
        <div className="relative group w-full h-full p-4">
          <img 
            src={imageUrl!} 
            alt="Nebula Map Concept" 
            className="w-full h-full object-contain rounded-xl shadow-2xl shadow-indigo-500/10 border border-white/10"
          />
          <div className="absolute bottom-10 left-10 glass-panel px-6 py-4 rounded-xl border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Concept Schematic</h4>
            <p className="text-slate-400 text-[10px] leading-relaxed max-w-xs">
              AI-generated visual metaphor of the current network state. 
              Stars represent nodes, planets with rings indicate AI service hosts, 
              and the peripheral wormhole signifies the mesh exit node.
            </p>
          </div>
          <button 
            onClick={synthesize}
            className="absolute top-10 right-10 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-slate-300 hover:text-white transition-all"
            title="Generate New Variation"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ConceptArtView;
