
import React, { useState } from 'react';
// Added RefreshCw to the list of imports from lucide-react
import { Bot, Shield, ShieldAlert, Cpu, Globe, Save, Info, RefreshCw } from 'lucide-react';
import { AIConfig } from '../types';
import * as aiApi from '../services/ai';

interface AISettingsProps {
  currentConfig: AIConfig | null;
  onSave: (config: AIConfig) => void;
  onClose: () => void;
}

const AISettings: React.FC<AISettingsProps> = ({ currentConfig, onSave, onClose }) => {
  const [config, setConfig] = useState<AIConfig>(currentConfig || {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3',
    cloudEnabled: false,
    allowSensitive: false
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await aiApi.saveAIConfig(config);
    if (success) {
      onSave(config);
      onClose();
    } else {
      alert("Failed to connect to provider. Verify URL.");
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <header className="p-6 border-b border-white/5 flex items-center gap-4 bg-indigo-500/5">
          <div className="p-3 bg-indigo-500/20 rounded-2xl">
            <Bot className="text-indigo-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Assistant Setup</h2>
            <p className="text-xs text-slate-400">Configure your local or cloud intelligence layer.</p>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setConfig({...config, provider: 'ollama', baseUrl: 'http://127.0.0.1:11434', cloudEnabled: false})}
              className={`p-4 rounded-2xl border transition-all text-left ${config.provider === 'ollama' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              <Cpu className="mb-2" size={20} />
              <p className="text-sm font-bold">Local Ollama</p>
              <p className="text-[10px] opacity-60">Private, local execution.</p>
            </button>
            <button 
              onClick={() => setConfig({...config, provider: 'openai', baseUrl: 'https://api.openai.com/v1', cloudEnabled: true})}
              className={`p-4 rounded-2xl border transition-all text-left ${config.provider === 'openai' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              <Globe className="mb-2" size={20} />
              <p className="text-sm font-bold">Cloud Provider</p>
              <p className="text-[10px] opacity-60">OpenAI compatible API.</p>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Base URL</label>
              <input 
                type="text" 
                value={config.baseUrl}
                onChange={e => setConfig({...config, baseUrl: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            {config.provider === 'openai' && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">API Key</label>
                <input 
                  type="password" 
                  placeholder="sk-..."
                  value={config.apiKey}
                  onChange={e => setConfig({...config, apiKey: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Model ID</label>
              <input 
                type="text" 
                value={config.model}
                onChange={e => setConfig({...config, model: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Privacy Firewall */}
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="text-emerald-400" size={16} />
                <span className="text-xs font-semibold">Data Redaction</span>
              </div>
              <button 
                onClick={() => setConfig({...config, allowSensitive: !config.allowSensitive})}
                className={`w-10 h-5 rounded-full transition-all relative ${config.allowSensitive ? 'bg-red-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.allowSensitive ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed italic flex items-start gap-2">
              <Info size={12} className="shrink-0 mt-0.5" />
              {config.allowSensitive 
                ? "WARNING: Internal IPs and hostnames will be sent to the AI provider. This is risky for cloud services."
                : "Active: IPs (100.x.y.z) and internal Tailscale hostnames will be masked before reaching the provider."}
            </p>
          </div>
        </div>

        <footer className="p-6 bg-black/40 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {isSaving ? 'Testing...' : 'Save Configuration'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AISettings;
