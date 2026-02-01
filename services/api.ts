import { TailscalePeer, AIService, HardwareStats, StatusResponse } from '../types';
import { getApiBase } from '../lib/urls';

// ============================================================================
// API BASE - scheme-aware, no Mixed Content
// Uses same origin by default; VITE_API_ORIGIN overrides when set.
// ============================================================================

const api = (path: string) => {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : '/' + path}` : path;
};

const isDev = () => {
  try {
    return !!(import.meta as any).env?.DEV;
  } catch {
    return false;
  }
};

/**
 * Fetch topology status from /api/status
 * Returns node list with name, role, and online status.
 */
export const fetchStatus = async (): Promise<StatusResponse> => {
  const url = api('/api/status');
  if (isDev()) console.log('[fetchStatus] GET', url);

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-cache'
  });

  const raw = await response.text();
  if (isDev()) console.log('[fetchStatus] status=', response.status, 'raw=', raw.slice(0, 500));

  if (!response.ok) {
    const err = new Error(`Status API error: ${response.status}`);
    if (isDev()) console.error('[fetchStatus] ERROR', err.message);
    throw err;
  }

  const data: StatusResponse = JSON.parse(raw);
  if (isDev()) console.log('[fetchStatus] mapped nodes=', data?.nodes?.map(n => `${n.name}:${n.online}`) ?? 'null');
  return data;
};

export const ping = async (): Promise<boolean> => {
  try {
    const response = await fetch(api('/api/health'), { 
      method: 'GET',
      cache: 'no-cache'
    });
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
};

export const fetchPeers = async (): Promise<TailscalePeer[]> => {
  try {
    const response = await fetch(api('/api/peers'), {
      method: 'GET'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    // Backend now returns normalized array directly
    const peers: TailscalePeer[] = await response.json();
    return peers;
  } catch (error: any) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Backend offline');
    }
    throw error;
  }
};

export const fetchDemoPeers = (): TailscalePeer[] => {
  return [
    {
      ID: 'self',
      HostName: 'Nebula-Prime',
      DNSName: 'nebula-prime.tailscale.net',
      TailscaleIPs: ['100.64.0.1'],
      Online: true,
      OS: 'linux',
      Active: true,
      Services: [
        { name: 'Ollama', port: 11434 },
        { name: 'ComfyUI', port: 8188 }
      ],
      Hardware: {
        cpu_usage: 42,
        memory: { percent: 65, used: 21474836480, total: 34359738368 },
        disk: { percent: 12 },
        platform: 'Linux'
      }
    },
    {
      ID: 'peer-1',
      HostName: 'Neural-Blade-01',
      DNSName: 'neural-blade.tailscale.net',
      TailscaleIPs: ['100.64.0.2'],
      Online: true,
      OS: 'linux',
      Active: true,
      Services: [
        { name: 'Stable Diffusion', port: 7860 }
      ],
      Hardware: {
        cpu_usage: 88,
        memory: { percent: 92, used: 60129542144, total: 68719476736 },
        disk: { percent: 45 },
        platform: 'Linux'
      }
    },
    {
      ID: 'peer-2',
      HostName: 'MacBook-Pro-M3',
      DNSName: 'm3-pro.tailscale.net',
      TailscaleIPs: ['100.64.0.3'],
      Online: false,
      OS: 'macos',
      Active: false
    },
    {
      ID: 'peer-3',
      HostName: 'Core-Cluster',
      DNSName: 'cluster.tailscale.net',
      TailscaleIPs: ['100.64.0.4'],
      Online: true,
      OS: 'linux',
      Active: true,
      Services: [
        { name: 'Pinokio', port: 4000 },
        { name: 'LM Studio', port: 1234 }
      ]
    }
  ];
};

export const scanNode = async (ip: string): Promise<AIService[]> => {
  try {
    const response = await fetch(api(`/api/scan/${ip}`));
    if (!response.ok) return [];
    const data = await response.json();
    return data.services || [];
  } catch {
    return [];
  }
};

export const getHardwareStats = async (): Promise<HardwareStats | null> => {
  try {
    const response = await fetch(api('/api/stats'));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};
