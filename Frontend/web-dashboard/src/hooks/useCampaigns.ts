// // hooks/useCampaigns.ts
// import { useState, useEffect, useCallback, useMemo } from 'react';
// import { supabase } from '../lib/supabase';
// import { useAuth } from './useAuth';
// import { useToast } from './useToast';

// // Types
// export interface Campaign {
//   id: string;
//   userId: string;
//   name: string;
//   subject: string;
//   content: string;
//   status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
//   type: 'regular' | 'automated' | 'test';
//   templateId?: string;
//   listIds: string[];
//   stats: CampaignStats;
//   scheduledFor?: string;
//   sentAt?: string;
//   createdAt: string;
//   updatedAt: string;
//   metadata?: Record<string, unknown>;
// }

// export interface CampaignStats {
//   recipients: number;
//   delivered: number;
//   opens: number;
//   uniqueOpens: number;
//   clicks: number;
//   uniqueClicks: number;
//   unsubscribes: number;
//   bounces: number;
//   complaints: number;
//   openRate: number;
//   clickRate: number;
//   deliveryRate: number;
// }

// export interface CampaignFilters {
//   status?: Campaign['status'][];
//   search?: string;
//   dateRange?: { start: string; end: string };
//   page: number;
//   limit: number;
//   sortBy: keyof Campaign;
//   sortOrder: 'asc' | 'desc';
// }

// export interface PaginatedResponse<T> {
//   data: T[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

// interface UseCampaignsOptions {
//   autoFetch?: boolean;
//   cacheTime?: number; // milliseconds
//   retryCount?: number;
// }

// interface CampaignMetrics {
//   totalCampaigns: number;
//   activeCampaigns: number;
//   totalSent: number;
//   avgOpenRate: number;
//   avgClickRate: number;
// }

// const CACHE_KEY = 'campaigns_cache';
// const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
// const DEFAULT_RETRY_COUNT = 3;

// export const useCampaigns = (options: UseCampaignsOptions = {}) => {
//   const { user } = useAuth();
//   const { showToast } = useToast();
  
//   const [campaigns, setCampaigns] = useState<Campaign[]>([]);
//   const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isLoadingMore, setIsLoadingMore] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  
//   const [filters, setFilters] = useState<CampaignFilters>({
//     status: [],
//     search: '',
//     page: 1,
//     limit: 20,
//     sortBy: 'createdAt',
//     sortOrder: 'desc',
//   });
  
//   const [pagination, setPagination] = useState({
//     total: 0,
//     page: 1,
//     limit: 20,
//     totalPages: 0,
//   });

//   const [cache] = useState(() => new Map<string, { data: Campaign[]; timestamp: number }>());
//   const [retryCount, setRetryCount] = useState(0);

//   const cacheKey = useMemo(() => 
//     JSON.stringify({ userId: user?.id, filters }), 
//     [user?.id, filters]
//   );

//   // Check cache before fetching
//   const getCachedData = useCallback(() => {
//     const cached = cache.get(cacheKey);
//     if (cached && Date.now() - cached.timestamp < (options.cacheTime || DEFAULT_CACHE_TIME)) {
//       return cached.data;
//     }
//     return null;
//   }, [cache, cacheKey, options.cacheTime]);

//   // Fetch campaigns with retry logic
//   const fetchCampaigns = useCallback(async (page = filters.page, append = false) => {
//     if (!user) return;
    
//     const loadingSetter = append ? setIsLoadingMore : setIsLoading;
//     loadingSetter(true);
//     setError(null);

//     // Check cache for first page
//     if (page === 1 && !append) {
//       const cached = getCachedData();
//       if (cached) {
//         setCampaigns(cached);
//         loadingSetter(false);
//         return;
//       }
//     }

//     try {
//       // Build query
//       let query = supabase
//         .from('campaigns')
//         .select('*', { count: 'exact' })
//         .eq('user_id', user.id)
//         .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
//         .range((page - 1) * filters.limit, page * filters.limit - 1);

//       // Apply filters
//       if (filters.status && filters.status.length > 0) {
//         query = query.in('status', filters.status);
//       }

//       if (filters.search) {
//         query = query.or(`name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
//       }

//       if (filters.dateRange) {
//         query = query
//           .gte('created_at', filters.dateRange.start)
//           .lte('created_at', filters.dateRange.end);
//       }

//       const { data, error: fetchError, count } = await query;

//       if (fetchError) throw fetchError;

