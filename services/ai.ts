import { AIConfig, ChatMessage } from '../types';
import { getApiBase } from '../lib/urls';

const api = (path: string) => {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : '/' + path}` : path;
};

export const saveAIConfig = async (config: AIConfig) => {
  const response = await fetch(api('/api/ai/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return response.ok;
};

export const getAIConfig = async (): Promise<AIConfig | null> => {
  try {
    const response = await fetch(api('/api/ai/config'));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

export const chatWithAssistant = async (message: string): Promise<string> => {
  const response = await fetch(api('/api/ai/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const data = await response.json();
  return data.response;
};

export const queryNLQ = async (query: string): Promise<any> => {
  const response = await fetch(api('/api/ai/nlq'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await response.json();
};

export const explainNode = async (nodeData: any): Promise<string> => {
  const response = await fetch(api('/api/ai/explain'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nodeData)
  });
  const data = await response.json();
  return data.explanation;
};

export const generateNarrative = async (peers: any[]): Promise<string> => {
  const response = await fetch(api('/api/ai/report'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(peers)
  });
  const data = await response.json();
  return data.narrative;
};
