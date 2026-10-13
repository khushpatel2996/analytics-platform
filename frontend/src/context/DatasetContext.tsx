import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  DatasetProfileResponse,
  DatasetAnalysisResponse,
  ColumnFilterOption,
  DatasetAnalytics,
  MultiDatasetProfileResponse,
  RelationshipCandidate,
  DataModelResponse,
  ValidateRelationshipRequest,
  CrossDatasetAnalyticsResponse,
  CrossDatasetQueryRequest,
  CrossDatasetQueryResponse,
  CrossDatasetTrend,
  CrossDatasetTrendRequest,
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
  selectedFiles: File[];
  profile: DatasetProfileResponse | null;
  analysis: DatasetAnalysisResponse | null;
  multiDatasetProfile: MultiDatasetProfileResponse | null;
  isMultiDataset: boolean;
  relationships: RelationshipCandidate[];
  isDetectingRelationships: boolean;
  detectRelationshipsError: string | null;
  hasDetectedRelationships: boolean;
  dataModel: DataModelResponse | null;
  isBuildingDataModel: boolean;
  dataModelError: string | null;
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
  crossAnalytics: CrossDatasetAnalyticsResponse | null;
  isLoadingCrossAnalytics: boolean;
  crossAnalyticsError: string | null;
  selectedDatasetId: string | null;
}

