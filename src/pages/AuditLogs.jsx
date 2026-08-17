import React, { useEffect, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../components/common/SafeIcon';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import LogDetailsDrawer from '../components/logs/LogDetailsDrawer';

const { FiSearch, FiDownload, FiExternalLink, FiClock, FiCheckCircle, FiAlertCircle, FiEye } = FiIcons;

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();

    // Set up real-time subscription
    let channel;
    try {
      channel = supabase
        .channel('audit-logs-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'roundups_audit_logs'
        }, (payload) => {
          // You could optimize this by updating state directly, but fetching ensures consistency
          fetchLogs();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to audit logs channel');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to audit logs channel');
          }
        });
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('roundups_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching logs:', error);
      } else if (data) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.campaign_id.toLowerCase().includes(search.toLowerCase()) ||
    log.roundups_job_id?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return { icon: FiCheckCircle, color: 'text-emerald-400', spin: false };
      case 'failed': return { icon: FiAlertCircle, color: 'text-red-400', spin: false };
      case 'generating':
      case 'processing': return { icon: FiClock, color: 'text-amber-400', spin: true };
      default: return { icon: FiClock, color: 'text-amber-400', spin: false };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-slate-400 text-sm">Comprehensive history of all bridge transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-slate-300 text-sm font-medium transition-all">
            <SafeIcon icon={FiDownload} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search by campaign or job ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'generating', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${
                statusFilter === status 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Campaign ID</th>
                <th className="px-6 py-4 font-semibold">Job ID</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-4 bg-slate-800/10 h-16"></td>
                  </tr>
                ))
              ) : filteredLogs.map((log) => {
                const status = getStatusIcon(log.status);
                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-200">{log.campaign_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded">{log.roundups_job_id}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <SafeIcon icon={status.icon} className={`${status.color} ${status.spin ? 'animate-spin' : ''}`} />
                        <span className={`text-xs font-medium capitalize ${status.color}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                          title="Inspect Log"
                        >
                          <SafeIcon icon={FiEye} />
                        </button>
                        {log.article_url && (
                          <a 
                            href={log.article_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                            title="View Result"
                          >
                            <SafeIcon icon={FiExternalLink} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SafeIcon icon={FiIcons.FiInbox} className="text-4xl text-slate-700 mb-2" />
                      <p className="text-sm">No automation jobs found. Start a new campaign to see telemetry here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LogDetailsDrawer 
        log={selectedLog} 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
    </div>
  );
}