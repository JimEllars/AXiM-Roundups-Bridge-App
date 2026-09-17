import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSystemHealth() {
  const [status, setStatus] = useState({
    supabase: 'checking',
    edge: 'checking',
    temporal: 'checking'
  });

  const checkStatus = useCallback(async () => {
    // 1. Supabase Connection State
    try {
      const { error } = await supabase
        .from('roundups_audit_logs')
        .select('*', { count: 'exact', head: true });
      setStatus(s => ({ ...s, supabase: error ? 'error' : 'online' }));
    } catch {
      setStatus(s => ({ ...s, supabase: 'error' }));
    }

    // 2. Edge Worker Latency
    const edgeUrl = import.meta.env.VITE_EDGE_WORKER_URL;
    if (!edgeUrl) {
      console.warn("VITE_EDGE_WORKER_URL missing, cannot check edge health");
      setStatus(s => ({ ...s, edge: 'error' }));
    } else {
      try {
        const url = new URL('/health', edgeUrl);
        const startTime = performance.now();
        const res = await fetch(url.toString(), {
          headers: { "Content-Type": "application/json" }
        });
        const duration = performance.now() - startTime;
        if (res.ok) {
            setStatus(s => ({ ...s, edge: duration < 500 ? 'online' : 'degraded' }));
        } else {
            setStatus(s => ({ ...s, edge: 'error' }));
        }
      } catch (e) {
        setStatus(s => ({ ...s, edge: 'error' }));
      }
    }

    // 3. Temporal REST Gateway status
    const temporalUrl = import.meta.env.VITE_TEMPORAL_REST_URL;
    if (!temporalUrl) {
      setStatus(s => ({ ...s, temporal: 'error' }));
    } else {
      try {
        const url = new URL('/health', temporalUrl);
        const res = await fetch(url.toString(), {
          headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
            setStatus(s => ({ ...s, temporal: 'online' }));
        } else {
            setStatus(s => ({ ...s, temporal: 'error' }));
        }
      } catch {
        setStatus(s => ({ ...s, temporal: 'error' }));
      }
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // 30-second interval
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { status, checkStatus };
}
