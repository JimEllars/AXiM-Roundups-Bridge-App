import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiInfo, FiLayers } = FiIcons;

export default function NewCampaignModal({ isOpen, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    campaign_id: '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const workerUrl = import.meta.env.VITE_EDGE_WORKER_URL;
    const apiSecret = import.meta.env.VITE_EDGE_API_SECRET;

    if (!workerUrl || !apiSecret) {
      console.warn("Missing VITE_EDGE_WORKER_URL or VITE_EDGE_API_SECRET environment variables.");
    }

    try {
      const response = await fetch(`${workerUrl || ''}/api/v1/roundups/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSecret || ''}`
        },
        body: JSON.stringify({ campaign_id: formData.campaign_id })
      });

      if (!response.ok) {
        throw new Error(`Failed to start campaign: ${response.status} ${response.statusText}`);
      }
      
      onRefresh();
      onClose();
      setFormData({ campaign_id: '', notes: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Start New Campaign</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <SafeIcon icon={FiX} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Internal Campaign ID</label>
              <div className="relative">
                <SafeIcon icon={FiLayers} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Q2-RETAIL-001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({...formData, campaign_id: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <SafeIcon icon={FiInfo} className="text-blue-400 mt-1 flex-shrink-0" />
            <p className="text-sm text-slate-400">
              The bridge will automatically initiate a Temporal workflow to poll Roundups.AI and sync the result back to your database.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Launch Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
