import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format } from 'date-fns';

const { FiX, FiClock, FiActivity, FiExternalLink, FiAlertCircle, FiTerminal, FiCopy, FiCheck } = FiIcons;

export default function LogDetailsDrawer({ log, isOpen, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !log) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div>
            <h3 className="text-lg font-bold text-white">Log Details</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">{log.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <SafeIcon icon={FiX} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 ${
            log.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
            log.status === 'failed' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
            'bg-amber-500/5 border-amber-500/20 text-amber-400'
          }`}>
            <SafeIcon icon={log.status === 'completed' ? FiCheck : log.status === 'failed' ? FiAlertCircle : FiClock} className="text-xl" />
            <div>
              <div className="text-sm font-bold uppercase tracking-wider">{log.status}</div>
              <div className="text-xs opacity-70">Workflow state updated {format(new Date(log.updated_at || log.created_at), 'HH:mm:ss')}</div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Campaign ID</div>
              <div className="text-white font-medium flex items-center justify-between">
                {log.campaign_id}
                <button onClick={() => copyToClipboard(log.campaign_id)} className="text-slate-500 hover:text-white">
                  <SafeIcon icon={copied ? FiCheck : FiCopy} size={14} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Job ID</div>
              <div className="text-white font-mono text-sm">{log.roundups_job_id}</div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <SafeIcon icon={FiActivity} className="text-blue-400" /> Event Timeline
            </h4>
            <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
              <div className="relative">
                <div className="absolute -left-[25px] top-1 w-4 h-4 bg-blue-500 rounded-full border-4 border-slate-900" />
                <div className="text-sm text-slate-200 font-medium">Workflow Initiated</div>
                <div className="text-xs text-slate-500">{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</div>
              </div>
              {log.updated_at && (
                <div className="relative">
                  <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-4 border-slate-900 ${
                    log.status === 'completed' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <div className="text-sm text-slate-200 font-medium">Status Transition: {log.status}</div>
                  <div className="text-xs text-slate-500">{format(new Date(log.updated_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Data Payload */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <SafeIcon icon={FiTerminal} className="text-blue-400" /> Output Data
            </h4>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
              {log.article_url ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">The Roundups.AI generator has completed the article successfully.</div>
                  <a 
                    href={log.article_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all"
                  >
                    <span className="text-sm font-medium">Open Generated Article</span>
                    <SafeIcon icon={FiExternalLink} />
                  </a>
                </div>
              ) : log.error_details ? (
                <pre className="text-xs text-red-400 overflow-x-auto whitespace-pre-wrap font-mono">
                  {log.error_details}
                </pre>
              ) : (
                <div className="text-xs text-slate-500 italic">No output data available yet. Workflow is currently {log.status}.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/20">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}