import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  DatasetProfileResponse,
  DatasetAnalysisResponse,
  ColumnFilterOption,
  DatasetAnalytics,
} from '@/types';
import { apiService } from '@/services/api';

export interface AnalyticsModule {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  category?: string;
}

export type DatasetStatus = 'idle' | 'uploaded' | 'analyzing' | 'analyzed' | 'error';

export interface DatasetAnalysisState {
  datasetName: string | null;
  status: DatasetStatus;
  selectedFile: File | null;
  profile: DatasetProfileResponse | null;
  analysis: DatasetAnalysisResponse | null;
  modules: AnalyticsModule[];
  dashboard: unknown | null;
  error: string | null;
  datasetId: string | null;
  availableFilters: ColumnFilterOption[];
  activeFilters: Record<string, any>;
  activeFiltersSummary: string[];
  isFiltered: boolean;
  totalRows: number;
  filteredRows: number;
  percentageOfTotal: number;
  activeAnalytics: DatasetAnalytics | null;
  isFiltering: boolean;
  primaryMetric: string | null;
}

export interface DatasetContextType extends DatasetAnalysisState {
  setUploadedFile: (file: File | null) => void;
  startAnalyzing: () => void;
  setAnalyzed: (
    profile: DatasetProfileResponse,
    modules?: AnalyticsModule[],
    analysis?: DatasetAnalysisResponse
  ) => void;
  setError: (error: string | null) => void;
  resetDataset: () => void;
  activeWorkspace: 'user' | 'builtin';
  setActiveWorkspace: (ws: 'user' | 'builtin') => void;
  setFilter: (column: string, value: any) => void;
  removeFilter: (column: string) => void;
  clearAllFilters: () => void;
  applyCrossFilter: (column: string, value: string) => void;
  setPrimaryMetric: (metric: string | null) => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

const STORAGE_KEY = 'dataset_intelligence_workspace_state';
const LEGACY_STORAGE_KEY = 'india_sales_user_dataset_state';

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [status, setStatus] = useState<DatasetStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [analysis, setAnalysis] = useState<DatasetAnalysisResponse | null>(null);
  const [modules, setModules] = useState<AnalyticsModule[]>([]);
  const [dashboard, setDashboard] = useState<unknown | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<'user' | 'builtin'>('user');

  // Advanced Filtering State
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [availableFilters, setAvailableFilters] = useState<ColumnFilterOption[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeFiltersSummary, setActiveFiltersSummary] = useState<string[]>([]);
  const [isFiltered, setIsFiltered] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [filteredRows, setFilteredRows] = useState<number>(0);
  const [percentageOfTotal, setPercentageOfTotal] = useState<number>(100.0);
  const [activeAnalytics, setActiveAnalytics] = useState<DatasetAnalytics | null>(null);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [primaryMetric, setPrimaryMetricState] = useState<string | null>(null);

  const filterDebounceRef = useRef<any>(null);

