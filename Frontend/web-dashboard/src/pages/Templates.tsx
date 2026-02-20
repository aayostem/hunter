import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  Search,
  Grid,
  List,
  Loader,
  AlertCircle,
  X,
  Download,
  Star,
  Clock,
  Users,
  Mail,
  FileText,
  Code,
  Lock,
  Unlock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Award,
  MessageCircle,
  FolderOpen,
  FolderPlus,
  ClipboardList,
  Megaphone,
  ShoppingCart,
  UserPlus,
  Gift,
  ShoppingBag,
  Package,
  Bell,
  Receipt,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

import { api } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative, formatDateTime } from '../utils/date';
import { trackEvent } from '../utils/analytics';
import { logError } from '../utils/logging';

// Types
export type TemplateCategory = 
  | 'onboarding'
  | 'newsletter'
  | 'marketing'
  | 'transactional'
  | 'promotional'
  | 'announcement'
  | 'abandoned-cart'
  | 'welcome'
  | 'birthday'
  | 'anniversary'
  | 'reengagement'
  | 'survey'
  | 'feedback'
  | 'notification'
  | 'alert'
  | 'invoice'
  | 'receipt'
  | 'shipping'
  | 'order'
  | 'custom';

export type TemplateStatus = 'active' | 'draft' | 'archived';
export type TemplateType = 'html' | 'plain' | 'amp';
export type TemplateLayout = 'single-column' | 'two-column' | 'sidebar' | 'full-width';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface TemplateStats {
  usageCount: number;
  lastUsed: string | null;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  avgTimeToOpen: number | null;
}

export interface TemplateUser {
  id: string;
  name: string;
  email: string;
}

export interface TemplateVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  comment: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  category: TemplateCategory;
  status: TemplateStatus;
  type: TemplateType;
  layout: TemplateLayout;
  content: string;
  plainContent: string | null;
  ampContent: string | null;
  thumbnail: string | null;
  preview: string | null;
  tags: string[];
  variables: TemplateVariable[];
  stats: TemplateStats;
  createdBy: TemplateUser;
  team: {
    id: string;
    name: string;
  } | null;
  isPublic: boolean;
  isLocked: boolean;
  version: number;
  versions: TemplateVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCategoryInfo {
  id: TemplateCategory;
  name: string;
  icon: React.FC<{ className?: string }>;
  count: number;
}

export interface TemplateFilters {
  search?: string;
  categories?: TemplateCategory[];
  status?: TemplateStatus[];
  types?: TemplateType[];
  tags?: string[];
  isPublic?: boolean;
  isLocked?: boolean;
  createdBy?: string;
  team?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy: keyof Template;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TemplateFolder {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  path: string;
  templates: number;
  subfolders: number;
  createdAt: string;
  updatedAt: string;
}

// Toast hook
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message, duration };
    
    setToasts((prev: Toast[]) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev: Toast[]) => prev.filter((t: Toast) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev: Toast[]) => prev.filter((t: Toast) => t.id !== id));
  }, []);

  return { toasts, showToast, hideToast };
};

