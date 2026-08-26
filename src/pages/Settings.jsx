import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../components/common/SafeIcon';

const { FiKey, FiServer, FiShield, FiBell, FiChevronRight, FiCpu } = FiIcons;

export default function Settings() {
  const envStatus = {
    edgeWorkerUrl: !!import.meta.env.VITE_EDGE_WORKER_URL,
    edgeApiSecret: !!import.meta.env.VITE_EDGE_API_SECRET,
    supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const sections = [
    {
      title: 'API Configuration',
      icon: FiKey,
      items: [
        {
          label: 'Edge Worker API Secret',
          value: envStatus.edgeApiSecret ? '••••••••••••••••' : 'Not Configured',
          status: envStatus.edgeApiSecret ? 'Active' : 'Missing',
          active: envStatus.edgeApiSecret
        },
        {
          label: 'Supabase Anon Key',
          value: envStatus.supabaseKey ? '••••••••••••••••' : 'Not Configured',
          status: envStatus.supabaseKey ? 'Active' : 'Missing',
          active: envStatus.supabaseKey
        }
      ]
    },
    {
      title: 'Infrastructure',
      icon: FiServer,
      items: [
        {
          label: 'Supabase Project URL',
          value: envStatus.supabaseUrl ? 'Configured' : 'Not Configured',
          status: envStatus.supabaseUrl ? 'Healthy' : 'Error',
          active: envStatus.supabaseUrl
        },
        {
          label: 'Edge Worker URL',
          value: envStatus.edgeWorkerUrl ? 'Configured' : 'Not Configured',
          status: envStatus.edgeWorkerUrl ? 'Healthy' : 'Error',
          active: envStatus.edgeWorkerUrl
        }
      ]
    },
    {
      title: 'Workflow Policies',
      icon: FiCpu,
      items: [
        { label: 'Polling Interval', value: '45 Seconds', status: 'Default', active: true },
        { label: 'Max Retry Attempts', value: '10 Attempts', status: 'Native', active: true }
      ]
    }
  ];

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-slate-400">Manage your bridge configuration and infrastructure endpoints.</p>
      </div>

      <div className="grid gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-lg">
                <SafeIcon icon={section.icon} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">{section.title}</h3>
            </div>
            <div className="divide-y divide-slate-800">
              {section.items.map((item, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-slate-300">{item.label}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">{item.value}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                      {item.status}
                    </span>
                    <button className="text-slate-600 hover:text-white transition-colors">
                      <SafeIcon icon={FiChevronRight} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <SafeIcon icon={FiShield} className="text-red-400 text-xl" />
          </div>
          <div>
            <h4 className="text-white font-semibold">Danger Zone</h4>
            <p className="text-slate-400 text-sm">Revoke API access or reset bridge configuration.</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-all">
          Emergency Reset
        </button>
      </div>
    </div>
  );
}