  // Restore profile & modules from sessionStorage if available
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile && parsed.datasetName) {
          setDatasetName(parsed.datasetName);
          setProfile(parsed.profile);
          setModules(parsed.modules || [{ id: 'overview', title: 'Overview', icon: 'layout-dashboard' }]);
          if (parsed.analysis) {
            setAnalysis(parsed.analysis);
            setDatasetId(parsed.analysis.dataset_id || null);
            setAvailableFilters(parsed.analysis.available_filters || []);
            setActiveAnalytics(parsed.analysis.analytics || null);
            setPrimaryMetricState(parsed.analysis.analytics?.primary_metric?.column || null);
            const rows = parsed.profile.dataset?.rows || 0;
            setTotalRows(rows);
            setFilteredRows(rows);
            setPercentageOfTotal(100.0);
          }
          setStatus('analyzed');
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached dataset state:', e);
    }
  }, []);

  const setUploadedFile = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      setDatasetName(file.name);
      setStatus('uploaded');
      setErrorState(null);
    } else {
      if (status === 'uploaded') {
        setStatus('idle');
        setDatasetName(null);
      }
    }
  };

  const startAnalyzing = () => {
    setStatus('analyzing');
    setErrorState(null);
  };

  const setAnalyzed = (
    newProfile: DatasetProfileResponse,
    customModules?: AnalyticsModule[],
    analysisData?: DatasetAnalysisResponse
  ) => {
    const name = newProfile.file?.name || selectedFile?.name || 'uploaded_dataset';
    const rows = newProfile.dataset?.rows || 0;

    setProfile(newProfile);
    setDatasetName(name);
    setStatus('analyzed');
    setErrorState(null);
    setTotalRows(rows);
    setFilteredRows(rows);
    setPercentageOfTotal(100.0);
    setIsFiltered(false);
    setActiveFilters({});
    setActiveFiltersSummary([]);

    if (analysisData) {
      setAnalysis(analysisData);
      setDatasetId(analysisData.dataset_id || null);
      setAvailableFilters(analysisData.available_filters || []);
      setActiveAnalytics(analysisData.analytics || null);
      setPrimaryMetricState(analysisData.analytics?.primary_metric?.column || null);
    }

    const initialModules =
      customModules && customModules.length > 0
        ? customModules
        : [{ id: 'overview', title: 'Overview', icon: 'layout-dashboard', description: 'Comprehensive statistical & semantic profile' }];

    setModules(initialModules);

    // Persist in session cache
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          datasetName: name,
          profile: newProfile,
          modules: initialModules,
          analysis: analysisData || null,
        })
      );
    } catch (e) {
      console.warn('Unable to persist dataset profile in sessionStorage:', e);
    }
  };

  // Dispatch filter request to backend
  const dispatchFilter = useCallback(
    async (updatedFilters: Record<string, any>, metricOverride?: string | null) => {
      if (!datasetId && !selectedFile) return;

      const metricToUse = metricOverride !== undefined ? metricOverride : primaryMetric;

      setIsFiltering(true);
      try {
        const res = await apiService.filterDataset(
          datasetId || 'active_ds',
          updatedFilters,
          selectedFile,
          metricToUse
        );

        setActiveAnalytics(res.analytics);
        setTotalRows(res.total_rows);
        setFilteredRows(res.filtered_rows);
        setPercentageOfTotal(res.percentage_of_total);
        setIsFiltered(res.is_filtered);
        setActiveFiltersSummary(res.active_filters_summary);
        if (res.available_filters && res.available_filters.length > 0) {
          setAvailableFilters(res.available_filters);
        }
      } catch (err: any) {
        console.error('Filter recalculation failed:', err);
      } finally {
        setIsFiltering(false);
      }
    },
    [datasetId, selectedFile, primaryMetric]
  );

  const setPrimaryMetric = useCallback(
    (metric: string | null) => {
      setPrimaryMetricState(metric);
      dispatchFilter(activeFilters, metric);
    },
    [activeFilters, dispatchFilter]
  );

  const setFilter = useCallback(
    (column: string, value: any) => {
      setActiveFilters((prev) => {
        const next = { ...prev };
        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
          delete next[column];
        } else {
          next[column] = value;
        }

        if (filterDebounceRef.current) {
          clearTimeout(filterDebounceRef.current);
        }
        filterDebounceRef.current = setTimeout(() => {
          dispatchFilter(next);
        }, 200);

        return next;
      });
    },
    [dispatchFilter]
  );

  const removeFilter = useCallback(
    (column: string) => {
      setFilter(column, null);
    },
    [setFilter]
  );

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }
    dispatchFilter({});
  }, [dispatchFilter]);

  const applyCrossFilter = useCallback(
    (column: string, value: string) => {
      setActiveFilters((prev) => {
        const currentVals = Array.isArray(prev[column]) ? prev[column] : [];
        const nextVals = currentVals.includes(value) ? currentVals : [...currentVals, value];
        const next = { ...prev, [column]: nextVals };

        if (filterDebounceRef.current) {
          clearTimeout(filterDebounceRef.current);
        }
        filterDebounceRef.current = setTimeout(() => {
          dispatchFilter(next);
        }, 150);

        return next;
      });
    },
    [dispatchFilter]
  );

  const setError = (errMsg: string | null) => {
    setErrorState(errMsg);
    if (errMsg) {
      setStatus('error');
    }
  };

  const resetDataset = () => {
    setSelectedFile(null);
    setDatasetName(null);
    setProfile(null);
    setAnalysis(null);
    setModules([]);
    setDashboard(null);
    setStatus('idle');
    setErrorState(null);
    setDatasetId(null);
    setAvailableFilters([]);
    setActiveFilters({});
    setActiveFiltersSummary([]);
    setIsFiltered(false);
    setTotalRows(0);
    setFilteredRows(0);
    setPercentageOfTotal(100.0);
    setActiveAnalytics(null);
    setIsFiltering(false);
    setPrimaryMetricState(null);

    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  };

  const value: DatasetContextType = {
    datasetName,
    status,
    selectedFile,
    profile,
    analysis,
    modules,
    dashboard,
    error,
    datasetId,
    availableFilters,
    activeFilters,
    activeFiltersSummary,
    isFiltered,
    totalRows,
    filteredRows,
    percentageOfTotal,
    activeAnalytics: activeAnalytics || analysis?.analytics || null,
    isFiltering,
    primaryMetric,
    setUploadedFile,
    startAnalyzing,
    setAnalyzed,
    setError,
    resetDataset,
    activeWorkspace,
    setActiveWorkspace,
    setFilter,
    removeFilter,
    clearAllFilters,
    applyCrossFilter,
    setPrimaryMetric,
  };

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextType {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
