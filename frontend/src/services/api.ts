import {
  ApiResponse,
  FilterParams,
  FiltersResponse,
  MetadataResponse,
  OverviewData,
  SalesTrendData,
  SalesBreakdownData,
  GeographyData,
  CityMetric,
  ProductsData,
  CategoriesData,
  CustomerSummaryData,
  TopCustomerItem,
  CustomerSegmentsData,
  SellersTopData,
  SellerGeographyData,
  PaymentSummaryData,
  ReviewSummaryData,
  InsightsData,
  DatasetProfileResponse,
  DatasetAnalysisResponse,
  DatasetFilterResponse,
  SegmentComparisonResponse,
  MultiDatasetProfileResponse,
  RelationshipDetectionResponse,
  RelationshipCandidate,
  DataModelResponse,
  ValidateRelationshipRequest,
  ValidateRelationshipResponse,
  CrossDatasetAnalyticsResponse,
  CrossDatasetQueryRequest,
  CrossDatasetQueryResponse,
  CrossDatasetTrend,
  CrossDatasetTrendRequest,
} from '@/types';



const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Builds clean URLSearchParams object, omitting empty or undefined filters.
 */
function buildQueryParams(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Centralized fetch handler with JSON parsing and standardized error handling.
 */
async function request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const query = buildQueryParams(params);
  const url = `${API_BASE_URL}${endpoint}${query}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}: Failed request to ${endpoint}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
    }
    throw err;
  }
}

export const apiService = {
  // Health & Metadata
  getHealth: () => request<any>('/health'),
  getMetadata: () => request<ApiResponse<MetadataResponse>>('/metadata'),
  getFilters: () => request<ApiResponse<FiltersResponse>>('/filters'),

  // Overview
  getOverview: (filters?: FilterParams) =>
    request<ApiResponse<OverviewData>>('/overview', filters),

  // Sales Analytics
  getSalesTrend: (granularity = 'month', filters?: FilterParams) =>
    request<ApiResponse<SalesTrendData>>('/sales/trend', { granularity, ...filters }),

  getSalesByCategory: (limit = 10, filters?: FilterParams) =>
    request<ApiResponse<SalesBreakdownData>>('/sales/category', { limit, ...filters }),

  getSalesByState: (limit = 10, filters?: FilterParams) =>
    request<ApiResponse<SalesBreakdownData>>('/sales/state', { limit, ...filters }),

  getSalesByCity: (limit = 15, filters?: FilterParams) =>
    request<ApiResponse<SalesBreakdownData>>('/sales/city', { limit, ...filters }),

  getSalesByPayment: (filters?: FilterParams) =>
    request<ApiResponse<SalesBreakdownData>>('/sales/payment', filters),

  // Geography
  getGeographyStates: (filters?: FilterParams) =>
    request<ApiResponse<GeographyData>>('/geography/states', filters),

  getGeographyCities: (limit = 20, filters?: FilterParams) =>
    request<ApiResponse<CityMetric[]>>('/geography/cities', { limit, ...filters }),

  // Products
  getTopProducts: (metric = 'revenue', limit = 10, filters?: FilterParams) =>
    request<ApiResponse<ProductsData>>('/products/top', { metric, limit, ...filters }),

  getProductCategories: (limit = 20, filters?: FilterParams) =>
    request<ApiResponse<CategoriesData>>('/products/categories', { limit, ...filters }),

  getProductPerformance: (metric = 'revenue', limit = 20, filters?: FilterParams) =>
    request<ApiResponse<ProductsData>>('/products/performance', { metric, limit, ...filters }),

  // Customers
  getCustomerSummary: (filters?: FilterParams) =>
    request<ApiResponse<CustomerSummaryData>>('/customers/summary', filters),

  getTopCustomers: (limit = 10, filters?: FilterParams) =>
    request<ApiResponse<TopCustomerItem[]>>('/customers/top', { limit, ...filters }),

  getCustomerSegments: () =>
    request<ApiResponse<CustomerSegmentsData>>('/customers/segments'),

  // Sellers
  getTopSellers: (limit = 10, filters?: FilterParams) =>
    request<ApiResponse<SellersTopData>>('/sellers/top', { limit, ...filters }),

  getSellerGeography: (filters?: FilterParams) =>
    request<ApiResponse<SellerGeographyData>>('/sellers/geography', filters),

  // Payments
  getPaymentSummary: (filters?: FilterParams) =>
    request<ApiResponse<PaymentSummaryData>>('/payments/summary', filters),

  // Reviews
  getReviewSummary: (filters?: FilterParams) =>
    request<ApiResponse<ReviewSummaryData>>('/reviews/summary', filters),

  // Insights
  getInsights: (filters?: FilterParams) =>
    request<ApiResponse<InsightsData>>('/insights', filters),

  // Dataset Upload & Profiling
  uploadAndProfileDataset: async (file: File): Promise<DatasetProfileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/upload/profile`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to profile dataset`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
      }
      throw err;
    }
  },

  // Multiple Datasets Profiling
  uploadAndProfileMultiple: async (files: File[]): Promise<MultiDatasetProfileResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const url = `${API_BASE_URL}/upload/profile-multiple`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to profile datasets`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
      }
      throw err;
    }
  },

  // Retrieve individual dataset generic analytics by dataset_id
  getDatasetAnalysis: async (datasetId: string): Promise<DatasetAnalysisResponse> => {
    const url = `${API_BASE_URL}/upload/dataset/${encodeURIComponent(datasetId)}/analysis`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to get dataset analysis`;
        throw new Error(errorMsg);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
      }
      throw err;
    }
  },

  // Multiple Datasets Relationship Detection
  detectRelationships: async (datasetIds?: string[], files?: File[]): Promise<RelationshipDetectionResponse> => {
    // If files are provided, use multipart endpoint as robust fallback
    if (files && files.length > 1) {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      const url = `${API_BASE_URL}/upload/relationships-with-files`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          const errorMsg = data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to detect relationships`;
          throw new Error(errorMsg);
        }
        return data;
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
        }
        throw err;
      }
    }

    // Default: detect using dataset_ids from backend dataset_cache
    const url = `${API_BASE_URL}/upload/relationships`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_ids: datasetIds || [] }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to detect relationships`;
        throw new Error(errorMsg);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
      }
      throw err;
    }
  },

  // Build and validate Data Model from accepted relationships
  buildDataModel: async (
    acceptedRelationships: RelationshipCandidate[],
    datasetIds?: string[],
    files?: File[]
  ): Promise<DataModelResponse> => {
    // If files are provided as fallback:
    if (files && files.length > 0) {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('accepted_relationships_json', JSON.stringify(acceptedRelationships));
      const url = `${API_BASE_URL}/upload/data-model-with-files`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to build data model`);
        }
        return data;
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          throw new Error('Unable to connect to the analytics server.');
        }
        throw err;
      }
    }

    // Default: build using cached datasets
    const url = `${API_BASE_URL}/upload/data-model`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted_relationships: acceptedRelationships,
          dataset_ids: datasetIds || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to build data model`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Retrieve active Data Model from backend
  getDataModel: async (): Promise<DataModelResponse> => {
    const url = `${API_BASE_URL}/upload/data-model`;
    try {
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || `HTTP ${response.status}: Failed to get data model`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Validate a proposed manual relationship
  validateManualRelationship: async (req: ValidateRelationshipRequest): Promise<ValidateRelationshipResponse> => {
    const url = `${API_BASE_URL}/upload/data-model/validate-relationship`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || `HTTP ${response.status}: Failed to validate relationship`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Remove a relationship from active Data Model
  deleteDataModelRelationship: async (relationshipId: string): Promise<DataModelResponse> => {
    const url = `${API_BASE_URL}/upload/data-model/relationships/${encodeURIComponent(relationshipId)}`;
    try {
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || `HTTP ${response.status}: Failed to remove relationship`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Dataset Intelligence Analysis
  uploadAndAnalyzeDataset: async (file: File): Promise<DatasetAnalysisResponse> => {

    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/upload/analyze`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to analyze dataset`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server. Make sure the FastAPI backend is running at http://127.0.0.1:8000.');
      }
      throw err;
    }
  },

  // Dataset Filtering & Recalculation
  filterDataset: async (
    datasetId: string,
    filters: Record<string, any>,
    fileFallback?: File | null,
    primaryMetric?: string | null
  ): Promise<DatasetFilterResponse> => {
    const url = `${API_BASE_URL}/upload/filter`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset_id: datasetId,
          filters,
          primary_metric: primaryMetric || undefined,
        }),
      });

      // If session expired and fallback file is available
      if (response.status === 404 && fileFallback) {
        const formData = new FormData();
        formData.append('file', fileFallback);
        const filtersWithMetric = primaryMetric
          ? { ...filters, _primary_metric: primaryMetric }
          : filters;
        formData.append('filters_json', JSON.stringify(filtersWithMetric));
        const fbRes = await fetch(`${API_BASE_URL}/upload/filter-with-file`, {
          method: 'POST',
          body: formData,
        });
        const fbData = await fbRes.json();
        if (!fbRes.ok) {
          throw new Error(fbData?.detail || 'Failed to filter dataset');
        }
        return fbData;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to filter dataset`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Compare Segments
  compareSegments: async (
    datasetId: string,
    dimension: string,
    segmentA: string,
    segmentB: string,
    fileFallback?: File | null
  ): Promise<SegmentComparisonResponse> => {
    const url = `${API_BASE_URL}/upload/compare-segments`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset_id: datasetId,
          dimension,
          segment_a: segmentA,
          segment_b: segmentB,
        }),
      });

      if (response.status === 404 && fileFallback) {
        const formData = new FormData();
        formData.append('file', fileFallback);
        formData.append('dimension', dimension);
        formData.append('segment_a', segmentA);
        formData.append('segment_b', segmentB);
        const fbRes = await fetch(`${API_BASE_URL}/upload/compare-segments-with-file`, {
          method: 'POST',
          body: formData,
        });
        const fbData = await fbRes.json();
        if (!fbRes.ok) {
          throw new Error(fbData?.detail || 'Failed to compare segments');
        }
        return fbData;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to compare segments`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Generate or recalculate Cross-Dataset Analytics
  generateCrossDatasetAnalytics: async (payload?: {
    model_id?: string;
    group_id?: string;
    filters?: Record<string, any>;
    dataset_ids?: string[];
  }): Promise<CrossDatasetAnalyticsResponse> => {
    const url = `${API_BASE_URL}/upload/cross-dataset-analytics`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to generate cross-dataset analytics`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Get active Cross-Dataset Analytics from cache
  getCrossDatasetAnalytics: async (): Promise<CrossDatasetAnalyticsResponse> => {
    const url = `${API_BASE_URL}/upload/cross-dataset-analytics`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to get cross-dataset analytics`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Execute Dynamic Cross-Dataset Query
  executeCrossDatasetQuery: async (
    payload: CrossDatasetQueryRequest
  ): Promise<CrossDatasetQueryResponse> => {
    const url = `${API_BASE_URL}/upload/cross-dataset-query`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to execute query`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },

  // Execute Dynamic Cross-Dataset Trend
  executeCrossDatasetTrend: async (
    payload: CrossDatasetTrendRequest
  ): Promise<CrossDatasetTrend> => {
    const url = `${API_BASE_URL}/upload/cross-dataset-trend`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error?.message || `HTTP ${response.status}: Failed to calculate trend`);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Unable to connect to the analytics server.');
      }
      throw err;
    }
  },
};

