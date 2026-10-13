import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Database,
  Network,
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
  IndianRupee,
  ShoppingCart,
  Users,
  Package,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
  FileSpreadsheet,
  UploadCloud,
  Loader2,
  Building,
  GraduationCap,
  Briefcase,
  PieChart,
  MapPin,
  Award,
  Lightbulb,
  LayoutDashboard,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  CrossDatasetAnalyticsResponse,
  CrossDatasetGroupAnalytics,
  CrossDatasetKPI,
  CrossDatasetRanking,
  CrossDatasetAnalysisCard,
  RelationshipHealthItem,
  CrossDatasetTrend,
  CrossDatasetQueryRequest,
  CrossDatasetQueryResponse,
} from '@/types';
import { useDataset } from '@/context/DatasetContext';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatNumber, formatBytes } from '@/utils/formatting';
import { cn } from '@/lib/utils';

export type CombinedTab =
  | 'overview'
  | 'trends'
  | 'products'
  | 'categories'
  | 'geography'
  | 'rankings'
  | 'correlations'
  | 'insights';

interface CrossDatasetAnalyticsViewProps {
  onBackToDataModel?: () => void;
  onBackToRelationships?: () => void;
  onReupload?: () => void;
}

const COMBINED_TABS: Array<{
  id: CombinedTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: PieChart },
  { id: 'geography', label: 'Geography', icon: MapPin },
  { id: 'rankings', label: 'Rankings', icon: Award },
  { id: 'correlations', label: 'Correlations', icon: Network },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export function CrossDatasetAnalyticsView({
  onBackToDataModel,
  onBackToRelationships,
  onReupload,
}: CrossDatasetAnalyticsViewProps) {
  const navigate = useNavigate();
  const {
    crossAnalytics,
    isLoadingCrossAnalytics,
    crossAnalyticsError,
    fetchCrossDatasetAnalytics,
    runCrossDatasetQuery,
    runCrossDatasetTrendQuery,
    dataModel,
  } = useDataset();

  const [activeTab, setActiveTab] = useState<CombinedTab>('overview');
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Dynamic Query Explorer Form State
  const [selectedDim, setSelectedDim] = useState<string>('');
  const [selectedMet, setSelectedMet] = useState<string>('');
  const [selectedAgg, setSelectedAgg] = useState<string>('sum');
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<CrossDatasetQueryResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Interactive Trend Controls State
  const [selectedTrendDate, setSelectedTrendDate] = useState<string>('');
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<string>('');
  const [selectedTrendGranularity, setSelectedTrendGranularity] = useState<string>('month');
  const [customTrend, setCustomTrend] = useState<CrossDatasetTrend | null>(null);
  const [isCalculatingTrend, setIsCalculatingTrend] = useState<boolean>(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  // Interactive Geography Controls State
  const [selectedGeoField, setSelectedGeoField] = useState<string>('');
  const [selectedGeoMetric, setSelectedGeoMetric] = useState<string>('');
  const [selectedGeoAgg, setSelectedGeoAgg] = useState<string>('sum');
  const [customGeoResult, setCustomGeoResult] = useState<CrossDatasetQueryResponse | null>(null);
  const [isQueryingGeo, setIsQueryingGeo] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Auto-fetch cross-dataset analytics if not yet loaded
  useEffect(() => {
    if (!crossAnalytics && !isLoadingCrossAnalytics) {
      fetchCrossDatasetAnalytics();
    }
  }, [crossAnalytics, isLoadingCrossAnalytics, fetchCrossDatasetAnalytics]);

  // Sync active group
  useEffect(() => {
    if (crossAnalytics && crossAnalytics.groups.length > 0) {
      if (!activeGroupId || !crossAnalytics.groups.some((g) => g.group_id === activeGroupId)) {
        setActiveGroupId(crossAnalytics.active_group_id || crossAnalytics.groups[0].group_id);
      }
    }
  }, [crossAnalytics, activeGroupId]);

  const activeGroup: CrossDatasetGroupAnalytics | undefined =
    crossAnalytics?.groups.find((g) => g.group_id === activeGroupId) ||
    crossAnalytics?.groups[0];

  // Set default query explorer and dynamic tab options when group changes
  useEffect(() => {
    if (activeGroup) {
      // Dynamic Query Explorer defaults
      if (activeGroup.available_dimensions.length > 0) {
        setSelectedDim(
          `${activeGroup.available_dimensions[0].dataset}::${activeGroup.available_dimensions[0].column}`
        );
      }
      if (activeGroup.available_metrics.length > 0) {
        setSelectedMet(
          `${activeGroup.available_metrics[0].dataset}::${activeGroup.available_metrics[0].column}`
        );
      }

      // Trends defaults (prefer event dates like order_date, purchase_date over DOB)
      if (activeGroup.available_date_fields && activeGroup.available_date_fields.length > 0) {
        const preferredDate =
          activeGroup.available_date_fields.find((d) => d.is_event_date) ||
          activeGroup.available_date_fields[0];
        setSelectedTrendDate(`${preferredDate.dataset}::${preferredDate.column}`);
      } else {
        setSelectedTrendDate('');
      }

      if (activeGroup.available_metrics.length > 0) {
        setSelectedTrendMetric(
          `${activeGroup.available_metrics[0].dataset}::${activeGroup.available_metrics[0].column}`
        );
      } else {
        setSelectedTrendMetric('__count__');
      }

      if (activeGroup.trends?.granularity) {
        setSelectedTrendGranularity(activeGroup.trends.granularity);
      } else {
        setSelectedTrendGranularity('month');
      }

      setCustomTrend(null);
      setTrendError(null);

      // Geography defaults
      if (activeGroup.available_geo_dimensions && activeGroup.available_geo_dimensions.length > 0) {
        setSelectedGeoField(
          `${activeGroup.available_geo_dimensions[0].dataset}::${activeGroup.available_geo_dimensions[0].column}`
        );
      } else {
        setSelectedGeoField('');
      }

      if (activeGroup.available_metrics.length > 0) {
        setSelectedGeoMetric(
          `${activeGroup.available_metrics[0].dataset}::${activeGroup.available_metrics[0].column}`
        );
      } else {
        setSelectedGeoMetric('__count__');
      }

      setCustomGeoResult(null);
      setGeoError(null);
    }
  }, [activeGroup?.group_id]);

  // Execute Dynamic Explorer Query
  const handleExecuteQuery = async () => {
    if (!selectedDim || !selectedMet || !activeGroup) return;

    const [dimDs, dimCol] = selectedDim.split('::');
    const [metDs, metCol] = selectedMet.split('::');

    setIsQuerying(true);
    setQueryError(null);

    const req: CrossDatasetQueryRequest = {
      group_id: activeGroup.group_id,
      dimension_dataset: dimDs,
      dimension_column: dimCol,
      metric_dataset: metDs,
      metric_column: metCol,
      aggregation: selectedAgg,
      limit: 8,
    };

    const res = await runCrossDatasetQuery(req);
    setIsQuerying(false);
    if (res) {
      setQueryResult(res);
    } else {
      setQueryError('Could not calculate query across selected tables.');
    }
  };

  // Re-calculate Dynamic Trend across connected datasets
  const handleRecalculateTrend = async (
    dateOverride?: string,
    metricOverride?: string,
    granOverride?: string
  ) => {
    const dateToUse = dateOverride !== undefined ? dateOverride : selectedTrendDate;
    const metricToUse = metricOverride !== undefined ? metricOverride : selectedTrendMetric;
    const granToUse = granOverride !== undefined ? granOverride : selectedTrendGranularity;

    if (!dateToUse || !activeGroup) return;

    const [dateDs, dateCol] = dateToUse.split('::');
    let metDs: string | null = null;
    let metCol: string | null = null;

    if (metricToUse && metricToUse !== '__count__') {
      const parts = metricToUse.split('::');
      if (parts.length === 2) {
        metDs = parts[0];
        metCol = parts[1];
      }
    }

    setIsCalculatingTrend(true);
    setTrendError(null);

    const req = {
      group_id: activeGroup.group_id,
      date_dataset: dateDs,
      date_column: dateCol,
      metric_dataset: metDs,
      metric_column: metCol,
      granularity: granToUse,
    };

    const res = await runCrossDatasetTrendQuery(req);
    setIsCalculatingTrend(false);
    if (res && res.points && res.points.length > 0) {
      setCustomTrend(res);
    } else {
      setTrendError('No trend data points found for the selected date and metric configuration.');
    }
  };

  // Re-calculate Dynamic Geography Query across connected datasets
  const handleExecuteGeoQuery = async (
    geoOverride?: string,
    metricOverride?: string,
    aggOverride?: string
  ) => {
    const geoToUse = geoOverride !== undefined ? geoOverride : selectedGeoField;
    const metricToUse = metricOverride !== undefined ? metricOverride : selectedGeoMetric;
    const aggToUse = aggOverride !== undefined ? aggOverride : selectedGeoAgg;

    if (!geoToUse || !activeGroup) return;

    const [geoDs, geoCol] = geoToUse.split('::');
    let metDs: string | null = null;
    let metCol: string | null = null;

    if (metricToUse && metricToUse !== '__count__') {
      const parts = metricToUse.split('::');
      if (parts.length === 2) {
        metDs = parts[0];
        metCol = parts[1];
      }
    }

    if (!metDs || !metCol) {
      if (activeGroup.available_metrics.length > 0) {
        metDs = activeGroup.available_metrics[0].dataset;
        metCol = activeGroup.available_metrics[0].column;
      } else {
        metDs = geoDs;
        metCol = geoCol;
      }
    }

    setIsQueryingGeo(true);
    setGeoError(null);

    const req: CrossDatasetQueryRequest = {
      group_id: activeGroup.group_id,
      dimension_dataset: geoDs,
      dimension_column: geoCol,
      metric_dataset: metDs,
      metric_column: metCol,
      aggregation: aggToUse,
      limit: 10,
    };

    const res = await runCrossDatasetQuery(req);
    setIsQueryingGeo(false);
    if (res) {
      setCustomGeoResult(res);
    } else {
      setGeoError('Could not calculate geographic aggregation across selected tables.');
    }
  };

  const toggleDetail = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper for KPI Icon
  const getKPIIcon = (category: string, label: string) => {
    const l = label.toLowerCase();
    if (l.includes('customer') || l.includes('user') || l.includes('client')) return Users;
    if (l.includes('order') || l.includes('transaction')) return ShoppingCart;
    if (l.includes('product') || l.includes('item') || l.includes('catalog')) return Package;
    if (
      l.includes('revenue') ||
      l.includes('sales') ||
      l.includes('price') ||
      l.includes('salary') ||
      l.includes('payroll') ||
      category === 'financial'
    )
      return IndianRupee;
    if (l.includes('employee') || l.includes('staff')) return Briefcase;
    if (l.includes('student') || l.includes('class')) return GraduationCap;
    if (category === 'temporal' || l.includes('date')) return Calendar;
    if (category === 'volume' || l.includes('unit')) return Layers;
    return BarChart3;
  };

  // Helper for KPI icon bg
  const getKPITheme = (category: string, label: string) => {
    const l = label.toLowerCase();
    if (l.includes('revenue') || l.includes('sales') || category === 'financial') {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        color: 'text-emerald-600 dark:text-emerald-400',
      };
    }
    if (l.includes('customer') || l.includes('user')) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/60',
        color: 'text-blue-600 dark:text-blue-400',
      };
    }
    if (l.includes('order')) {
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-950/60',
        color: 'text-indigo-600 dark:text-indigo-400',
      };
    }
    if (l.includes('product')) {
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/60',
        color: 'text-purple-600 dark:text-purple-400',
      };
    }
    return {
      bg: 'bg-slate-100 dark:bg-slate-800',
      color: 'text-slate-600 dark:text-slate-400',
    };
  };

  // Check dimension categories for specific tabs
  const productAnalyses = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.analyses.filter((a) =>
      /product|item|sku|title|catalog|goods|merchandise/i.test(
        `${a.title} ${a.description} ${a.primary_dimension}`
      )
    );
  }, [activeGroup]);

  const productRankings = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.rankings.filter((r) =>
      /product|item|sku|title|catalog/i.test(`${r.title} ${r.dimension_column}`)
    );
  }, [activeGroup]);

  const categoryAnalyses = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.analyses.filter((a) =>
      /categor|segment|type|class|group|department|division|genre/i.test(
        `${a.title} ${a.description} ${a.primary_dimension}`
      )
    );
  }, [activeGroup]);

  const categoryRankings = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.rankings.filter((r) =>
      /categor|segment|type|class|group|dept|department/i.test(`${r.title} ${r.dimension_column}`)
    );
  }, [activeGroup]);

  const geoAnalyses = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.analyses.filter((a) =>
      /geograph|state|city|region|country|zone|location|territory|postal|zip/i.test(
        `${a.title} ${a.description} ${a.primary_dimension}`
      )
    );
  }, [activeGroup]);

  const geoRankings = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.rankings.filter((r) =>
      /state|city|region|country|zone|geo|location/i.test(`${r.title} ${r.dimension_column}`)
    );
  }, [activeGroup]);

  const displayTrend: CrossDatasetTrend | null = useMemo(() => {
    if (customTrend) return customTrend;
    if (activeGroup?.trends && activeGroup.trends.points && activeGroup.trends.points.length > 0) {
      return activeGroup.trends;
    }
    return null;
  }, [customTrend, activeGroup]);

  const hasAnyDate = useMemo(() => {
    if (!activeGroup) return false;
    return Boolean(
      (activeGroup.available_date_fields && activeGroup.available_date_fields.length > 0) ||
      activeGroup.has_time_dimension ||
      activeGroup.trends
    );
  }, [activeGroup]);

  const hasGeo = useMemo(() => {
    if (!activeGroup) return false;
    return Boolean(
      activeGroup.has_geo_dimension ||
      geoAnalyses.length > 0 ||
      geoRankings.length > 0 ||
      (activeGroup.available_geo_dimensions && activeGroup.available_geo_dimensions.length > 0)
    );
  }, [activeGroup, geoAnalyses.length, geoRankings.length]);

  // Loading State
  if (isLoadingCrossAnalytics && !crossAnalytics) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200/90 dark:border-blue-900/50 p-12 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto animate-pulse">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Calculating Cross-Dataset Analytics...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Executing controlled joins along confirmed relationship paths, evaluating KPIs, and generating cross-table metrics without duplicating memory.
        </p>
      </div>
    );
  }

  // Error State
  if (crossAnalyticsError && !crossAnalytics) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-10 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cross-Dataset Calculation Failed</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">{crossAnalyticsError}</p>
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchCrossDatasetAnalytics()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Calculation</span>
          </button>
          <button
            onClick={onBackToDataModel || (() => navigate('/upload-analytics'))}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  // Ready prompt if not loaded
  if (!crossAnalytics || !activeGroup) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-xs space-y-4">
        <Sparkles className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Ready for Cross-Dataset Analytics</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Click below to execute safe joins across your validated Data Model.
        </p>
        <button
          onClick={() => fetchCrossDatasetAnalytics()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate Analytics Now</span>
        </button>
      </div>
    );
  }

  // Render Unavailable Card helper
  const renderUnavailableCard = (
    title: string,
    message: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        {message}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Connected Datasets Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                Combined Analysis
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                Connected Model
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {activeGroup.datasets.length} datasets connected{dataModel?.relationships?.length ? ` · ${dataModel.relationships.length} relationships` : ''}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activeGroup.datasets.map((ds, idx) => (
                <React.Fragment key={ds}>
                  <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                    {ds}
                  </span>
                  {idx < activeGroup.datasets.length - 1 && (
                    <span className="text-slate-300 dark:text-slate-600 font-normal">───</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Group Selector if Multiple Connected Groups Exist */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {crossAnalytics.groups.length > 1 && (
            <select
              value={activeGroupId}
              onChange={(e) => setActiveGroupId(e.target.value)}
              className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              {crossAnalytics.groups.map((grp) => (
                <option key={grp.group_id} value={grp.group_id}>
                  {grp.name} ({grp.datasets.length} tables)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchCrossDatasetAnalytics()}
            disabled={isLoadingCrossAnalytics}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Refresh calculations"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoadingCrossAnalytics && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* SECONDARY TAB SYSTEM: Overview | Trends | Products | Categories | Geography | Rankings | Correlations | Insights */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800">
        {COMBINED_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer',
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
              )}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5',
                  isActive
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview KPIs Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cross-Dataset Overview ({activeGroup.kpis.length} Key Metrics)
              </h4>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Metrics calculated across connected tables
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
              {activeGroup.kpis.map((kpi) => {
                const IconComp = getKPIIcon(kpi.category, kpi.label);
                const theme = getKPITheme(kpi.category, kpi.label);

                return (
                  <KPICard
                    key={kpi.id}
                    label={kpi.label}
                    value={kpi.formatted_value}
                    subtitle={kpi.subtitle || undefined}
                    icon={IconComp}
                    iconBgColor={theme.bg}
                    iconColor={theme.color}
                  />
                );
              })}
            </div>
          </div>

          {/* Cross-Dataset Analysis Cards */}
          {activeGroup.analyses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Combined Analyses ({activeGroup.analyses.length})
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Multi-table joins evaluating performance across dataset boundaries
                  </p>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Safe Joins Applied
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeGroup.analyses.map((card) => {
                  const isExpanded = !!expandedDetails[card.id];

                  return (
                    <div
                      key={card.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                              {card.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {card.description}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 shrink-0">
                            {card.chart_type.toUpperCase()}
                          </span>
                        </div>

                        {/* Chart / Data Rows Preview */}
                        <div className="mt-4 space-y-2.5">
                          {card.data.map((row, idx) => {
                            const maxVal = Math.max(...card.data.map((d) => d.metric || 1));
                            const pct = Math.min(100, Math.round(((row.metric || 0) / maxVal) * 100));

                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span
                                    className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]"
                                    title={row.dimension}
                                  >
                                    {row.dimension}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {row.formatted}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expandable Transparency Section */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => toggleDetail(card.id)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>
                            {isExpanded ? 'Hide Calculation Details' : 'How this analysis was calculated'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2 animate-in fade-in duration-200">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                Datasets Used
                              </span>
                              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                {card.how_calculated.datasets_used.join('  ──▶  ')}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                Relationships & Join Keys
                              </span>
                              <ul className="space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5">
                                {card.how_calculated.relationships_used.map((r, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[11px]">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                  Join Type
                                </span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                  {card.how_calculated.join_type}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                  Formula
                                </span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                  {card.how_calculated.formula}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Cross-Dataset Explorer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Dynamic Cross-Dataset Explorer
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select any Dimension from Table A and Metric from Table B to dynamically evaluate join paths.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dimension (Group By)
                </label>
                <select
                  value={selectedDim}
                  onChange={(e) => setSelectedDim(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {activeGroup.available_dimensions.map((d) => (
                    <option key={`${d.dataset}::${d.column}`} value={`${d.dataset}::${d.column}`}>
                      {d.label} ({d.distinct_count} unique)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metric (Measure)
                </label>
                <select
                  value={selectedMet}
                  onChange={(e) => setSelectedMet(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {activeGroup.available_metrics.map((m) => (
                    <option key={`${m.dataset}::${m.column}`} value={`${m.dataset}::${m.column}`}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aggregation Function
                </label>
                <select
                  value={selectedAgg}
                  onChange={(e) => setSelectedAgg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="sum">SUM (Total)</option>
                  <option value="avg">AVG (Average)</option>
                  <option value="count">COUNT (Records)</option>
                  <option value="min">MIN (Lowest)</option>
                  <option value="max">MAX (Highest)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleExecuteQuery}
                  disabled={isQuerying || !selectedDim || !selectedMet}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isQuerying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Computing Join...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {queryResult && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{queryResult.title}</h5>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Path: {queryResult.join_path.join(' ──▶ ')}
                  </span>
                </div>

                <div className="space-y-2">
                  {queryResult.items.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.formatted_value} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {queryError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {hasAnyDate ? (
            <>
              {/* Trend Configuration & Controls Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Cross-Dataset Trend Controls
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure chronological progression across connected datasets by selecting date, metric, and granularity.
                    </p>
                  </div>
                  {displayTrend && (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase self-start sm:self-auto">
                      {displayTrend.granularity} Aggregation
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Date Field (Time Axis)
                    </label>
                    <select
                      value={selectedTrendDate}
                      onChange={(e) => {
                        setSelectedTrendDate(e.target.value);
                        handleRecalculateTrend(e.target.value, undefined, undefined);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {activeGroup.available_date_fields && activeGroup.available_date_fields.length > 0 ? (
                        activeGroup.available_date_fields.map((d) => (
                          <option
                            key={`${d.dataset}::${d.column}`}
                            value={`${d.dataset}::${d.column}`}
                          >
                            {d.column} ({d.dataset}){d.is_event_date ? ' • Event Date' : d.role === 'BIRTH_DATE' ? ' • Demographic (DOB)' : ` • ${d.role}`}
                          </option>
                        ))
                      ) : (
                        <option value="">No date fields</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Metric
                    </label>
                    <select
                      value={selectedTrendMetric}
                      onChange={(e) => {
                        setSelectedTrendMetric(e.target.value);
                        handleRecalculateTrend(undefined, e.target.value, undefined);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="__count__">Record Count (Volume)</option>
                      {activeGroup.available_metrics.map((m) => (
                        <option key={`${m.dataset}::${m.column}`} value={`${m.dataset}::${m.column}`}>
                          {m.label} ({m.dataset})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Granularity
                    </label>
                    <select
                      value={selectedTrendGranularity}
                      onChange={(e) => {
                        setSelectedTrendGranularity(e.target.value);
                        handleRecalculateTrend(undefined, undefined, e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="quarter">Quarter</option>
                      <option value="year">Year</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRecalculateTrend()}
                      disabled={isCalculatingTrend || !selectedTrendDate}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCalculatingTrend ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Update Trend</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Transparency Badges */}
                <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Active Sources:</span>
                  {selectedTrendDate && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-medium text-slate-700 dark:text-slate-300">
                      Date: {selectedTrendDate.split('::')[1]} ({selectedTrendDate.split('::')[0]})
                    </span>
                  )}
                  {selectedTrendMetric && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-medium text-slate-700 dark:text-slate-300">
                      Metric: {selectedTrendMetric === '__count__' ? 'Record Count' : `${selectedTrendMetric.split('::')[1]} (${selectedTrendMetric.split('::')[0]})`}
                    </span>
                  )}
                  {selectedTrendDate && selectedTrendMetric && selectedTrendMetric !== '__count__' && selectedTrendDate.split('::')[0] !== selectedTrendMetric.split('::')[0] && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 font-mono font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      Join: {selectedTrendDate.split('::')[0]} ──▶ {selectedTrendMetric.split('::')[0]}
                    </span>
                  )}
                </div>

                {trendError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{trendError}</span>
                  </div>
                )}
              </div>

              {/* Informative banner if only demographic birth date is detected */}
              {!activeGroup.has_event_date && !customTrend && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-amber-950 dark:text-amber-100">
                      Demographic Birth Dates Excluded from Automated Trends
                    </h5>
                    <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                      Date of Birth fields were detected in connected datasets, but classified as entity demographics rather than operational business events. To preserve reporting integrity, automated business trend lines are not rendered for birth dates.
                    </p>
                    <p className="text-amber-700 dark:text-amber-400">
                      To analyze birth cohort patterns or demographic distribution over time, select the field in the controls above and click <strong>Update Trend</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Trend Chart and Data Cards */}
              {displayTrend && displayTrend.points.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          {displayTrend.metric_name} Over Time
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Historical progression from {displayTrend.dataset}.{displayTrend.date_column}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                      {displayTrend.granularity} Aggregation
                    </span>
                  </div>

                  {/* Recharts Area Chart */}
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={displayTrend.points}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="crossTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(v) => (v >= 1000 ? formatNumber(v) : v)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#f8fafc',
                            fontSize: '12px',
                          }}
                          formatter={(val: any) => [formatNumber(Number(val)), displayTrend.metric_name || 'Value']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#crossTrendGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Data points summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {displayTrend.points.map((pt, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between"
                      >
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{pt.date}</span>
                        <div className="mt-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {pt.value >= 1000 ? formatNumber(pt.value) : pt.value}
                          </p>
                          {pt.count !== null && pt.count !== undefined && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              {pt.count} records
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            renderUnavailableCard(
              'Trends unavailable',
              'No date or time field was detected in the connected datasets to calculate chronological progression.',
              TrendingUp
            )
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTS */}
      {activeTab === 'products' && (
        <div>
          {productAnalyses.length > 0 || productRankings.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cross-Dataset Products Performance
                </h4>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Catalog metrics across connected tables
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productRankings.map((rk) => (
                  <div
                    key={rk.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={rk.title}>
                          {rk.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rk.total_items} items
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-2.5">
                        {rk.items.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={item.label}>
                                {idx + 1}. {item.label}
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {item.formatted_value}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderUnavailableCard(
              'Products unavailable',
              'No product, item, or catalog dimension was detected in the connected datasets.',
              Package
            )
          )}
        </div>
      )}

      {/* TAB 4: CATEGORIES */}
      {activeTab === 'categories' && (
        <div>
          {categoryAnalyses.length > 0 || categoryRankings.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cross-Dataset Categories & Classification
                </h4>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Segment breakdowns across connected tables
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryRankings.map((rk) => (
                  <div
                    key={rk.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={rk.title}>
                          {rk.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rk.total_items} segments
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-2.5">
                        {rk.items.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={item.label}>
                                {item.label}
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {item.formatted_value}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderUnavailableCard(
              'Categories unavailable',
              'No category, segment, or taxonomic classification dimension was detected in the connected datasets.',
              PieChart
            )
          )}
        </div>
      )}

      {/* TAB 5: GEOGRAPHY */}
      {activeTab === 'geography' && (
        <div className="space-y-6">
          {hasGeo ? (
            <>
              {/* Geography Interactive Controls Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Cross-Dataset Geography Controls
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Analyze territorial performance by joining location dimensions from one dataset with metrics from connected datasets.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Location Dimension
                    </label>
                    <select
                      value={selectedGeoField}
                      onChange={(e) => setSelectedGeoField(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {activeGroup.available_geo_dimensions && activeGroup.available_geo_dimensions.length > 0 ? (
                        activeGroup.available_geo_dimensions.map((d) => (
                          <option
                            key={`${d.dataset}::${d.column}`}
                            value={`${d.dataset}::${d.column}`}
                          >
                            {d.column} ({d.dataset}) • {d.distinct_count} locations
                          </option>
                        ))
                      ) : (
                        <option value="">No geo fields detected</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Metric
                    </label>
                    <select
                      value={selectedGeoMetric}
                      onChange={(e) => setSelectedGeoMetric(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="__count__">Record Count (Volume)</option>
                      {activeGroup.available_metrics.map((m) => (
                        <option key={`${m.dataset}::${m.column}`} value={`${m.dataset}::${m.column}`}>
                          {m.label} ({m.dataset})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Aggregation Function
                    </label>
                    <select
                      value={selectedGeoAgg}
                      onChange={(e) => setSelectedGeoAgg(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="sum">SUM (Total)</option>
                      <option value="avg">AVG (Average)</option>
                      <option value="count">COUNT (Records)</option>
                      <option value="min">MIN (Lowest)</option>
                      <option value="max">MAX (Highest)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleExecuteGeoQuery()}
                      disabled={isQueryingGeo || !selectedGeoField}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isQueryingGeo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Computing Join...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Run Analysis</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Transparency Badges */}
                <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Active Sources:</span>
                  {selectedGeoField && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-medium text-slate-700 dark:text-slate-300">
                      Location: {selectedGeoField.split('::')[1]} ({selectedGeoField.split('::')[0]})
                    </span>
                  )}
                  {selectedGeoMetric && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-medium text-slate-700 dark:text-slate-300">
                      Metric: {selectedGeoMetric === '__count__' ? 'Record Count' : `${selectedGeoMetric.split('::')[1]} (${selectedGeoMetric.split('::')[0]})`}
                    </span>
                  )}
                  {selectedGeoField && selectedGeoMetric && selectedGeoMetric !== '__count__' && selectedGeoField.split('::')[0] !== selectedGeoMetric.split('::')[0] && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 font-mono font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Join: {selectedGeoField.split('::')[0]} ──▶ {selectedGeoMetric.split('::')[0]}
                    </span>
                  )}
                </div>

                {geoError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{geoError}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Query Result Card */}
              {customGeoResult && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {customGeoResult.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        Path: {customGeoResult.join_path.join(' ──▶ ')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 shrink-0 self-start sm:self-auto uppercase">
                      Custom Query
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {customGeoResult.items.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {idx + 1}. {item.label}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.formatted_value} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculation Details for Custom Query */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleDetail('custom-geo')}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>
                        {expandedDetails['custom-geo'] ? 'Hide Calculation Details' : 'How this analysis was calculated'}
                      </span>
                      {expandedDetails['custom-geo'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedDetails['custom-geo'] && (
                      <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2 animate-in fade-in duration-200">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                            Datasets Used
                          </span>
                          <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                            {customGeoResult.how_calculated.datasets_used.join('  ──▶  ')}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                            Join Keys
                          </span>
                          <ul className="space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5">
                            {customGeoResult.how_calculated.relationships_used.map((r, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[11px]">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                              Join Type
                            </span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {customGeoResult.how_calculated.join_type}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                              Formula
                            </span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                              {customGeoResult.how_calculated.formula}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pre-calculated Geography Analyses Cards */}
              {geoAnalyses.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Geography Performance Analyses ({geoAnalyses.length})
                    </h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Location dimensions joined across datasets
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {geoAnalyses.map((card) => {
                      const isExpanded = !!expandedDetails[card.id];

                      return (
                        <div
                          key={card.id}
                          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                  {card.title}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {card.description}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                                {card.chart_type.toUpperCase()}
                              </span>
                            </div>

                            <div className="mt-4 space-y-2.5">
                              {card.data.map((row, idx) => {
                                const maxVal = Math.max(...card.data.map((d) => d.metric || 1));
                                const pct = Math.min(100, Math.round(((row.metric || 0) / maxVal) * 100));

                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span
                                        className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]"
                                        title={row.dimension}
                                      >
                                        {row.dimension}
                                      </span>
                                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                        {row.formatted}
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => toggleDetail(card.id)}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>
                                {isExpanded ? 'Hide Calculation Details' : 'How this analysis was calculated'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2 animate-in fade-in duration-200">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                    Datasets Used
                                  </span>
                                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {card.how_calculated.datasets_used.join('  ──▶  ')}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                    Relationships & Join Keys
                                  </span>
                                  <ul className="space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5">
                                    {card.how_calculated.relationships_used.map((r, i) => (
                                      <li key={i} className="flex items-center gap-1">
                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span>{r}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[11px]">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                      Join Type
                                    </span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                      {card.how_calculated.join_type}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                      Formula
                                    </span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                      {card.how_calculated.formula}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pre-calculated Geography Rankings */}
              {geoRankings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Regional Rankings & Leaders
                    </h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Top locations by contribution
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {geoRankings.map((rk) => (
                      <div
                        key={rk.id}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={rk.title}>
                              {rk.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {rk.total_items} regions
                            </span>
                          </div>

                          <div className="mt-3.5 space-y-2.5">
                            {rk.items.slice(0, 5).map((item, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={item.label}>
                                    {idx + 1}. {item.label}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {item.formatted_value}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono truncate">
                          Path: {rk.join_path.join(' → ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            renderUnavailableCard(
              'Geography unavailable',
              'No geographic field detected in the connected datasets.',
              MapPin
            )
          )}
        </div>
      )}

      {/* TAB 6: RANKINGS */}
      {activeTab === 'rankings' && (
        <div>
          {activeGroup.rankings.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cross-Dataset Rankings & Leaders ({activeGroup.rankings.length})
                </h4>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Sorted by highest contribution
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeGroup.rankings.map((rk) => (
                  <div
                    key={rk.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={rk.title}>
                          {rk.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rk.total_items} items
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-2.5">
                        {rk.items.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={item.label}>
                                {idx + 1}. {item.label}
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {item.formatted_value}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono truncate">
                      Path: {rk.join_path.join(' → ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderUnavailableCard(
              'Rankings unavailable',
              'No cross-dataset ranking dimensions available in the connected tables.',
              Award
            )
          )}
        </div>
      )}

      {/* TAB 7: CORRELATIONS */}
      {activeTab === 'correlations' && (
        <div>
          {activeGroup.available_metrics && activeGroup.available_metrics.length > 1 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Multi-Metric Co-Movement & Comparison
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Analyzing relationships between {activeGroup.available_metrics.length} numeric metrics across joined tables.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeGroup.available_metrics.map((m) => (
                  <div
                    key={`${m.dataset}::${m.column}`}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                  >
                    <span className="font-bold text-slate-900 dark:text-slate-100">{m.label}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                      Dataset: {m.dataset}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Column: {m.column}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderUnavailableCard(
              'Correlations unavailable',
              'Insufficient numeric metrics across connected datasets to calculate multi-metric correlation.',
              Network
            )
          )}
        </div>
      )}

      {/* TAB 8: INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Factual Insights */}
          {activeGroup.insights && activeGroup.insights.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Factual Cross-Dataset Insights ({activeGroup.insights.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {activeGroup.insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200 leading-snug">{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Relationship Health */}
          {activeGroup.relationship_health && activeGroup.relationship_health.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Relationship Health ({activeGroup.relationship_health.length} Links)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Foreign key integrity and matching rates across joined datasets
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {activeGroup.data_quality_summary.healthy_links} of {activeGroup.relationship_health.length} Healthy
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeGroup.relationship_health.map((h) => (
                  <div
                    key={h.relationship_id}
                    className={cn(
                      'p-4 rounded-xl border text-xs flex flex-col justify-between shadow-2xs',
                      h.status === 'healthy'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-850'
                        : h.status === 'warning'
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-850'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-850'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                        <span className="truncate">
                          {h.left_dataset} → {h.right_dataset}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold border',
                            h.status === 'healthy'
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                          )}
                        >
                          {h.matched_percentage}% Matched
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <p>Parent Key: {h.left_column}</p>
                        <p>Foreign Key: {h.right_column}</p>
                        <p>
                          Unmatched: {h.unmatched_count} ({h.unmatched_percentage}%)
                        </p>
                      </div>
                    </div>

                    {h.notes.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                        {h.notes[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!activeGroup.insights?.length && !activeGroup.relationship_health?.length && (
            renderUnavailableCard(
              'Insights unavailable',
              'Insufficient cross-dataset patterns detected to generate automated insights.',
              Lightbulb
            )
          )}
        </div>
      )}
    </div>
  );
}

export default CrossDatasetAnalyticsView;
