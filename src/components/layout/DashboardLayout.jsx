import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { supabase } from '../../lib/supabase';

const { FiLayout, FiActivity, FiSettings, FiLogOut, FiBox } = FiIcons;

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Overview', path: '/', icon: FiLayout },
    { name: 'Audit Logs', path: '/logs', icon: FiActivity },
    { name: 'Settings', path: '/settings', icon: FiSettings },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex">
       {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <SafeIcon icon={FiBox} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              AXiM Systems
            </span>
            <span className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-semibold mt-0.5">
              Data Infrastructure
            </span>
          </div>
          </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                  : 'hover:bg-slate-800/50 text-slate-400'
              }`}
            >
              <SafeIcon icon={item.icon} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200"
          >
            <SafeIcon icon={FiLogOut} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-white">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600"></div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}