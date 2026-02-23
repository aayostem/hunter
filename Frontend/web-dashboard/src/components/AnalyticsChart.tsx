import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush
} from 'recharts';
import { Download, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

// --- Types & Interfaces ---

export type ChartType = 'line' | 'bar' | 'pie';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartSeries {
  dataKey: string;
  name: string;
  color: string;
  type?: 'monotone' | 'linear' | 'step';
}

export interface AnalyticsChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  series?: ChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number | string;
  width?: number | string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showBrush?: boolean;
  showDownload?: boolean;
  showFullscreen?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDataPointClick?: (data: ChartDataPoint) => void;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
}

// Use unknown instead of any for Recharts internal types
type RechartsPayload = unknown;
type RechartsChartState = unknown;

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

// --- Sub-Components ---

// 1. Define the entry shape specifically for the tooltip payload
interface TooltipPayloadEntry {
  name?: string;
  value?: string | number;
  color?: string;
  payload: ChartDataPoint; // This is the original data object from your 'data' prop
  dataKey?: string | number;
}

// 2. Apply the interface to the component props
const CustomTooltip = ({ 
  active, 
  payload 
}: { 
  active?: boolean; 
  payload?: TooltipPayloadEntry[]; 
}) => {
  // Guard clause for safety
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Extract common data from the first entry's payload
  const data = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
      {payload.map((entry, index) => (
        <div key={`${entry.dataKey}-${index}`} className="flex items-center gap-2 text-sm">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }} 
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {typeof entry.value === 'number' 
              ? entry.value.toLocaleString() 
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({ message = 'No data available' }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500">
    <div className="w-16 h-16 mb-4 text-gray-300">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </div>
    <p className="text-sm">{message}</p>
  </div>
);

// --- Main Component ---

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type, data, series, title, subtitle,
  height = 400, width = '100%',
  showLegend = true, showGrid = true, showTooltip = true,
  showBrush = false, showDownload = true, showFullscreen = true,
  isLoading = false, error = null,
  onRefresh, onDataPointClick,
  xAxisLabel, yAxisLabel,
  colors = DEFAULT_COLORS,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const chartSeries = useMemo<ChartSeries[]>(() => {
    if (series) return series;
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'name' && key !== 'value');
    return keys.map((key, index) => ({
      dataKey: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[index % colors.length],
      type: 'monotone' as const,
    }));
  }, [data, series, colors]);

  // Handle chart click - use type assertion to avoid any
  const handleChartClick = useCallback((nextState: RechartsChartState) => {
    // Safely access the payload with type checking
    const state = nextState as { activePayload?: Array<{ payload: ChartDataPoint }> };
    const payload = state.activePayload?.[0]?.payload;
    if (onDataPointClick && payload) {
      onDataPointClick(payload);
    }
  }, [onDataPointClick]);

  // Handle legend click - use type assertion
  const handleLegendClick = useCallback((data: RechartsPayload) => {
    const legendData = data as { dataKey?: string; value?: string; id?: string };
    const key = legendData?.dataKey ?? legendData?.value ?? legendData?.id;
    if (key) {
      const keyStr = String(key);
      setHiddenSeries((prev) => {
        const next = new Set(prev);
        if (next.has(keyStr)) {
          next.delete(keyStr);
        } else {
          next.add(keyStr);
        }
        return next;
      });
    }
  }, []);

  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  const renderLineChart = () => (
    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
      <XAxis 
        dataKey="name" 
        stroke="#6B7280" 
        tick={{ fontSize: 12 }} 
        label={xAxisLabel ? { value: xAxisLabel, position: 'bottom' } : undefined} 
      />
      <YAxis 
        stroke="#6B7280" 
        tick={{ fontSize: 12 }} 
        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'left' } : undefined} 
      />
      {showTooltip && <Tooltip content={<CustomTooltip />} />}
      {showLegend && (
        <Legend 
          onClick={handleLegendClick} 
          wrapperStyle={{ cursor: 'pointer' }} 
        />
      )}
      {showBrush && <Brush dataKey="name" height={30} stroke="#3B82F6" />}
      {chartSeries.map(s => (
        <Line 
          key={s.dataKey} 
          type={s.type} 
          dataKey={s.dataKey} 
          name={s.name} 
          stroke={s.color} 
          strokeWidth={2} 
          hide={hiddenSeries.has(s.dataKey)} 
          dot={{ r: 4 }} 
          activeDot={{ r: 6 }} 
        />
      ))}
    </LineChart>
  );

  const renderBarChart = () => (
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
      <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} />
      <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
      {showTooltip && <Tooltip content={<CustomTooltip />} />}
      {showLegend && (
        <Legend 
          onClick={handleLegendClick} 
          wrapperStyle={{ cursor: 'pointer' }} 
        />
      )}
      {chartSeries.map(s => (
        <Bar 
          key={s.dataKey} 
          dataKey={s.dataKey} 
          name={s.name} 
          fill={s.color} 
          radius={[4, 4, 0, 0]} 
          hide={hiddenSeries.has(s.dataKey)} 
        />
      ))}
    </BarChart>
  );

  const renderPieChart = () => (
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={120}
        label={({ name, percent }: { name?: string; percent?: number }) => {
          const n = name ?? '';
          const p = percent ? (percent * 100).toFixed(0) : '0';
          return `${n}: ${p}%`;
        }}
        onClick={(clickData: unknown) => {
          const payload = (clickData as { payload?: ChartDataPoint })?.payload;
          if (onDataPointClick && payload) {
            onDataPointClick(payload);
          }
        }}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#fff" strokeWidth={2} />
        ))}
      </Pie>
      {showTooltip && <Tooltip content={<CustomTooltip />} />}
      {showLegend && <Legend />}
    </PieChart>
  );

  const renderChart = () => {
    switch (type) {
      case 'line': return renderLineChart();
      case 'bar':  return renderBarChart();
      case 'pie':  return renderPieChart();
      default:     return null;
    }
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}
      style={isFullscreen ? undefined : { height, width }}
    >
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {showDownload && (
            <button onClick={() => alert('Exporting...')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {showFullscreen && (
            <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-600" /> : <Maximize2 className="w-4 h-4 text-gray-600" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading chart data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            {onRefresh && (
              <button onClick={onRefresh} className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                Try Again
              </button>
            )}
          </div>
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart() || <div />}
          </ResponsiveContainer>
        )}
      </div>

      {showLegend && type !== 'pie' && chartSeries.length > 1 && (
        <div className="px-6 py-2 border-t border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
          Click legend items to toggle visibility
        </div>
      )}
    </div>
  );
};