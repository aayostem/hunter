import React from 'react';
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
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

// Type definitions
interface LineDataPoint {
  name: string;
  sent: number;
  opens: number;
  clicks: number;
}

interface BarDataPoint {
  name: string;
  opens: number;
  clicks: number;
}

interface PieDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface AnalyticsChartProps {
  type: 'line' | 'bar' | 'pie';
  data?: LineDataPoint[] | BarDataPoint[] | PieDataPoint[];
  title?: string;
}

// Default data
const defaultLineData: LineDataPoint[] = [
  { name: 'Jan', sent: 4000, opens: 2400, clicks: 1400 },
  { name: 'Feb', sent: 3000, opens: 1398, clicks: 1200 },
  { name: 'Mar', sent: 2000, opens: 9800, clicks: 2200 },
  { name: 'Apr', sent: 2780, opens: 3908, clicks: 2000 },
  { name: 'May', sent: 1890, opens: 4800, clicks: 1800 },
  { name: 'Jun', sent: 2390, opens: 3800, clicks: 2500 },
];

const defaultBarData: BarDataPoint[] = [
  { name: 'Welcome', opens: 4000, clicks: 2400 },
  { name: 'Newsletter', opens: 3000, clicks: 1398 },
  { name: 'Promo', opens: 2000, clicks: 9800 },
  { name: 'Alert', opens: 2780, clicks: 3908 },
];

const defaultPieData: PieDataPoint[] = [
  { name: 'Opened', value: 68.2, color: '#3B82F6' },
  { name: 'Not Opened', value: 31.8, color: '#9CA3AF' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Custom tooltip style
const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #E5E7EB',
  borderRadius: '0.5rem',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  padding: '8px 12px',
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ 
  type, 
  data, 
  title 
}) => {
  const renderChart = () => {
    switch (type) {
      case 'line': {
        const chartData = (data as LineDataPoint[]) || defaultLineData;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="opens" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="clicks" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case 'bar': {
        const chartData = (data as BarDataPoint[]) || defaultBarData;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="opens" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'pie': {
        const chartData = (data as PieDataPoint[]) || defaultPieData;
        
        // Simple label function
        const renderPieLabel = (props: PieLabelRenderProps) => {
          const name = props.name as string || 'Unknown';
          const percent = props.percent as number || 0;
          const percentage = (percent * 100).toFixed(1);
          return `${name}: ${percentage}%`;
        };

        // Fixed tooltip formatter - simpler approach without complex types
        const tooltipFormatter = (value: number | string | undefined) => {
          const numValue = typeof value === 'number' 
            ? value 
            : typeof value === 'string' 
              ? parseFloat(value) || 0 
              : 0;
          
          return `${numValue.toFixed(1)}%`;
        };

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderPieLabel}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={tooltipFormatter}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <div className="w-full h-64">
        {renderChart()}
      </div>
    </div>
  );
};