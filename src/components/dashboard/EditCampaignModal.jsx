import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const { FiX, FiLink, FiLayers, FiClock } = FiIcons;

export default function EditCampaignModal({ isOpen, onClose, onRefresh, campaign }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    affiliate_url: '',
    keywords: '',
    cron_schedule: ''
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        affiliate_url: campaign.affiliate_url || '',
        keywords: campaign.keywords || '',
        cron_schedule: campaign.cron_schedule || ''
      });
    }
  }, [campaign]);

  if (!isOpen || !campaign) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('affiliate_campaigns')
        .update({
          affiliate_url: formData.affiliate_url,
          keywords: formData.keywords,
          cron_schedule: formData.cron_schedule
        })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      toast.success('Campaign updated successfully');
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Edit Campaign</h3>
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
              <label className="text-sm font-medium text-slate-300">Affiliate URL</label>
              <div className="relative">
                <SafeIcon icon={FiLink} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  placeholder="https://example.com/affiliate"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={formData.affiliate_url}
                  onChange={(e) => setFormData({...formData, affiliate_url: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Keywords</label>
              <div className="relative">
                <SafeIcon icon={FiLayers} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. retail tech, AI sales"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={formData.keywords}
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Cron Schedule</label>
              <div className="relative">
                <SafeIcon icon={FiClock} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="0 0 * * *"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={formData.cron_schedule}
                  onChange={(e) => setFormData({...formData, cron_schedule: e.target.value})}
                />
              </div>
            </div>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