//       // Transform data
//       const transformedData = (data || []).map((item: any): Campaign => ({
//         id: item.id,
//         userId: item.user_id,
//         name: item.name,
//         subject: item.subject,
//         content: item.content,
//         status: item.status,
//         type: item.type,
//         templateId: item.template_id,
//         listIds: item.list_ids || [],
//         stats: item.stats || {
//           recipients: 0,
//           delivered: 0,
//           opens: 0,
//           uniqueOpens: 0,
//           clicks: 0,
//           uniqueClicks: 0,
//           unsubscribes: 0,
//           bounces: 0,
//           complaints: 0,
//           openRate: 0,
//           clickRate: 0,
//           deliveryRate: 0,
//         },
//         scheduledFor: item.scheduled_for,
//         sentAt: item.sent_at,
//         createdAt: item.created_at,
//         updatedAt: item.updated_at,
//         metadata: item.metadata,
//       }));

//       // Update state
//       if (append) {
//         setCampaigns(prev => [...prev, ...transformedData]);
//       } else {
//         setCampaigns(transformedData);
        
//         // Update cache for first page
//         if (page === 1) {
//           cache.set(cacheKey, { data: transformedData, timestamp: Date.now() });
//         }
//       }

//       setPagination({
//         total: count || 0,
//         page,
//         limit: filters.limit,
//         totalPages: Math.ceil((count || 0) / filters.limit),
//       });

//       setRetryCount(0); // Reset retry count on success

//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
//       setError(message);
      
//       // Retry logic
//       if (retryCount < (options.retryCount || DEFAULT_RETRY_COUNT)) {
//         setRetryCount(prev => prev + 1);
//         setTimeout(() => fetchCampaigns(page, append), 1000 * Math.pow(2, retryCount));
//       } else {
//         showToast(message, 'error');
//       }
//     } finally {
//       loadingSetter(false);
//     }
//   }, [user, filters, cacheKey, cache, retryCount, options.retryCount, showToast]);

//   // Fetch metrics
//   const fetchMetrics = useCallback(async () => {
//     if (!user) return;

//     try {
//       const { data, error: metricsError } = await supabase
//         .rpc('get_campaign_metrics', { user_id: user.id });

//       if (metricsError) throw metricsError;

//       setMetrics(data);
//     } catch (err) {
//       console.error('Failed to fetch metrics:', err);
//     }
//   }, [user]);

//   // Load initial data
//   useEffect(() => {
//     if (options.autoFetch !== false && user) {
//       fetchCampaigns();
//       fetchMetrics();
//     }
//   }, [user, fetchCampaigns, fetchMetrics, options.autoFetch]);

//   // Load more (infinite scroll)
//   const loadMore = useCallback(() => {
//     if (pagination.page < pagination.totalPages && !isLoadingMore) {
//       fetchCampaigns(pagination.page + 1, true);
//     }
//   }, [pagination.page, pagination.totalPages, isLoadingMore, fetchCampaigns]);

//   // Refresh data
//   const refresh = useCallback(() => {
//     cache.delete(cacheKey);
//     fetchCampaigns(1, false);
//     fetchMetrics();
//   }, [cache, cacheKey, fetchCampaigns, fetchMetrics]);

//   // Get single campaign
//   const getCampaign = useCallback(async (id: string) => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const { data, error: fetchError } = await supabase
//         .from('campaigns')
//         .select('*')
//         .eq('id', id)
//         .single();

//       if (fetchError) throw fetchError;

//       const campaign = data as Campaign;
//       setSelectedCampaign(campaign);
//       return campaign;
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to fetch campaign';
//       setError(message);
//       showToast(message, 'error');
//       return null;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [showToast]);

//   // Create campaign
//   const createCampaign = useCallback(async (campaignData: Partial<Campaign>) => {
//     if (!user) throw new Error('User not authenticated');
    
//     setIsLoading(true);
//     setError(null);

//     try {
//       const { data, error: createError } = await supabase
//         .from('campaigns')
//         .insert([{
//           user_id: user.id,
//           name: campaignData.name,
//           subject: campaignData.subject,
//           content: campaignData.content,
//           status: campaignData.status || 'draft',
//           type: campaignData.type || 'regular',
//           template_id: campaignData.templateId,
//           list_ids: campaignData.listIds || [],
//           stats: campaignData.stats || {},
//           scheduled_for: campaignData.scheduledFor,
//           metadata: campaignData.metadata || {},
//         }])
//         .select()
//         .single();

//       if (createError) throw createError;

//       const newCampaign = data as Campaign;
//       setCampaigns(prev => [newCampaign, ...prev]);
      
//       // Invalidate cache
//       cache.delete(cacheKey);
      
//       showToast('Campaign created successfully', 'success');
//       return newCampaign;
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to create campaign';
//       setError(message);
//       showToast(message, 'error');
//       throw err;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [user, cache, cacheKey, showToast]);