// Toast Container Component
const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  const toastIcons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
  };

  const toastColors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast: Toast) => {
        const Icon = toastIcons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-4 rounded-lg border shadow-lg max-w-md animate-slide-in ${toastColors[toast.type]}`}
          >
            <div className="flex items-center space-x-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => onClose(toast.id)}
              className="ml-4 flex-shrink-0 hover:opacity-75"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// Category configuration
const CATEGORIES: TemplateCategoryInfo[] = [
  { id: 'onboarding', name: 'Onboarding', icon: Users, count: 0 },
  { id: 'newsletter', name: 'Newsletter', icon: Mail, count: 0 },
  { id: 'marketing', name: 'Marketing', icon: TrendingUp, count: 0 },
  { id: 'transactional', name: 'Transactional', icon: FileText, count: 0 },
  { id: 'promotional', name: 'Promotional', icon: Sparkles, count: 0 },
  { id: 'announcement', name: 'Announcement', icon: Megaphone, count: 0 },
  { id: 'abandoned-cart', name: 'Abandoned Cart', icon: ShoppingCart, count: 0 },
  { id: 'welcome', name: 'Welcome', icon: UserPlus, count: 0 },
  { id: 'birthday', name: 'Birthday', icon: Gift, count: 0 },
  { id: 'anniversary', name: 'Anniversary', icon: Award, count: 0 },
  { id: 'reengagement', name: 'Re-engagement', icon: RefreshCw, count: 0 },
  { id: 'survey', name: 'Survey', icon: ClipboardList, count: 0 },
  { id: 'feedback', name: 'Feedback', icon: MessageCircle, count: 0 },
  { id: 'notification', name: 'Notification', icon: Bell, count: 0 },
  { id: 'alert', name: 'Alert', icon: AlertCircle, count: 0 },
  { id: 'invoice', name: 'Invoice', icon: FileText, count: 0 },
  { id: 'receipt', name: 'Receipt', icon: Receipt, count: 0 },
  { id: 'shipping', name: 'Shipping', icon: Package, count: 0 },
  { id: 'order', name: 'Order', icon: ShoppingBag, count: 0 },
  { id: 'custom', name: 'Custom', icon: Code, count: 0 },
];

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, hideToast } = useToast();

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Data state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [folders, setFolders] = useState<TemplateFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [filters, setFilters] = useState<TemplateFilters>({
    page: 1,
    limit: 12,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TemplateCategory[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TemplateStatus[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TemplateType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  });

  // Action states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev: TemplateFilters) => ({ ...prev, search: searchTerm || undefined, page: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update filters when selections change
  useEffect(() => {
    setFilters((prev: TemplateFilters) => ({
      ...prev,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      dateRange: dateRange || undefined,
      page: 1,
    }));
  }, [selectedCategories, selectedStatuses, selectedTypes, selectedTags, dateRange]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<PaginatedResponse<Template>>('/templates', {
        params: {
          ...filters,
          folderId: selectedFolder,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        },
      });

      setTemplates(response.data.data);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
      });

      // Update category counts
      const counts = response.data.data.reduce<Record<TemplateCategory, number>>((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
      }, {} as Record<TemplateCategory, number>);

      CATEGORIES.forEach((cat: TemplateCategoryInfo) => {
        cat.count = counts[cat.id] || 0;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
      showToast(message, 'error');
      logError('Templates fetch error', err as Error); // Casting fix
    } finally {
      setLoading(false);
    }
  }, [filters, selectedFolder, selectedCategory, showToast]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const response = await api.get<TemplateFolder[]>('/templates/folders');
      setFolders(response.data);
    } catch (err) {
      logError('Folders fetch error', err as Error); // Casting fix
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchTemplates(), fetchFolders()]);
  }, [fetchTemplates, fetchFolders]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTemplates(), fetchFolders()]);
    setIsRefreshing(false);
    showToast('Templates updated', 'success');
  }, [fetchTemplates, fetchFolders, showToast]);

  // Handle create template
  const handleCreateTemplate = useCallback(() => {
    navigate('/templates/create');
    trackEvent('template_create_started');
  }, [navigate]);

  // Handle edit template
  const handleEditTemplate = useCallback((id: string) => {
    navigate(`/templates/${id}/edit`);
    trackEvent('template_edit_started', { templateId: id });
  }, [navigate]);

  // Handle preview template
  const handlePreviewTemplate = useCallback((template: Template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
    trackEvent('template_previewed', { templateId: template.id });
  }, []);

  // Handle duplicate template
  const handleDuplicateTemplate = useCallback(async (id: string) => {
    try {
      setDuplicating(id);
      const response = await api.post<{ id: string }>(`/templates/${id}/duplicate`);
      showToast('Template duplicated successfully', 'success');
      trackEvent('template_duplicated', { templateId: id, newId: response.data.id });
      fetchTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate template';
      showToast(message, 'error');
      logError('Template duplicate error', err as Error); // Casting fix
    } finally {
      setDuplicating(null);
    }
  }, [fetchTemplates, showToast]);

  // Handle delete template
  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(id);
      await api.delete(`/templates/${id}`);
      showToast('Template deleted successfully', 'success');
      trackEvent('template_deleted', { templateId: id });
      fetchTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      showToast(message, 'error');
      logError('Template delete error', err as Error); // Casting fix
    } finally {
      setDeleting(null);
    }
  }, [fetchTemplates, showToast]);

  // Handle export template
  const handleExportTemplate = useCallback(async (id: string) => {
    try {
      const response = await api.get<Blob>(`/templates/${id}/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template-${id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('Template exported', 'success');
      trackEvent('template_exported', { templateId: id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export template';
      showToast(message, 'error');
      logError('Template export error', err as Error); // Casting fix
    }
  }, [showToast]);

  // Handle toggle lock
  const handleToggleLock = useCallback(async (id: string, isLocked: boolean) => {
    try {
      setActionInProgress(id);
      await api.post(`/templates/${id}/lock`, { lock: !isLocked });
      showToast(isLocked ? 'Template unlocked' : 'Template locked', 'success');
      trackEvent('template_lock_toggled', { templateId: id, locked: !isLocked });
      fetchTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update lock';
      showToast(message, 'error');
    } finally {
      setActionInProgress(null);
    }
  }, [fetchTemplates, showToast]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedTags([]);
    setDateRange(null);
    setSelectedCategory('all');
    setSelectedFolder(null);
    setFilters((prev: TemplateFilters) => ({
      ...prev,
      search: undefined,
      categories: undefined,
      status: undefined,
      types: undefined,
      tags: undefined,
      dateRange: undefined,
      page: 1,
    }));
  }, []);

  // Get category icon
  const getCategoryIcon = (category: TemplateCategory) => {
    const cat = CATEGORIES.find((c: TemplateCategoryInfo) => c.id === category);
    return cat?.icon || FileText;
  };

  // Get status badge
  const getStatusBadge = (status: TemplateStatus) => {
    return <StatusBadge status={status} type="campaign" size="sm" />;
  };

  // Loading skeletons
  if (loading && !isRefreshing) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-12 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i: number) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="h-40 bg-gray-200 rounded-lg mb-4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load templates</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage your email templates
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

            {/* View toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleCreateTemplate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  placeholder="Search templates by name, subject, or tags..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg text-sm flex items-center space-x-2 ${
                  showFilters || selectedCategories.length > 0 || selectedStatuses.length > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {(selectedCategories.length > 0 || selectedStatuses.length > 0 || selectedTypes.length > 0) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                    {selectedCategories.length + selectedStatuses.length + selectedTypes.length}
                  </span>
                )}
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories
                    </label>
                    <select
                      multiple
                      value={selectedCategories}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as TemplateCategory);
                        setSelectedCategories(values);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32"
                    >
                      {CATEGORIES.map((cat: TemplateCategoryInfo) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      multiple
                      value={selectedStatuses}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as TemplateStatus);
                        setSelectedStatuses(values);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {/* Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Type
                    </label>
                    <select
                      multiple
                      value={selectedTypes}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as TemplateType);
                        setSelectedTypes(values);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
                    >
                      <option value="html">HTML</option>
                      <option value="plain">Plain Text</option>
                      <option value="amp">AMP</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={dateRange?.start || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange((prev: { start: string; end: string } | null) => ({
                          start: e.target.value,
                          end: prev?.end || '',
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Start date"
                      />
                      <input
                        type="date"
                        value={dateRange?.end || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange((prev: { start: string; end: string } | null) => ({
                          start: prev?.start || '',
                          end: e.target.value,
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="End date"
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="md:col-span-4 flex justify-end">
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

          {/* Category Pills */}
          <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Templates
            </button>
            {CATEGORIES.map((cat: TemplateCategoryInfo) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <cat.icon className="w-3 h-3" />
                <span>{cat.name}</span>
                <span className={`text-xs px-1.5 rounded-full ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Folders */}
          {folders.length > 0 && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Folders</h3>
                <button className="text-xs text-blue-600 hover:text-blue-700">
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {folders.map((folder: TemplateFolder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center space-x-1 ${
                      selectedFolder === folder.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>{folder.name}</span>
                    <span className="text-xs opacity-75">{folder.templates}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Templates Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template: Template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              const isFavorite = false; // TODO: Add favorite functionality
              const isActionInProgress = actionInProgress === template.id || duplicating === template.id || deleting === template.id;

              return (
                <div
                  key={template.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all ${
                    isActionInProgress ? 'opacity-50' : ''
                  }`}
                >
                  {/* Preview/Thumbnail */}
                  <div
                    className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 relative cursor-pointer group"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CategoryIcon className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    {template.isLocked && (
                      <div className="absolute top-2 left-2">
                        <Lock className="w-4 h-4 text-white bg-black bg-opacity-30 rounded-full p-0.5" />
                      </div>
                    )}
                    {isFavorite && (
                      <div className="absolute top-2 right-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {template.description || 'No description'}
                        </p>
                      </div>
                      {getStatusBadge(template.status)}
                    </div>

                    {/* Tags */}
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags.slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                            +{template.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{template.stats.usageCount} uses</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelative(template.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handlePreviewTemplate(template)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditTemplate(template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="Edit"
                          disabled={isActionInProgress}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="Duplicate"
                          disabled={isActionInProgress}
                        >
                          {duplicating === template.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleExportTemplate(template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="Export"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleLock(template.id, template.isLocked)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title={template.isLocked ? 'Unlock' : 'Lock'}
                          disabled={isActionInProgress}
                        >
                          {template.isLocked ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                          disabled={isActionInProgress}
                        >
                          {deleting === template.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((template: Template) => {
                  const CategoryIcon = getCategoryIcon(template.category);
                  const isActionInProgress = actionInProgress === template.id || duplicating === template.id || deleting === template.id;

                  return (
                    <tr
                      key={template.id}
                      className={`hover:bg-gray-50 ${isActionInProgress ? 'opacity-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                            <CategoryIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-500">{template.subject}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <CategoryIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 capitalize">
                            {template.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(template.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {template.stats.usageCount} times
                        </div>
                        <div className="text-xs text-gray-500">
                          Last: {formatRelative(template.stats.lastUsed || template.updatedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDateTime(template.updatedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{template.createdBy.name}</div>
                        <div className="text-xs text-gray-500">v{template.version}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handlePreviewTemplate(template)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                            disabled={isActionInProgress}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Duplicate"
                            disabled={isActionInProgress}
                          >
                            {duplicating === template.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleExportTemplate(template.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Export"
                          >
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                            disabled={isActionInProgress}
                          >
                            {deleting === template.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-600" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {templates.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategories.length > 0 || selectedStatuses.length > 0
                ? 'Try adjusting your filters'
                : 'Get started by creating your first email template'}
            </p>
            {!searchTerm && selectedCategories.length === 0 && selectedStatuses.length === 0 && (
              <button
                onClick={handleCreateTemplate}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} templates
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilters((prev: TemplateFilters) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters((prev: TemplateFilters) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{previewTemplate.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{previewTemplate.subject}</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {previewTemplate.preview ? (
                  <iframe
                    srcDoc={previewTemplate.preview}
                    title="Template Preview"
                    className="w-full h-[600px] border-0"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleEditTemplate(previewTemplate.id);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Edit Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isRefreshing && (
          <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
              <LoadingSpinner size="sm" />
              <span className="text-gray-700">Refreshing templates...</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </>
  );
};

export default Templates;