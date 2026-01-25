
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Shield, ShieldAlert, Cpu, Bot, Terminal, User } from 'lucide-react';
import { ChatMessage, AIConfig } from '../types';
import * as aiApi from '../services/ai';

interface NebulaAssistantProps {
  config: AIConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

const NebulaAssistant: React.FC<NebulaAssistantProps> = ({ config, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await aiApi.chatWithAssistant(input);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Operational failure. Unable to link with AsTrA logic core.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 glass-panel border-l border-white/10 h-full flex flex-col shadow-2xl z-50">
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-indigo-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Bot size={20} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-tighter">AsTrA</h3>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${config ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className="text-[10px] text-slate-500 uppercase font-mono">
                {config ? `CORE: ${config.provider}` : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
      </header>

      {/* Privacy Badge */}
      <div className="px-4 py-2 bg-black/20 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
          {config?.cloudEnabled ? (
            <div className="flex items-center gap-1 text-amber-500">
              <ShieldAlert size={12} /> External Provider
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-500">
              <Shield size={12} /> Local Logic
            </div>
          )}
        </div>
        <div className="text-[9px] text-slate-600 font-mono">
          FIREWALL: {config?.allowSensitive ? "PASS" : "REDACT"}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
            <Sparkles size={32} className="mb-4 opacity-10" />
            <p className="text-xs uppercase tracking-widest font-mono">Operational Interface Active</p>
            <p className="text-[10px] mt-2 opacity-50">I am monitoring mesh topology. State your inquiry.</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`p-2 rounded-lg h-fit ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-white/10'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600/20 text-indigo-100 rounded-tr-none' : 'bg-white/5 text-slate-300 rounded-tl-none'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-lg h-fit bg-white/10">
              <Bot size={16} className="animate-pulse" />
            </div>
            <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
              <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
              <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-75" />
              <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/40">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Direct core inquiry..."
            className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px] max-h-32 resize-none custom-scrollbar"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[8px] text-center text-slate-700 mt-2 font-mono uppercase tracking-[0.2em]">AsTrA Core Consciousness Link</p>
      </div>
    </div>
  );
};

export default NebulaAssistant;
