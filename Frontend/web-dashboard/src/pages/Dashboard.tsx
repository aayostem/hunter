import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, MousePointer, AlertCircle, Eye, ArrowUp, ArrowDown, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCompactNumber, formatPercentage } from '../utils/formatters';

interface DashboardStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  activeContacts: number;
  bounceRate: number;
  unsubscribeRate: number;
  previousPeriod: Omit<DashboardStats, 'previousPeriod'>;
}

interface ApiError { response?: { data?: { message?: string } } }

const TIME_RANGES = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
] as const;

type RangeValue = typeof TIME_RANGES[number]['value'];

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [range, setRange] = useState<RangeValue>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const dates = useMemo(() => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date();
    start.setDate(start.getDate() - (TIME_RANGES.find(r => r.value === range)?.days || 30));
    return { start: start.toISOString().split('T')[0], end };
  }, [range]);

  const loadData = useCallback(async (refresh = false) => {
    if (!user || !token) return;
    if (refresh) setIsRefreshing(true);
    try {
      const res = await api.get<DashboardStats>('/dashboard/stats', { params: dates });
      setStats(res.data);
    } catch (err) {
      const error = err as ApiError;
      showToast(error.response?.data?.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, token, dates, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const cards = useMemo(() => {
    if (!stats) return [];
    const trend = (curr: number, prev: number) => {
      const pct = prev === 0 ? 100 : ((curr - prev) / prev) * 100;
      return { val: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, up: pct >= 0 };
    };

    return [
      { id: 'sent', title: 'Total Sent', val: formatCompactNumber(stats.totalSent), trend: trend(stats.totalSent, stats.previousPeriod.totalSent), icon: Mail, color: 'bg-blue-500' },
      { id: 'open', title: 'Open Rate', val: formatPercentage(stats.openRate), trend: trend(stats.openRate, stats.previousPeriod.openRate), icon: Eye, color: 'bg-green-500' },
      { id: 'click', title: 'Click Rate', val: formatPercentage(stats.clickRate), trend: trend(stats.clickRate, stats.previousPeriod.clickRate), icon: MousePointer, color: 'bg-purple-500' },
      { id: 'bounce', title: 'Bounce', val: formatPercentage(stats.bounceRate), trend: trend(stats.bounceRate, stats.previousPeriod.bounceRate), icon: AlertCircle, color: 'bg-red-500' },
    ] as const;
  }, [stats]);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value as RangeValue)} 
            className="border rounded p-2 text-sm"
          >
            {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button onClick={() => loadData(true)} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50" disabled={isRefreshing}>
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between">
              <div className={`${c.color} p-2 rounded-lg text-white`}><c.icon size={20} /></div>
              <span className={`text-xs flex items-center ${c.trend.up ? 'text-green-600' : 'text-red-600'}`}>
                {c.trend.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {c.trend.val}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-3">{c.title}</p>
            <p className="text-2xl font-bold">{c.val}</p>
          </div>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
        <FileText size={20} /> <span className="font-semibold">Browse Templates</span>
      </button>
    </div>
  );
};