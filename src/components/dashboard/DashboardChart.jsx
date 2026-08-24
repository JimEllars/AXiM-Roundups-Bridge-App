import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format, subDays, startOfDay, isAfter } from 'date-fns';

const DashboardChart = ({ rawData }) => {
  const [filter, setFilter] = useState('7'); // '7', '14', '30', 'all'

  const chartData = useMemo(() => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return [];

    let days = 7;
    if (filter === '14') days = 14;
    if (filter === '30') days = 30;

    const chartAgg = {};

    if (filter === 'all') {
        // Find oldest date in data, or default to 30 days if empty
        let oldestDate = startOfDay(new Date());
        rawData.forEach(log => {
            const logDate = startOfDay(new Date(log.created_at));
            if (logDate < oldestDate) oldestDate = logDate;
        });

        // Ensure at least 7 days are shown even for all time
        const minDate = startOfDay(subDays(new Date(), 7));
        if (oldestDate > minDate) oldestDate = minDate;

        // Calculate days difference
        const now = startOfDay(new Date());
        const diffTime = Math.abs(now - oldestDate);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today
    }

    // Initialize all days in range to 0
    const cutoffDate = startOfDay(subDays(new Date(), days > 0 ? days - 1 : 0));

    for (let i = (days > 0 ? days - 1 : 0); i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const dateStr = format(d, 'MMM dd');
      chartAgg[dateStr] = { date: dateStr, completed: 0, failed: 0 };
    }

    rawData.forEach(log => {
      const logDate = new Date(log.created_at);
      if (isAfter(logDate, cutoffDate) || logDate.getTime() === cutoffDate.getTime()) {
         const dateStr = format(logDate, 'MMM dd');
         if (chartAgg[dateStr]) {
            if (log.status === 'completed') chartAgg[dateStr].completed++;
            if (log.status === 'failed') chartAgg[dateStr].failed++;
         }
      }
    });

    return Object.values(chartAgg);
  }, [rawData, filter]);

  if (!rawData || rawData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <SafeIcon icon={FiIcons.FiBarChart2} className="text-4xl text-slate-700 mb-3" />
        <p className="text-sm font-medium text-slate-400">Insufficient Data</p>
        <p className="text-xs text-slate-500 mt-1">Run more campaigns to generate trend telemetry.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-96">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-white">Campaign Trends</h3>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setFilter('7')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === '7' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              7D
            </button>
            <button
              onClick={() => setFilter('14')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === '14' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              14D
            </button>
            <button
              onClick={() => setFilter('30')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === '30' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              30D
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              All Time
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium border-l border-slate-800 pl-4 hidden sm:flex">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-slate-400">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-slate-400">Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Legend */}
      <div className="flex items-center gap-4 text-xs font-medium mb-4 sm:hidden">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-slate-400">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-slate-400">Failed</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCompleted)"
              name="Completed"
              isAnimationActive={true}
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFailed)"
              name="Failed"
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardChart;
