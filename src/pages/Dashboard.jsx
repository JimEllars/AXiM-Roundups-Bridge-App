import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../components/common/SafeIcon';
import { supabase } from '../lib/supabase';

import React, { useEffect, useState, Suspense, lazy } from 'react';
import NewCampaignModal from '../components/dashboard/NewCampaignModal';
import LogDetailsDrawer from '../components/logs/LogDetailsDrawer';

const { FiTrendingUp, FiCheckCircle, FiClock, FiAlertCircle, FiPlus, FiWifi, FiRefreshCw } = FiIcons;

const DashboardChart = lazy(() => import('../components/dashboard/DashboardChart'));

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, completed: 0, generating: 0, failed: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();

    // Set up Realtime listener
    const channel = supabase
      .channel('bridge-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'roundups_audit_logs_20240520' 
      }, () => {
        setIsLive(true);
        fetchDashboardData();
        setTimeout(() => setIsLive(false), 3000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Dashboard subscribed to real-time updates');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Dashboard channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roundups_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dashboard data:', error);
      } else if (data) {
        setRecentLogs(data.slice(0, 8));
        const counts = data.reduce((acc, log) => {
          acc.total++;
          if (acc[log.status] !== undefined) {
            acc[log.status]++;
          }
          return acc;
        }, { total: 0, completed: 0, generating: 0, failed: 0 });
        setStats(counts);

        setChartData(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Jobs', value: stats.total, icon: FiTrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Completed', value: stats.completed, icon: FiCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'In Progress', value: stats.generating, icon: FiClock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Failed', value: stats.failed, icon: FiAlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">System Overview</h2>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${
              isLive ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-slate-800 text-slate-500'
            }`}>
              <SafeIcon icon={FiWifi} size={10} /> {isLive ? 'Syncing...' : 'Live'}
            </div>
          </div>
          <p className="text-slate-400 text-sm">Monitor your temporal workflows and API status.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDashboardData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
            title="Refresh Data"
          >
            <SafeIcon icon={FiRefreshCw} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <SafeIcon icon={FiPlus} /> New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm hover:border-slate-700 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 rounded-full ${stat.bg}`} />
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform relative z-10`}>
                <SafeIcon icon={stat.icon} className={stat.color} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10">
              {loading ? <div className="h-9 w-12 bg-slate-800 animate-pulse rounded" /> : stat.value}
            </div>
            <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <Suspense fallback={<div className="h-80 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 animate-pulse">Loading Chart Data...</div>}>
          <DashboardChart rawData={chartData} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <a href="/logs" className="text-sm text-blue-400 hover:text-blue-300 font-medium">View All Logs</a>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 font-bold">Campaign</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Timestamp</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-200">{log.campaign_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === 'failed' ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-colors cursor-pointer"
                          title="View Error Details"
                        >
                          {log.status} <SafeIcon icon={FiIcons.FiExternalLink} size={10} />
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                          log.status === 'completed' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' :
                          log.status === 'generating' || log.status === 'processing' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                          'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                        }`}>
                          {(log.status === 'generating' || log.status === 'processing') && <SafeIcon icon={FiIcons.FiRefreshCw} size={10} className="animate-spin" />}
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.article_url && (
                        <a href={log.article_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <SafeIcon icon={FiIcons.FiExternalLink} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && recentLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
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

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/10 relative overflow-hidden">
            <SafeIcon icon={FiIcons.FiBox} className="absolute -right-4 -bottom-4 text-9xl opacity-10" />
            <h3 className="text-lg font-bold mb-2">Bridge Health</h3>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-80">Sync Latency</span>
                <span className="font-mono">42ms</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-80">Worker Nodes</span>
                <span className="font-mono">3 Active</span>
              </div>
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-full animate-pulse" />
              </div>
              <p className="text-[11px] opacity-70 italic">All systems operational in us-east-1.</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-widest text-slate-500">Quick Configuration</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-sm text-slate-300">Auto-Retry</span>
                <div className="w-8 h-4 bg-blue-600 rounded-full relative">
                  <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-sm text-slate-300">Log Verbosity</span>
                <span className="text-xs font-bold text-blue-400">DEBUG</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchDashboardData}
      />

      <LogDetailsDrawer
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}