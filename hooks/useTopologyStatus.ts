import { useState, useEffect, useCallback, useRef } from 'react';
import { StatusNode, TopologyState } from '../types';
import * as api from '../services/api';

// ============================================================================
// TOPOLOGY STATUS HOOK
// Fetches node data from /api/status for deterministic, data-driven rendering.
// 
// KEY DESIGN DECISIONS:
// - NO AI_CORE DEPENDENCY: Topology renders immediately from live status feed
// - GRACEFUL DEGRADATION: If API fails, shows last known nodes from memory
// - NON-BLOCKING ERRORS: Failures show warning badge, not blocking error state
// - ALWAYS RENDERS: No empty canvas states - worst case uses fallback data
// ============================================================================

const CACHE_KEY = 'astra_topology_cache';
const POLL_INTERVAL = 30000; // 30 seconds

/** Fallback nodes if API fails and no cache exists - never show empty canvas */
const FALLBACK_NODES: StatusNode[] = [
  { name: 'minibeast', role: 'gateway', online: true },
  { name: 'hermes', role: 'storage', online: false },
  { name: 'kratos', role: 'ai', online: false },
  { name: 'hades', role: 'gpu', online: false },
];

/** Load cached nodes from localStorage */
function loadCachedNodes(): StatusNode[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.nodes || null;
    }
  } catch {
    // Cache read failed - not critical
  }
  return null;
}

/** Save nodes to localStorage cache */
function saveCachedNodes(nodes: StatusNode[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ 
      nodes, 
      timestamp: Date.now() 
    }));
  } catch {
    // Cache write failed - not critical
  }
}

export interface UseTopologyStatusReturn {
  topology: TopologyState;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for fetching and managing topology status data.
 * 
 * This hook provides:
 * - Automatic polling for live status updates
 * - Graceful fallback to cached data on API failure
 * - Non-blocking error handling with warning badges
 * - Guaranteed node rendering (never returns empty array)
 */
export function useTopologyStatus(): UseTopologyStatusReturn {
  const [topology, setTopology] = useState<TopologyState>(() => {
    // Initialize with cached data if available, otherwise use fallback
    // This ensures topology renders immediately even before first API call
    const cached = loadCachedNodes();
    return {
      nodes: cached || FALLBACK_NODES,
      isLive: false,
      lastUpdated: 0,
      error: null
    };
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const pollIntervalRef = useRef<number | null>(null);

  const fetchTopology = useCallback(async () => {
    const isDev = () => {
      try { return !!(import.meta as any).env?.DEV; } catch { return false; }
    };
    try {
      const response = await api.fetchStatus();
      const isFallback = response.source === 'nebula-fallback';

      // Validate response has nodes
      if (!response.nodes || !Array.isArray(response.nodes)) {
        throw new Error('Invalid status response: missing nodes array');
      }

      if (isDev()) {
        console.log('[useTopologyStatus] received nodes:', response.nodes.length, response.nodes);
        if (isFallback) {
          console.warn('[useTopologyStatus] using backend fallback:', response.error || 'status backend unreachable');
        }
      }

      // Update cache with fresh data
      saveCachedNodes(response.nodes);

      setTopology({
        nodes: response.nodes,
        isLive: !isFallback,
        lastUpdated: Date.now(),
        error: isFallback
          ? (response.error || 'Status backend unavailable: using local fallback')
          : null
      });
    } catch (error: any) {
      if (isDev()) {
        console.warn('[useTopologyStatus] fetch failed (non-blocking):', error.message);
      }

      // GRACEFUL DEGRADATION: keep existing nodes, use cache or fallback
      // Graph ALWAYS renders - never empty canvas
      setTopology(prev => {
        const fallbackNodes = loadCachedNodes() || prev.nodes;
        const nodesToUse = fallbackNodes.length > 0 ? fallbackNodes : FALLBACK_NODES;
        if (isDev() && fallbackNodes.length === 0) {
          console.log('[useTopologyStatus] using FALLBACK_NODES');
        }
        return {
          ...prev,
          nodes: nodesToUse,
          isLive: false,
          error: `Status feed unavailable: ${error.message}`
        };
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchTopology();
  }, [fetchTopology]);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchTopology();

    // Set up polling interval for live updates
    pollIntervalRef.current = window.setInterval(fetchTopology, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchTopology]);

  return { topology, refresh, isLoading };
}
