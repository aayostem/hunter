import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type {
  NameType,
  ValueType,
  Payload,
} from 'recharts/types/component/DefaultTooltipContent';
import { Download, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

// Types
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

// Default colors
const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Custom tooltip component with proper types
const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry: Payload<ValueType, NameType>, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {typeof entry.value === 'number' 
              ? entry.value.toLocaleString() 
              : String(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// Empty state
const EmptyState: React.FC<{ message?: string }> = ({ message = 'No data available' }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500">
    <div className="w-16 h-16 mb-4 text-gray-300">
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </div>
    <p className="text-sm">{message}</p>
  </div>
);

// Loading state
const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full">
    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
    <p className="text-sm text-gray-500">Loading chart data...</p>
  </div>
);

// Error state
const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <div className="w-16 h-16 mb-4 text-red-500">
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <p className="text-sm text-red-600 mb-2">{error}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        Try Again
      </button>
    )}
  </div>
);

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type,
  data,
  series,
  title,
  subtitle,
  height = 400,
  width = '100%',
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  showBrush = false,
  showDownload = true,
  showFullscreen = true,
  isLoading = false,
  error = null,
  onRefresh,
  onDataPointClick,
  xAxisLabel,
  yAxisLabel,
  colors = DEFAULT_COLORS,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Generate series if not provided
  const chartSeries = useMemo<ChartSeries[]>(() => {
    if (series) return series;

    // Auto-generate series from data keys
    if (data.length === 0) return [];

    const keys = Object.keys(data[0]).filter(key => key !== 'name');
    return keys.map((key, index) => ({
      dataKey: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[index % colors.length],
      type: 'monotone' as const,
    }));
  }, [data, series, colors]);

  // Toggle series visibility
  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  // Download chart as PNG
  const downloadChart = useCallback(() => {
    // In production, use a library like html2canvas
    alert('Download functionality would use html2canvas in production');
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle click on data point - using proper Recharts event type
  const handleChartClick = useCallback((nextState: any) => {
    // Access the active payload safely
    if (onDataPointClick && nextState?.activePayload?.[0]?.payload) {
      onDataPointClick(nextState.activePayload[0].payload);
    }
  }, [onDataPointClick]);

  // Legend click handler
  const handleLegendClick = useCallback((e: any) => {
    if (e?.dataKey) {
      toggleSeries(e.dataKey);
    }
  }, [toggleSeries]);

  // Filter data based on hidden series
  const visibleData = useMemo<ChartDataPoint[]>(() => {
    if (hiddenSeries.size === 0) return data;
    
    return data.map(point => {
      const filtered = { ...point };
      hiddenSeries.forEach(key => {
        delete filtered[key];
      });
      return filtered;
    });
  }, [data, hiddenSeries]);

  // Render chart based on type
  const renderLineChart = useCallback(() => {
    const commonProps = {
      data: visibleData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 } as const,
      onClick: handleChartClick,
    };

    return (
      <LineChart {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey="name"
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          label={xAxisLabel ? { value: xAxisLabel, position: 'bottom' } : undefined}
        />
        <YAxis
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
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
        {chartSeries.map((s) => (
          <Line
            key={s.dataKey}
            type={s.type}
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 4, fill: s.color }}
            activeDot={{ r: 6 }}
            hide={hiddenSeries.has(s.dataKey)}
          />
        ))}
      </LineChart>
    );
  }, [
    visibleData,
    showGrid,
    xAxisLabel,
    yAxisLabel,
    showTooltip,
    showLegend,
    showBrush,
    chartSeries,
    hiddenSeries,
    handleChartClick,
    handleLegendClick,
  ]);

  const renderBarChart = useCallback(() => {
    const commonProps = {
      data: visibleData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 } as const,
      onClick: handleChartClick,
    };

    return (
      <BarChart {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey="name"
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          label={xAxisLabel ? { value: xAxisLabel, position: 'bottom' } : undefined}
        />
        <YAxis
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'left' } : undefined}
        />
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && (
          <Legend
            onClick={handleLegendClick}
            wrapperStyle={{ cursor: 'pointer' }}
          />
        )}
        {chartSeries.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={s.color}
            radius={[4, 4, 0, 0] as [number, number, number, number]}
            hide={hiddenSeries.has(s.dataKey)}
          />
        ))}
      </BarChart>
    );
  }, [
    visibleData,
    showGrid,
    xAxisLabel,
    yAxisLabel,
    showTooltip,
    showLegend,
    chartSeries,
    hiddenSeries,
    handleChartClick,
    handleLegendClick,
  ]);

  const renderPieChart = useCallback(() => {
    return (
      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }: { name?: string; percent?: number }) => {
            const safeName = name || 'Unknown';
            const safePercent = percent || 0;
            return `${safeName}: ${(safePercent * 100).toFixed(1)}%`;
          }}
          outerRadius={150}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Pie>
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && <Legend />}
      </PieChart>
    );
  }, [data, colors, showTooltip, showLegend, handleChartClick]);

  const renderChart = useCallback(() => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      default:
        return null;
    }
  }, [type, renderLineChart, renderBarChart, renderPieChart]);

  // Handle empty data
  if (!isLoading && !error && data.length === 0) {
    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-200"
        style={{ height, width }}
      >
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={{ height, width }}
    >
      {/* Header */}
      {(title || showDownload || showFullscreen || onRefresh) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {showDownload && (
              <button
                onClick={downloadChart}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download Chart"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {showFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-gray-600" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className="p-6" style={{ height: title ? 'calc(100% - 73px)' : '100%' }}>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={onRefresh} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend Toggle Info */}
      {showLegend && chartSeries.length > 1 && (
        <div className="px-6 py-2 border-t border-gray-200 text-xs text-gray-500">
          Click on legend items to toggle series
        </div>
      )}
    </div>
  );
};