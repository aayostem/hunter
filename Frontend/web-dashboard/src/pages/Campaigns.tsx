import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

// Type definitions
type CampaignStatus = 'active' | 'completed' | 'scheduled' | 'draft';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  sent: number;
  opens: number;
  clicks: number;
  openRate: string;
  clickRate: string;
  createdAt: string;
}
interface Column<T> {
  header: string;
  accessor: keyof T;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
}

export function DataTable<T>({ columns, data }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, colIndex) => {
                const value = row[column.accessor];
                return (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    {column.cell 
                      ? column.cell(row)
                      : value !== null && value !== undefined 
                        ? String(value) 
                        : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Campaigns: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<CampaignStatus | 'all'>('all');
  
  const campaigns: Campaign[] = [
    {
      id: '1',
      name: 'Welcome Email Series',
      status: 'active',
      sent: 1234,
      opens: 856,
      clicks: 234,
      openRate: '69.3%',
      clickRate: '18.9%',
      createdAt: '2024-02-10'
    },
    {
      id: '2',
      name: 'Product Launch Announcement',
      status: 'completed',
      sent: 5678,
      opens: 3456,
      clicks: 1234,
      openRate: '60.8%',
      clickRate: '21.7%',
      createdAt: '2024-02-05'
    },
    {
      id: '3',
      name: 'Monthly Newsletter - February',
      status: 'scheduled',
      sent: 0,
      opens: 0,
      clicks: 0,
      openRate: '0%',
      clickRate: '0%',
      createdAt: '2024-02-15'
    },
    {
      id: '4',
      name: 'Customer Feedback Survey',
      status: 'draft',
      sent: 0,
      opens: 0,
      clicks: 0,
      openRate: '0%',
      clickRate: '0%',
      createdAt: '2024-02-12'
    }
  ];

  // Filter campaigns based on selected status
  const filteredCampaigns = selectedStatus === 'all' 
    ? campaigns 
    : campaigns.filter(campaign => campaign.status === selectedStatus);

  // Define columns with proper typing
  const columns = [
    {
      header: 'Campaign',
      accessor: 'name' as keyof Campaign,
      cell: (row: Campaign) => (
        <Link to={`/campaigns/${row.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
          {row.name}
        </Link>
      )
    },
    {
      header: 'Status',
      accessor: 'status' as keyof Campaign,
      cell: (row: Campaign) => <StatusBadge status={row.status} />
    },
    {
      header: 'Sent',
      accessor: 'sent' as keyof Campaign,
      cell: (row: Campaign) => row.sent.toLocaleString()
    },
    {
      header: 'Opens',
      accessor: 'opens' as keyof Campaign,
      cell: (row: Campaign) => row.opens.toLocaleString()
    },
    {
      header: 'Clicks',
      accessor: 'clicks' as keyof Campaign,
      cell: (row: Campaign) => row.clicks.toLocaleString()
    },
    {
      header: 'Open Rate',
      accessor: 'openRate' as keyof Campaign,
    },
    {
      header: 'Click Rate',
      accessor: 'clickRate' as keyof Campaign,
    },
    {
      header: 'Created',
      accessor: 'createdAt' as keyof Campaign,
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Campaign,
      cell: (row: Campaign) => (
        <div className="flex items-center space-x-2">
          <button 
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => handlePlay(row.id)}
            title="Play"
          >
            <Play className="w-4 h-4 text-green-600" />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => handlePause(row.id)}
            title="Pause"
          >
            <Pause className="w-4 h-4 text-yellow-600" />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => handleDuplicate(row.id)}
            title="Duplicate"
          >
            <Copy className="w-4 h-4 text-blue-600" />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => handleEdit(row.id)}
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => handleDelete(row.id)}
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )
    }
  ];

  // Action handlers
  const handlePlay = (id: string) => {
    console.log('Play campaign:', id);
  };

  const handlePause = (id: string) => {
    console.log('Pause campaign:', id);
  };

  const handleDuplicate = (id: string) => {
    console.log('Duplicate campaign:', id);
  };

  const handleEdit = (id: string) => {
    console.log('Edit campaign:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Delete campaign:', id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link
          to="/campaigns/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as CampaignStatus | 'all')}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
          <button className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center space-x-2 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table - Explicitly typed */}
      <DataTable<Campaign> columns={columns} data={filteredCampaigns} />
    </div>
  );
};