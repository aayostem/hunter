import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Archive
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Simple toast implementation (since useToast might not exist)
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // In production, use a proper toast library
  alert(message);
};

// Simple debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Type definitions
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'active' | 'paused' | 'completed' | 'failed' | 'archived';
export type CampaignType = 'regular' | 'automated' | 'test' | 'triggered';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  type: CampaignType;
  sent: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  createdAt: string;
  scheduledFor: string | null;
  sentAt: string | null;
  listName: string;
  listSize: number;
  tags: string[];
}

export interface CampaignFilters {
  status?: CampaignStatus[];
  type?: CampaignType[];
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  page: number;
  limit: number;
  sortBy: keyof Campaign;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// DataTable Component (inline since it's not imported)
interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (limit: number) => void;
  };
  sorting?: {
    sortBy: string | null;
    sortDirection: 'asc' | 'desc' | null;
    onSort: (columnId: string) => void;
  };
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

interface ApiResponse<T> {
  data: T;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiOptions {
  params?: Record<string, unknown>;
  responseType?: string;
}

interface PostResponse {
  id: string;
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  error = null,
  pagination,
  sorting,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" text="Loading campaigns..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 mb-4 text-gray-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:text-gray-700' : ''
                } ${column.className || ''}`}
                onClick={() => column.sortable && sorting?.onSort(column.id)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {sorting?.sortBy === column.id && (
                    <span className="text-gray-400">
                      {sorting.sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row, index)}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {columns.map((column) => (
                <td key={`${keyExtractor(row, index)}-${column.id}`} className="px-6 py-4 whitespace-nowrap">
                  {column.cell
                    ? column.cell(row)
                    : typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : String(row[column.accessor] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-600">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems}
            </p>
            {pagination.onItemsPerPageChange && (
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => pagination.onItemsPerPageChange?.(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple API mock
const api = {
  get: async <T,>(url: string, options?: ApiOptions): Promise<ApiResponse<T>> => {
    console.debug(`GET request to ${url}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock data
    const mockCampaigns: Campaign[] = [
      {
        id: '1',
        name: 'Welcome Series',
        subject: 'Welcome to our community!',
        status: 'active',
        type: 'automated',
        sent: 12345,
        opens: 8567,
        uniqueOpens: 7234,
        clicks: 2345,
        uniqueClicks: 1890,
        openRate: 69.3,
        clickRate: 18.9,
        bounceRate: 1.2,
        unsubscribeRate: 0.4,
        createdAt: new Date().toISOString(),
        scheduledFor: null,
        sentAt: new Date().toISOString(),
        listName: 'All Contacts',
        listSize: 12345,
        tags: ['welcome', 'automated'],
      },
      {
        id: '2',
        name: 'Product Launch',
        subject: 'Introducing our new feature',
        status: 'scheduled',
        type: 'regular',
        sent: 0,
        opens: 0,
        uniqueOpens: 0,
        clicks: 0,
        uniqueClicks: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        createdAt: new Date().toISOString(),
        scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        sentAt: null,
        listName: 'Customers',
        listSize: 5678,
        tags: ['launch'],
      },
      {
        id: '3',
        name: 'Monthly Newsletter',
        subject: 'February Updates',
        status: 'completed',
        type: 'regular',
        sent: 8765,
        opens: 5432,
        uniqueOpens: 4321,
        clicks: 1234,
        uniqueClicks: 987,
        openRate: 62.0,
        clickRate: 22.7,
        bounceRate: 2.1,
        unsubscribeRate: 0.3,
        createdAt: new Date().toISOString(),
        scheduledFor: null,
        sentAt: new Date().toISOString(),
        listName: 'Newsletter',
        listSize: 8765,
        tags: ['newsletter'],
      },
    ];

    const page = (options?.params?.page as number) || 1;
    const limit = (options?.params?.limit as number) || 10;

    const paginatedData: PaginatedData<Campaign> = {
      data: mockCampaigns,
      total: mockCampaigns.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(mockCampaigns.length / limit),
    };

