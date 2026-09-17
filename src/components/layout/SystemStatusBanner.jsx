import React from 'react';
import { useSystemHealth } from '../../hooks/useSystemHealth';

export default function SystemStatusBanner() {
  const { status } = useSystemHealth();

  const StatusDot = ({ state }) => (
    <div className={`w-2 h-2 rounded-full ${
      state === 'online' ? 'bg-emerald-400' :
      state === 'degraded' ? 'bg-amber-400' :
      state === 'error' ? 'bg-rose-400' :
      'bg-slate-500 animate-pulse'
    }`} />
  );

  return (
    <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 shadow-sm text-xs font-medium">
      <div className="flex items-center gap-2">
        <StatusDot state={status.supabase} />
        <span className="text-slate-300">Database</span>
      </div>
      <div className="w-px h-3 bg-slate-700"></div>
      <div className="flex items-center gap-2">
        <StatusDot state={status.edge} />
        <span className="text-slate-300">Edge Worker</span>
      </div>
      <div className="w-px h-3 bg-slate-700"></div>
      <div className="flex items-center gap-2">
        <StatusDot state={status.temporal} />
        <span className="text-slate-300">Temporal Engine</span>
      </div>
    </div>
  );
}
