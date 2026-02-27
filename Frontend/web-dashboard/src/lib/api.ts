// API client for making HTTP requests
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

interface RequestOptions {
  params?: Record<string, unknown>;
  responseType?: 'json' | 'blob' | 'text';
  headers?: Record<string, string>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = import.meta.env.VITE_API_BASE_URL || '') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const queryParams = options?.params 
      ? '?' + new URLSearchParams(this.flattenParams(options.params)).toString() 
      : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${url}${queryParams}`, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let responseData: T;
      if (options?.responseType === 'blob') {
        responseData = (await response.blob()) as T;
      } else if (options?.responseType === 'text') {
        responseData = (await response.text()) as T;
      } else {
        responseData = await response.json();
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private flattenParams(params: Record<string, unknown>, prefix = ''): Record<string, string> {
    return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      
      if (value === null || value === undefined) {
        return acc;
      }
      
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const arrayKey = `${fullKey}[${index}]`;
          if (typeof item === 'object' && item !== null) {
            Object.assign(acc, this.flattenParams(item as Record<string, unknown>, arrayKey));
          } else {
            acc[arrayKey] = String(item);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(acc, this.flattenParams(value as Record<string, unknown>, fullKey));
      } else {
        acc[fullKey] = String(value);
      }
      
      return acc;
    }, {});
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

// Create and export a single instance
export const api = new ApiClient();

// Also export the class for custom instances
export default ApiClient;