    return {
      data: paginatedData as T,
    };
  },
  
  post: async <T = PostResponse>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    console.debug(`POST request to ${url}`, data);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      data: { id: 'new-id' } as T 
    };
  },
  
  delete: async (url: string): Promise<ApiResponse<Record<string, never>>> => {
    console.debug(`DELETE request to ${url}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: {} };
  },
};

// Format helpers
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Main Campaigns Component
export const Campaigns: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [selectedStatuses, setSelectedStatuses] = useState<CampaignStatus[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  
  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Action states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Update filters when search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined, page: 1 }));
  }, [debouncedSearch]);

  // Update filters when statuses change
  useEffect(() => {
    setFilters(prev => ({ ...prev, status: selectedStatuses.length > 0 ? selectedStatuses : undefined, page: 1 }));
  }, [selectedStatuses]);

  // Update filters when date range changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, dateRange: dateRange || undefined, page: 1 }));
  }, [dateRange]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fix: Convert filters to Record<string, unknown>
      const params: Record<string, unknown> = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.status && filters.status.length > 0) {
        params.status = filters.status;
      }

      if (filters.dateRange) {
        params.dateRange = filters.dateRange;
      }

      const response = await api.get<PaginatedResponse<Campaign>>('/campaigns', {
        params,
      });

      setCampaigns(response.data.data);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCampaigns();
    setIsRefreshing(false);
    showToast('Campaigns updated', 'success');
  }, [fetchCampaigns]);

  // Handle play campaign
  const handlePlay = useCallback(async (id: string) => {
    try {
      setActionInProgress(id);
      await api.post(`/campaigns/${id}/send`);
      showToast('Campaign started', 'success');
      await fetchCampaigns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start campaign';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchCampaigns]);

  // Handle pause campaign
  const handlePause = useCallback(async (id: string) => {
    try {
      setActionInProgress(id);
      await api.post(`/campaigns/${id}/pause`);
      showToast('Campaign paused', 'success');
      await fetchCampaigns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause campaign';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchCampaigns]);

  // Handle resume campaign
  const handleResume = useCallback(async (id: string) => {
    try {
      setActionInProgress(id);
      await api.post(`/campaigns/${id}/resume`);
      showToast('Campaign resumed', 'success');
      await fetchCampaigns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume campaign';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchCampaigns]);

  // Handle duplicate campaign
  const handleDuplicate = useCallback(async (id: string) => {
    try {
      setActionInProgress(id);
      const response = await api.post(`/campaigns/${id}/duplicate`);
      showToast('Campaign duplicated', 'success');
      navigate(`/campaigns/${response.data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate campaign';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [navigate]);

  // Handle edit campaign
  const handleEdit = useCallback((id: string) => {
    navigate(`/campaigns/${id}/edit`);
  }, [navigate]);

  // Handle delete campaign
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(id);
      await api.delete(`/campaigns/${id}`);
      showToast('Campaign deleted', 'success');
      await fetchCampaigns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete campaign';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchCampaigns]);

  // Handle archive campaign
  const handleArchive = useCallback(async (id: string) => {
    try {
      setActionInProgress(id);
      await api.post(`/campaigns/${id}/archive`);
      showToast('Campaign archived', 'success');
      await fetchCampaigns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive campaign';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchCampaigns]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      showToast('Campaigns exported', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export campaigns';
      showToast(message, 'error');
    }
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setDateRange(null);
    setFilters(prev => ({
      ...prev,
      search: undefined,
      status: undefined,
      dateRange: undefined,
      page: 1,
    }));
  }, []);

  // Get status icon
  const getStatusIcon = (status: CampaignStatus): JSX.Element | null => {
    switch (status) {
      case 'active':
      case 'sending':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'draft':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'archived':
        return <Archive className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // Columns definition
  const columns: Column<Campaign>[] = [
    {
      id: 'name',
      header: 'Campaign',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center space-x-3">
          {getStatusIcon(row.status)}
          <div>
            <Link
              to={`/campaigns/${row.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium block"
              onClick={(e) => e.stopPropagation()}
            >
              {row.name}
            </Link>
            <p className="text-xs text-gray-500 mt-1">{row.subject}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} type="campaign" size="sm" />,
      sortable: true,
    },
    {
      id: 'sent',
      header: 'Sent',
      accessor: 'sent',
      cell: (row) => (
        <div>
          <p className="font-medium">{formatNumber(row.sent)}</p>
          {row.listSize > 0 && (
            <p className="text-xs text-gray-500">of {formatNumber(row.listSize)}</p>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'opens',
      header: 'Opens',
      accessor: 'opens',
      cell: (row) => (
        <div>
          <p className="font-medium">{formatNumber(row.uniqueOpens)}</p>
          <p className="text-xs text-gray-500">{formatPercentage(row.openRate)}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'clicks',
      header: 'Clicks',
      accessor: 'clicks',
      cell: (row) => (
        <div>
          <p className="font-medium">{formatNumber(row.uniqueClicks)}</p>
          <p className="text-xs text-gray-500">{formatPercentage(row.clickRate)}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'list',
      header: 'List',
      accessor: (row) => row.listName,
      cell: (row) => (
        <div>
          <p className="text-sm">{row.listName}</p>
          <p className="text-xs text-gray-500">{formatNumber(row.listSize)} contacts</p>
        </div>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      accessor: 'createdAt',
      cell: (row) => (
        <div>
          <p className="text-sm">{format(parseISO(row.createdAt), 'MMM d, yyyy')}</p>
          {row.scheduledFor && (
            <p className="text-xs text-blue-500">
              Scheduled: {format(parseISO(row.scheduledFor), 'MMM d, h:mm a')}
            </p>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'tags',
      header: 'Tags',
      accessor: 'tags',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
          {(row.tags?.length || 0) > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              +{(row.tags?.length || 0) - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {row.status === 'draft' && (
            <button
              onClick={() => handlePlay(row.id)}
              disabled={actionInProgress === row.id}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Send"
            >
              <Play className="w-4 h-4 text-green-600" />
            </button>
          )}
          {row.status === 'scheduled' && (
            <button
              onClick={() => handlePlay(row.id)}
              disabled={actionInProgress === row.id}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Send Now"
            >
              <Play className="w-4 h-4 text-green-600" />
            </button>
          )}
          {(row.status === 'active' || row.status === 'sending') && (
            <button
              onClick={() => handlePause(row.id)}
              disabled={actionInProgress === row.id}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Pause"
            >
              <Pause className="w-4 h-4 text-yellow-600" />
            </button>
          )}
          {row.status === 'paused' && (
            <button
              onClick={() => handleResume(row.id)}
              disabled={actionInProgress === row.id}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Resume"
            >
              <Play className="w-4 h-4 text-green-600" />
            </button>
          )}
          <button
            onClick={() => handleDuplicate(row.id)}
            disabled={actionInProgress === row.id}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Duplicate"
          >
            <Copy className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={() => handleEdit(row.id)}
            disabled={actionInProgress === row.id}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => handleArchive(row.id)}
            disabled={actionInProgress === row.id}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Archive"
          >
            <Archive className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={actionInProgress === row.id}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and monitor your email campaigns
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Export"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          <Link
            to="/campaigns/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search campaigns by name or subject..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg text-sm flex items-center space-x-2 ${
                showFilters || selectedStatuses.length > 0 || dateRange
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(selectedStatuses.length > 0 || dateRange) && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                  {selectedStatuses.length + (dateRange ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    multiple
                    value={selectedStatuses}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value as CampaignStatus);
                      setSelectedStatuses(values);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="sending">Sending</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dateRange?.start || ''}
                      onChange={(e) => setDateRange(prev => ({
                        start: e.target.value,
                        end: prev?.end || '',
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={dateRange?.end || ''}
                      onChange={(e) => setDateRange(prev => ({
                        start: prev?.start || '',
                        end: e.target.value,
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="End date"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear all filters</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable
          columns={columns}
          data={campaigns}
          keyExtractor={(campaign) => campaign.id}
          loading={loading}
          error={error}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            itemsPerPage: pagination.limit,
            onPageChange: (page) => setFilters(prev => ({ ...prev, page })),
            onItemsPerPageChange: (limit) => setFilters(prev => ({ ...prev, limit, page: 1 })),
          }}
          sorting={{
            sortBy: filters.sortBy,
            sortDirection: filters.sortOrder,
            onSort: (columnId) => {
              setFilters(prev => ({
                ...prev,
                sortBy: columnId as keyof Campaign,
                sortOrder: prev.sortBy === columnId && prev.sortOrder === 'asc' ? 'desc' : 'asc',
              }));
            },
          }}
          onRowClick={(row) => navigate(`/campaigns/${row.id}`)}
          emptyMessage="No campaigns found. Create your first campaign to get started!"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Active Campaigns</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaigns.filter(c => c.status === 'active' || c.status === 'sending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaigns.filter(c => c.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaigns.filter(c => c.status === 'completed').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;