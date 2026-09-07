import React, { useState, useRef, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMoreVertical, FiEdit2, FiPauseCircle, FiPlayCircle, FiTrash2 } = FiIcons;

export default function CampaignActionMenu({ campaign, onEdit, onToggleStatus, onDelete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (action) => {
    setIsOpen(false);
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  const isPaused = campaign.campaign_status === 'paused';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isProcessing}
        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
      >
        {isProcessing ? <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div> : <SafeIcon icon={FiMoreVertical} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            <button
              onClick={() => handleAction(onEdit)}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
            >
              <SafeIcon icon={FiEdit2} className="text-slate-400" /> Edit Campaign
            </button>
            <button
              onClick={() => handleAction(onToggleStatus)}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
            >
              {isPaused ? (
                <><SafeIcon icon={FiPlayCircle} className="text-emerald-400" /> Resume</>
              ) : (
                <><SafeIcon icon={FiPauseCircle} className="text-amber-400" /> Pause</>
              )}
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => handleAction(onDelete)}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
            >
              <SafeIcon icon={FiTrash2} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