export interface DatasetContextType extends DatasetAnalysisState {
  setUploadedFile: (file: File | null) => void;
  setSelectedFiles: (files: File[]) => void;
  startAnalyzing: () => void;
  setAnalyzed: (
    profile: DatasetProfileResponse,
    modules?: AnalyticsModule[],
    analysis?: DatasetAnalysisResponse
  ) => void;
  setMultiAnalyzed: (response: MultiDatasetProfileResponse) => void;
  selectDataset: (datasetId: string) => void;
  detectRelationships: () => Promise<void>;
  updateRelationshipStatus: (relationshipId: string, status: 'suggested' | 'accepted' | 'rejected') => void;
  buildDataModel: (relationshipsOverride?: RelationshipCandidate[]) => Promise<DataModelResponse | null>;
  removeModelRelationship: (relationshipId: string) => Promise<void>;
  validateAndAddManualRelationship: (req: ValidateRelationshipRequest) => Promise<{ valid: boolean; notes: string[] }>;
  clearDataModel: () => void;
  fetchCrossDatasetAnalytics: (filters?: Record<string, any>) => Promise<CrossDatasetAnalyticsResponse | null>;
  runCrossDatasetQuery: (query: CrossDatasetQueryRequest) => Promise<CrossDatasetQueryResponse | null>;
  runCrossDatasetTrendQuery: (query: CrossDatasetTrendRequest) => Promise<CrossDatasetTrend | null>;
  clearCrossAnalytics: () => void;
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
  const [selectedFiles, setSelectedFilesState] = useState<File[]>([]);
  const [multiDatasetProfile, setMultiDatasetProfile] = useState<MultiDatasetProfileResponse | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isMultiDataset, setIsMultiDataset] = useState<boolean>(false);
  const [relationships, setRelationships] = useState<RelationshipCandidate[]>([]);
  const [isDetectingRelationships, setIsDetectingRelationships] = useState<boolean>(false);
  const [detectRelationshipsError, setDetectRelationshipsError] = useState<string | null>(null);
  const [hasDetectedRelationships, setHasDetectedRelationships] = useState<boolean>(false);
  const [dataModel, setDataModel] = useState<DataModelResponse | null>(null);
  const [isBuildingDataModel, setIsBuildingDataModel] = useState<boolean>(false);
  const [dataModelError, setDataModelError] = useState<string | null>(null);
  const [crossAnalytics, setCrossAnalytics] = useState<CrossDatasetAnalyticsResponse | null>(null);
  const [isLoadingCrossAnalytics, setIsLoadingCrossAnalytics] = useState<boolean>(false);
  const [crossAnalyticsError, setCrossAnalyticsError] = useState<string | null>(null);
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
        if (parsed.isMultiDataset && parsed.multiDatasetProfile) {
          setIsMultiDataset(true);
          setMultiDatasetProfile(parsed.multiDatasetProfile);
          const activeId = parsed.selectedDatasetId || (parsed.multiDatasetProfile.datasets[0]?.dataset_id);
          setSelectedDatasetId(activeId);
          const activeItem = parsed.multiDatasetProfile.datasets.find((d: any) => d.dataset_id === activeId) || parsed.multiDatasetProfile.datasets[0];
          if (activeItem) {
            setDatasetName(activeItem.filename);
            setProfile(activeItem.profile);
            if (activeItem.analysis) {
              setAnalysis(activeItem.analysis);
              setDatasetId(activeItem.dataset_id);
              setAvailableFilters(activeItem.analysis.available_filters || []);
              setActiveAnalytics(activeItem.analysis.analytics || null);
              setPrimaryMetricState(activeItem.analysis.analytics?.primary_metric?.column || null);
              setModules(activeItem.analysis.modules || [{ id: 'overview', title: 'Overview', icon: 'layout-dashboard' }]);
              const rows = activeItem.rows || activeItem.profile.dataset?.rows || 0;
              setTotalRows(rows);
              setFilteredRows(rows);
              setPercentageOfTotal(100.0);
            }
          } else {
            setDatasetName(parsed.datasetName || `${parsed.multiDatasetProfile.dataset_count} Datasets`);
          }
          if (parsed.relationships && Array.isArray(parsed.relationships)) {
            setRelationships(parsed.relationships);
            setHasDetectedRelationships(true);
          }
          if (parsed.dataModel) {
            setDataModel(parsed.dataModel);
          }
          if (parsed.crossAnalytics) {
            setCrossAnalytics(parsed.crossAnalytics);
          }
          setStatus('analyzed');
        } else if (parsed.profile && parsed.datasetName) {
          setIsMultiDataset(false);
          setMultiDatasetProfile(null);
          setSelectedDatasetId(null);
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
    setSelectedFilesState(file ? [file] : []);
    setIsMultiDataset(false);
    setMultiDatasetProfile(null);
    setSelectedDatasetId(null);
    setRelationships([]);
    setHasDetectedRelationships(false);
    setDetectRelationshipsError(null);
    setDataModel(null);
    setIsBuildingDataModel(false);
    setDataModelError(null);
    setCrossAnalytics(null);
    setIsLoadingCrossAnalytics(false);
    setCrossAnalyticsError(null);
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

  const setSelectedFiles = (files: File[]) => {
    setSelectedFilesState(files);
    setSelectedDatasetId(null);
    setRelationships([]);
    setHasDetectedRelationships(false);
    setDetectRelationshipsError(null);
    setDataModel(null);
    setIsBuildingDataModel(false);
    setDataModelError(null);
    setCrossAnalytics(null);
    setIsLoadingCrossAnalytics(false);
    setCrossAnalyticsError(null);
    if (files.length === 1) {
      setSelectedFile(files[0]);
      setDatasetName(files[0].name);
      setStatus('uploaded');
      setIsMultiDataset(false);
      setMultiDatasetProfile(null);
      setErrorState(null);
    } else if (files.length > 1) {
      setSelectedFile(null);
      setDatasetName(`${files.length} Datasets`);
      setStatus('uploaded');
      setIsMultiDataset(true);
      setErrorState(null);
    } else {
      setSelectedFile(null);
      setDatasetName(null);
      setIsMultiDataset(false);
      setMultiDatasetProfile(null);
      if (status === 'uploaded') {
        setStatus('idle');
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

    setIsMultiDataset(false);
    setMultiDatasetProfile(null);
    setSelectedDatasetId(null);
    setRelationships([]);
    setHasDetectedRelationships(false);
    setDetectRelationshipsError(null);
    setDataModel(null);
    setIsBuildingDataModel(false);
    setDataModelError(null);
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
          isMultiDataset: false,
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

  const selectDataset = useCallback((datasetIdToSelect: string) => {
    setSelectedDatasetId(datasetIdToSelect);
    if (!multiDatasetProfile) return;
    const target = multiDatasetProfile.datasets.find((d) => d.dataset_id === datasetIdToSelect);
    if (!target) return;

    setDatasetName(target.filename);
    setProfile(target.profile);

    const applyAnalysis = (targetAnalysis: DatasetAnalysisResponse) => {
      setAnalysis(targetAnalysis);
      setDatasetId(target.dataset_id);
      setAvailableFilters(targetAnalysis.available_filters || []);
      setActiveAnalytics(targetAnalysis.analytics || null);
      setPrimaryMetricState(targetAnalysis.analytics?.primary_metric?.column || null);
      setModules(targetAnalysis.modules || [{ id: 'overview', title: 'Overview', icon: 'layout-dashboard' }]);
      const rows = target.rows || target.profile.dataset?.rows || 0;
      setTotalRows(rows);
      setFilteredRows(rows);
      setPercentageOfTotal(100.0);
      setIsFiltered(false);
      setActiveFilters({});
      setActiveFiltersSummary([]);
    };

    if (target.analysis) {
      applyAnalysis(target.analysis);
    } else {
      apiService.getDatasetAnalysis(datasetIdToSelect)
        .then((fetchedAnalysis) => {
          target.analysis = fetchedAnalysis;
          applyAnalysis(fetchedAnalysis);
        })
        .catch((err) => {
          console.warn('Failed to load dataset analysis:', err);
        });
    }

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.selectedDatasetId = datasetIdToSelect;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Unable to persist selectedDatasetId in sessionStorage:', e);
    }
  }, [multiDatasetProfile]);

  const setMultiAnalyzed = (response: MultiDatasetProfileResponse) => {
    setMultiDatasetProfile(response);
    setIsMultiDataset(true);
    setStatus('analyzed');
    setErrorState(null);
    setRelationships([]);
    setHasDetectedRelationships(false);
    setDetectRelationshipsError(null);
    setDataModel(null);
    setIsBuildingDataModel(false);
    setDataModelError(null);
    setCrossAnalytics(null);
    setIsLoadingCrossAnalytics(false);
    setCrossAnalyticsError(null);

    const initialDataset = response.datasets[0];
    const initialId = initialDataset ? initialDataset.dataset_id : null;
    setSelectedDatasetId(initialId);

    if (initialDataset) {
      setDatasetName(initialDataset.filename);
      setProfile(initialDataset.profile);
      if (initialDataset.analysis) {
        setAnalysis(initialDataset.analysis);
        setDatasetId(initialDataset.dataset_id);
        setAvailableFilters(initialDataset.analysis.available_filters || []);
        setActiveAnalytics(initialDataset.analysis.analytics || null);
        setPrimaryMetricState(initialDataset.analysis.analytics?.primary_metric?.column || null);
        setModules(initialDataset.analysis.modules || [{ id: 'overview', title: 'Overview', icon: 'layout-dashboard' }]);
        const rows = initialDataset.rows || initialDataset.profile.dataset?.rows || 0;
        setTotalRows(rows);
        setFilteredRows(rows);
        setPercentageOfTotal(100.0);
        setIsFiltered(false);
        setActiveFilters({});
        setActiveFiltersSummary([]);
      }
    } else {
      const title = `${response.dataset_count} Datasets`;
      setDatasetName(title);
    }

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isMultiDataset: true,
          multiDatasetProfile: response,
          selectedDatasetId: initialId,
          datasetName: initialDataset ? initialDataset.filename : `${response.dataset_count} Datasets`,
        })
      );
    } catch (e) {
      console.warn('Unable to persist multi-dataset profile in sessionStorage:', e);
    }
  };

  const detectRelationships = useCallback(async () => {
    if (!multiDatasetProfile || multiDatasetProfile.datasets.length < 2) return;
    setIsDetectingRelationships(true);
    setDetectRelationshipsError(null);
    try {
      const datasetIds = multiDatasetProfile.datasets.map((d) => d.dataset_id);
      const res = await apiService.detectRelationships(datasetIds, selectedFiles);
      setRelationships(res.relationships || []);
      setHasDetectedRelationships(true);

      // Persist in session cache
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.relationships = res.relationships;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Unable to persist relationships in sessionStorage:', e);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to detect relationships between datasets';
      setDetectRelationshipsError(msg);
    } finally {
      setIsDetectingRelationships(false);
    }
  }, [multiDatasetProfile, selectedFiles]);

  const updateRelationshipStatus = useCallback(
    (relationshipId: string, newStatus: 'suggested' | 'accepted' | 'rejected') => {
      setRelationships((prev) => {
        const updated = prev.map((rel) =>
          rel.relationship_id === relationshipId ? { ...rel, status: newStatus } : rel
        );
        try {
          const saved = sessionStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.relationships = updated;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Unable to update relationships in sessionStorage:', e);
        }
        return updated;
      });
    },
    []
  );

  const buildDataModel = useCallback(
    async (relationshipsOverride?: RelationshipCandidate[]): Promise<DataModelResponse | null> => {
      const relsToUse = relationshipsOverride || relationships;
      const acceptedRels = relsToUse.filter((r) => r.status === 'accepted');
      setIsBuildingDataModel(true);
      setDataModelError(null);
      try {
        const datasetIds = multiDatasetProfile?.datasets.map((d) => d.dataset_id);
        const res = await apiService.buildDataModel(acceptedRels, datasetIds, selectedFiles);
        setDataModel(res);

        // Persist in session cache
        try {
          const saved = sessionStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.dataModel = res;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Unable to persist data model in sessionStorage:', e);
        }
        return res;
      } catch (err: any) {
        const msg = err?.message || 'Failed to construct Data Model';
        setDataModelError(msg);
        return null;
      } finally {
        setIsBuildingDataModel(false);
      }
    },
    [multiDatasetProfile, relationships, selectedFiles]
  );

  const removeModelRelationship = useCallback(
    async (relationshipId: string) => {
      try {
        const res = await apiService.deleteDataModelRelationship(relationshipId);
        setDataModel(res);
        setRelationships((prev) =>
          prev.map((r) => (r.relationship_id === relationshipId ? { ...r, status: 'rejected' } : r))
        );
        try {
          const saved = sessionStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.dataModel = res;
            parsed.relationships = parsed.relationships?.map((r: any) =>
              r.relationship_id === relationshipId ? { ...r, status: 'rejected' } : r
            );
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Unable to persist updated data model:', e);
        }
      } catch (err: any) {
        setDataModelError(err?.message || 'Failed to remove relationship');
      }
    },
    []
  );

  const validateAndAddManualRelationship = useCallback(
    async (req: ValidateRelationshipRequest): Promise<{ valid: boolean; notes: string[] }> => {
      try {
        const res = await apiService.validateManualRelationship(req);
        if (res.valid && res.candidate) {
          const newRel = res.candidate;
          setRelationships((prev) => {
            const exists = prev.some((r) => r.relationship_id === newRel.relationship_id);
            const updated = exists
              ? prev.map((r) => (r.relationship_id === newRel.relationship_id ? newRel : r))
              : [...prev, newRel];
            return updated;
          });
          const acceptedList = [
            ...relationships.filter((r) => r.status === 'accepted' && r.relationship_id !== newRel.relationship_id),
            newRel,
          ];
          await buildDataModel(acceptedList);
          return { valid: true, notes: res.notes };
        }
        return { valid: false, notes: res.notes };
      } catch (err: any) {
        return { valid: false, notes: [err?.message || 'Validation request failed'] };
      }
    },
    [relationships, buildDataModel]
  );

  const clearDataModel = useCallback(() => {
    setDataModel(null);
    setDataModelError(null);
    setCrossAnalytics(null);
    setCrossAnalyticsError(null);
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.dataModel;
        delete parsed.crossAnalytics;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchCrossDatasetAnalytics = useCallback(
    async (filtersOverride?: Record<string, any>): Promise<CrossDatasetAnalyticsResponse | null> => {
      setIsLoadingCrossAnalytics(true);
      setCrossAnalyticsError(null);
      try {
        const res = await apiService.generateCrossDatasetAnalytics({
          model_id: dataModel?.model_id,
          filters: filtersOverride || activeFilters,
        });
        setCrossAnalytics(res);

        try {
          const saved = sessionStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.crossAnalytics = res;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Unable to persist cross analytics in sessionStorage:', e);
        }
        return res;
      } catch (err: any) {
        const msg = err?.message || 'Failed to generate cross-dataset analytics';
        setCrossAnalyticsError(msg);
        return null;
      } finally {
        setIsLoadingCrossAnalytics(false);
      }
    },
    [dataModel, activeFilters]
  );

  const runCrossDatasetQuery = useCallback(
    async (query: CrossDatasetQueryRequest): Promise<CrossDatasetQueryResponse | null> => {
      try {
        return await apiService.executeCrossDatasetQuery(query);
      } catch (err: any) {
        const msg = err?.message || 'Failed to execute dynamic cross-dataset query';
        setCrossAnalyticsError(msg);
        return null;
      }
    },
    []
  );

  const runCrossDatasetTrendQuery = useCallback(
    async (query: CrossDatasetTrendRequest): Promise<CrossDatasetTrend | null> => {
      try {
        return await apiService.executeCrossDatasetTrend(query);
      } catch (err: any) {
        const msg = err?.message || 'Failed to calculate dynamic cross-dataset trend';
        setCrossAnalyticsError(msg);
        return null;
      }
    },
    []
  );

  const clearCrossAnalytics = useCallback(() => {
    setCrossAnalytics(null);
    setIsLoadingCrossAnalytics(false);
    setCrossAnalyticsError(null);
  }, []);


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
    setSelectedFilesState([]);
    setMultiDatasetProfile(null);
    setSelectedDatasetId(null);
    setIsMultiDataset(false);
    setRelationships([]);
    setIsDetectingRelationships(false);
    setDetectRelationshipsError(null);
    setHasDetectedRelationships(false);
    setDatasetName(null);
    setProfile(null);
    setAnalysis(null);
    setDataModel(null);
    setIsBuildingDataModel(false);
    setDataModelError(null);
    setCrossAnalytics(null);
    setIsLoadingCrossAnalytics(false);
    setCrossAnalyticsError(null);
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
    selectedFiles,
    profile,
    analysis,
    multiDatasetProfile,
    isMultiDataset,
    selectedDatasetId,
    relationships,
    isDetectingRelationships,
    detectRelationshipsError,
    hasDetectedRelationships,
    dataModel,
    isBuildingDataModel,
    dataModelError,
    crossAnalytics,
    isLoadingCrossAnalytics,
    crossAnalyticsError,
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
    setSelectedFiles,
    startAnalyzing,
    setAnalyzed,
    setMultiAnalyzed,
    selectDataset,
    detectRelationships,
    updateRelationshipStatus,
    buildDataModel,
    removeModelRelationship,
    validateAndAddManualRelationship,
    clearDataModel,
    fetchCrossDatasetAnalytics,
    runCrossDatasetQuery,
    runCrossDatasetTrendQuery,
    clearCrossAnalytics,
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