//   // Update campaign
//   const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const { data, error: updateError } = await supabase
//         .from('campaigns')
//         .update({
//           name: updates.name,
//           subject: updates.subject,
//           content: updates.content,
//           status: updates.status,
//           template_id: updates.templateId,
//           list_ids: updates.listIds,
//           scheduled_for: updates.scheduledFor,
//           metadata: updates.metadata,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', id)
//         .select()
//         .single();

//       if (updateError) throw updateError;

//       const updatedCampaign = data as Campaign;
      
//       // Update local state
//       setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c));
//       if (selectedCampaign?.id === id) {
//         setSelectedCampaign(updatedCampaign);
//       }
      
//       // Invalidate cache
//       cache.delete(cacheKey);
      
//       showToast('Campaign updated successfully', 'success');
//       return updatedCampaign;
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to update campaign';
//       setError(message);
//       showToast(message, 'error');
//       throw err;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedCampaign, cache, cacheKey, showToast]);

//   // Delete campaign
//   const deleteCampaign = useCallback(async (id: string) => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const { error: deleteError } = await supabase
//         .from('campaigns')
//         .delete()
//         .eq('id', id);

//       if (deleteError) throw deleteError;

//       // Update local state
//       setCampaigns(prev => prev.filter(c => c.id !== id));
//       if (selectedCampaign?.id === id) {
//         setSelectedCampaign(null);
//       }
      
//       // Invalidate cache
//       cache.delete(cacheKey);
      
//       showToast('Campaign deleted successfully', 'success');
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to delete campaign';
//       setError(message);
//       showToast(message, 'error');
//       throw err;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedCampaign, cache, cacheKey, showToast]);

//   // Duplicate campaign
//   const duplicateCampaign = useCallback(async (id: string) => {
//     try {
//       const original = await getCampaign(id);
//       if (!original) throw new Error('Campaign not found');

//       const { name, ...rest } = original;
//       return await createCampaign({
//         ...rest,
//         name: `${name} (Copy)`,
//         status: 'draft',
//       });
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to duplicate campaign';
//       showToast(message, 'error');
//       throw err;
//     }
//   }, [getCampaign, createCampaign, showToast]);

//   // Send campaign
//   const sendCampaign = useCallback(async (id: string, schedule?: string) => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const { error: sendError } = await supabase
//         .rpc('send_campaign', { 
//           campaign_id: id,
//           scheduled_time: schedule,
//         });

//       if (sendError) throw sendError;

//       showToast(schedule ? 'Campaign scheduled successfully' : 'Campaign sent successfully', 'success');
      
//       // Refresh campaigns
//       refresh();
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to send campaign';
//       setError(message);
//       showToast(message, 'error');
//       throw err;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [refresh, showToast]);

//   // Pause campaign
//   const pauseCampaign = useCallback(async (id: string) => {
//     return updateCampaign(id, { status: 'paused' });
//   }, [updateCampaign]);

//   // Resume campaign
//   const resumeCampaign = useCallback(async (id: string) => {
//     return updateCampaign(id, { status: 'sending' });
//   }, [updateCampaign]);

//   // Export campaigns
//   const exportCampaigns = useCallback(async (format: 'csv' | 'json' = 'csv') => {
//     try {
//       const { data, error: exportError } = await supabase
//         .from('campaigns')
//         .select('*')
//         .eq('user_id', user?.id);

//       if (exportError) throw exportError;

//       if (format === 'json') {
//         const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `campaigns_${new Date().toISOString()}.json`;
//         a.click();
//       } else {
//         // Convert to CSV
//         const headers = ['id', 'name', 'subject', 'status', 'created_at'];
//         const csv = [
//           headers.join(','),
//           ...data.map((row: any) => headers.map(h => row[h]).join(','))
//         ].join('\n');
        
//         const blob = new Blob([csv], { type: 'text/csv' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `campaigns_${new Date().toISOString()}.csv`;
//         a.click();
//       }

//       showToast('Campaigns exported successfully', 'success');
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to export campaigns';
//       showToast(message, 'error');
//       throw err;
//     }
//   }, [user, showToast]);

//   return {
//     // Data
//     campaigns,
//     selectedCampaign,
//     metrics,
//     isLoading,
//     isLoadingMore,
//     error,
//     pagination,
//     filters,
    
//     // Actions
//     setFilters,
//     fetchCampaigns,
//     loadMore,
//     refresh,
//     getCampaign,
//     createCampaign,
//     updateCampaign,
//     deleteCampaign,
//     duplicateCampaign,
//     sendCampaign,
//     pauseCampaign,
//     resumeCampaign,
//     exportCampaigns,
    
//     // Helpers
//     hasMore: pagination.page < pagination.totalPages,
//     totalCampaigns: pagination.total,
//   };
// };