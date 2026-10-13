import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  FileCode,
  FileText,
  Layers,
  Columns,
  AlertTriangle,
  Database,
  CheckCircle2,
  Network,
  UploadCloud,
  Hash,
  Tag,
  Calendar,
  ToggleLeft,
  Type,
  Search,
  ExternalLink,
  Table,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RefreshCw,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  MultiDatasetProfileResponse,
  MultiDatasetProfileItem,
  ColumnProfile,
  RelationshipCandidate,
} from '@/types';
import { useDataset } from '@/context/DatasetContext';
import { DataModelView } from '@/components/analytics/DataModelView';
import { CrossDatasetAnalyticsView } from '@/components/analytics/CrossDatasetAnalyticsView';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatNumber, formatBytes } from '@/utils/formatting';
import { cn } from '@/lib/utils';

// Helper to strip file extension
function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

// Helper to format friendly entity names
function formatEntityName(filename: string): string {
  const base = stripExtension(filename).replace(/[_-]+/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

interface RelationshipCardProps {
  rel: RelationshipCandidate;
  onAccept: () => void;
  onReject: () => void;
  onReset: () => void;
}

function RelationshipCard({ rel, onAccept, onReject, onReset }: RelationshipCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const formatCardinalityBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'one_to_many':
        return '1 : Many';
      case 'many_to_one':
        return 'Many : 1';
      case 'one_to_one':
        return '1 : 1';
      case 'many_to_many':
        return 'Many : Many';
      default:
        return type.replace('_', ' ');
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: 'Strong Match',
      };
    } else if (confidence >= 70) {
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        text: 'Possible Match',
      };
    } else {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        text: 'Weak Match',
      };
    }
  };

  const confTheme = getConfidenceBadge(rel.confidence);
  const leftEntity = formatEntityName(rel.left_dataset);
  const rightEntity = formatEntityName(rel.right_dataset);

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border p-5 sm:p-6 transition-all shadow-xs relative flex flex-col justify-between',
        rel.status === 'accepted'
          ? 'border-emerald-500/80 dark:border-emerald-500/80 ring-2 ring-emerald-500/10 dark:ring-emerald-500/20 bg-emerald-50/[0.03] dark:bg-emerald-950/[0.1]'
          : rel.status === 'rejected'
          ? 'border-slate-300 dark:border-slate-800 opacity-60 bg-slate-50/60 dark:bg-slate-800/40'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
      )}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {leftEntity} → {rightEntity}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Confidence Badge */}
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5',
                confTheme.badge
              )}
            >
              <span>Confidence {rel.confidence}%</span>
              <span className="opacity-70">({rel.match_level})</span>
            </span>

            {/* Status indicator */}
            {rel.status === 'accepted' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                Accepted
              </span>
            )}
            {rel.status === 'rejected' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                <X className="w-3.5 h-3.5" />
                Rejected
              </span>
            )}
            {rel.status === 'suggested' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Suggested
              </span>
            )}
          </div>
        </div>

        {/* Column linking visualization */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 my-4">
          {/* Left Column Box */}
          <div className="p-3 bg-slate-50/90 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate" title={rel.left_dataset}>
              {rel.left_dataset}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5 truncate" title={rel.left_column}>
              {rel.left_column}
            </div>
            <div className="mt-1">
              {rel.signals.left_unique ? (
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Unique (1)
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                  Repeated (Many)
                </span>
              )}
            </div>
          </div>

          {/* Connector Badge */}
          <div className="flex sm:flex-col items-center justify-center gap-1 py-1">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs whitespace-nowrap">
              {formatCardinalityBadge(rel.relationship_type)}
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden sm:block mt-0.5" />
          </div>

          {/* Right Column Box */}
          <div className="p-3 bg-slate-50/90 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate" title={rel.right_dataset}>
              {rel.right_dataset}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5 truncate" title={rel.right_column}>
              {rel.right_column}
            </div>
            <div className="mt-1">
              {rel.signals.right_unique ? (
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Unique (1)
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                  Repeated (Many)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Why this relationship was detected */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Why this relationship was detected:
          </h5>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {rel.explanation.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Expandable "View Detection Details" */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{showDetails ? 'Hide Detection Details' : 'View Detection Details'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs animate-in fade-in duration-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Name Similarity</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {Math.round(rel.signals.name_similarity * 100)}%
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Value Overlap</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {Math.round(rel.signals.value_overlap * 100)}% ({rel.signals.overlap_unique_values.toLocaleString()} values)
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Data Type Compatibility</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {rel.signals.type_compatible ? 'Compatible' : 'Incompatible'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Unique Key Status</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 text-[11px] leading-tight">
                  Left: {rel.signals.left_unique ? 'Unique (1)' : 'Repeated (Many)'} <br />
                  Right: {rel.signals.right_unique ? 'Unique (1)' : 'Repeated (Many)'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Null Percentage</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 text-[11px] leading-tight">
                  Left: {(rel.signals.left_null_rate * 100).toFixed(1)}% <br />
                  Right: {(rel.signals.right_null_rate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Cardinality</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatCardinalityBadge(rel.relationship_type)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all',
              rel.status === 'accepted'
                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{rel.status === 'accepted' ? 'Accepted' : 'Accept'}</span>
          </button>

          <button
            type="button"
            onClick={onReject}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all',
              rel.status === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/20'
                : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300'
            )}
          >
            <X className="w-3.5 h-3.5" />
            <span>{rel.status === 'rejected' ? 'Rejected' : 'Reject'}</span>
          </button>
        </div>

        {rel.status !== 'suggested' && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

interface MultiDatasetWorkspaceViewProps {
  multiDatasetProfile: MultiDatasetProfileResponse;
  onReupload: () => void;
}

export function MultiDatasetWorkspaceView({
  multiDatasetProfile,
  onReupload,
}: MultiDatasetWorkspaceViewProps) {
  const { datasets, dataset_count } = multiDatasetProfile;
  const {
    relationships,
    isDetectingRelationships,
    detectRelationshipsError,
    hasDetectedRelationships,
    detectRelationships,
    updateRelationshipStatus,
    dataModel,
    isBuildingDataModel,
    dataModelError,
    buildDataModel,
    crossAnalytics,
    fetchCrossDatasetAnalytics,
    selectedDatasetId: contextSelectedDatasetId,
    selectDataset,
  } = useDataset();

  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'workspace' | 'datamodel' | 'cross-analytics'>(
    crossAnalytics ? 'cross-analytics' : dataModel ? 'datamodel' : 'workspace'
  );
  const currentSelectedId = contextSelectedDatasetId || (datasets.length > 0 ? datasets[0].dataset_id : '');
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const activeDataset: MultiDatasetProfileItem | undefined =
    datasets.find((d) => d.dataset_id === currentSelectedId) || datasets[0];

  const handleSelectDataset = (id: string) => {
    selectDataset(id);
  };

  const acceptedRelationships = relationships.filter((r) => r.status === 'accepted');

  // Helper for file type icon
  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (lower.endsWith('.json')) {
      return <FileCode className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-slate-500 shrink-0" />;
  };

  // Helper for semantic badge
  const getSemanticBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'numeric':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
            <Hash className="w-3 h-3 text-blue-500" />
            Numeric
          </span>
        );
      case 'categorical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
            <Tag className="w-3 h-3 text-purple-500" />
            Categorical
          </span>
        );
      case 'datetime':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
            <Calendar className="w-3 h-3 text-amber-500" />
            Datetime
          </span>
        );
      case 'boolean':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200/80">
            <ToggleLeft className="w-3 h-3 text-teal-500" />
            Boolean
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Type className="w-3 h-3 text-slate-500" />
            Text
          </span>
        );
    }
  };

  // Color styling for quality score
  const getQualityTheme = (label: string) => {
    switch (label.toLowerCase()) {
      case 'excellent':
        return {
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: 'text-emerald-700',
          bar: 'bg-emerald-500',
        };
      case 'good':
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          text: 'text-blue-700',
          bar: 'bg-blue-500',
        };
      case 'needs attention':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          text: 'text-amber-700',
          bar: 'bg-amber-500',
        };
      default:
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          text: 'text-rose-700',
          bar: 'bg-rose-500',
        };
    }
  };

  // Filter columns for active dataset
  const filteredColumns = React.useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.profile.columns.filter((col) => {
      const matchesSearch = col.name.toLowerCase().includes(columnSearch.toLowerCase());
      const matchesType =
        selectedTypeFilter === 'all' || col.semantic_type.toLowerCase() === selectedTypeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [activeDataset, columnSearch, selectedTypeFilter]);

  if (!activeDataset) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Workspace Sub-Navigation Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('workspace')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
              viewMode === 'workspace'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            )}
          >
            <Network className="w-4 h-4" />
            <span>Relationships & Profiling</span>
            {hasDetectedRelationships && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  viewMode === 'workspace'
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                {relationships.length}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={acceptedRelationships.length === 0 && !dataModel}
            onClick={async () => {
              if (!dataModel && acceptedRelationships.length > 0) {
                await buildDataModel();
              }
              setViewMode('datamodel');
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
              viewMode === 'datamodel'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : acceptedRelationships.length === 0 && !dataModel
                ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            )}
            title={acceptedRelationships.length === 0 && !dataModel ? 'Requires accepted relationships between datasets' : undefined}
          >
            <Database className="w-4 h-4" />
            <span>Data Model</span>
            {dataModel ? (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                  viewMode === 'datamodel'
                    ? 'bg-blue-700/80 text-blue-100 border-blue-600'
                    : dataModel.status === 'valid'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                )}
              >
                {dataModel.relationships.length} Join{dataModel.relationships.length === 1 ? '' : 's'}
              </span>
            ) : acceptedRelationships.length === 0 ? (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                (No joins)
              </span>
            ) : null}
          </button>
          <button
            type="button"
            disabled={acceptedRelationships.length === 0 && !crossAnalytics}
            onClick={async () => {
              if (!crossAnalytics) {
                await fetchCrossDatasetAnalytics();
              }
              setViewMode('cross-analytics');
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
              viewMode === 'cross-analytics'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : acceptedRelationships.length === 0 && !crossAnalytics
                ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            )}
            title={acceptedRelationships.length === 0 && !crossAnalytics ? 'Requires accepted relationships between datasets' : undefined}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Combined Analytics</span>
            {crossAnalytics && crossAnalytics.groups.length > 0 ? (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                  viewMode === 'cross-analytics'
                    ? 'bg-blue-700/80 text-blue-100 border-blue-600'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                )}
              >
                {crossAnalytics.groups[0].kpis.length} KPIs
              </span>
            ) : acceptedRelationships.length === 0 ? (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                (Unavailable)
              </span>
            ) : null}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReupload}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Upload Different Files</span>
          </button>
        </div>
      </div>

      {/* Active Dataset Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
              Active Dataset ({datasets.length} Total)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={activeDataset.dataset_id}
                onChange={(e) => handleSelectDataset(e.target.value)}
                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                {datasets.map((ds) => (
                  <option key={ds.dataset_id} value={ds.dataset_id}>
                    {ds.filename} ({formatNumber(ds.rows)} rows, {ds.columns} cols)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => {
              selectDataset(activeDataset.dataset_id);
              navigate('/dataset/overview');
            }}
            className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
          >
            <span>View {activeDataset.filename} Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {viewMode === 'cross-analytics' ? (
        <CrossDatasetAnalyticsView
          onBackToDataModel={() => setViewMode('datamodel')}
          onBackToRelationships={() => setViewMode('workspace')}
          onReupload={onReupload}
        />
      ) : viewMode === 'datamodel' ? (
        <DataModelView
          onBackToRelationships={() => setViewMode('workspace')}
          onContinueToAnalytics={() => setViewMode('cross-analytics')}
          onReupload={onReupload}
        />
      ) : (
        <>
          {/* Top Banner: Notice & Relationship Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  Relationships
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                  Datasets: {dataset_count}
                </span>
                {hasDetectedRelationships && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                    {relationships.length} connection candidate{relationships.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {hasDetectedRelationships
                  ? relationships.length > 0
                    ? 'We found possible connections between your datasets.'
                    : 'Relationship analysis complete for uploaded datasets.'
                  : 'Detect possible connections and shared keys between your datasets.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
            {/* Detect Relationships Button */}
            <button
              type="button"
              onClick={detectRelationships}
              disabled={isDetectingRelationships}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer',
                isDetectingRelationships
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {isDetectingRelationships ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing relationships...</span>
                </>
              ) : hasDetectedRelationships ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-detect Relationships</span>
                </>
              ) : (
                <>
                  <Network className="w-3.5 h-3.5" />
                  <span>Detect Relationships</span>
                </>
              )}
            </button>

            {dataModel && (
              <button
                type="button"
                onClick={() => setViewMode('datamodel')}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>View Data Model ({dataModel.relationships.length})</span>
              </button>
            )}

            <button
              onClick={onReupload}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Upload Different Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* RELATIONSHIPS SECTION */}
      {/* 1. Loading State */}
      {isDetectingRelationships && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
              Analyzing relationships...
            </h4>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Comparing column names, checking data types, evaluating key uniqueness (1 : Many / 1 : 1), and calculating value overlap across all uploaded datasets.
            </p>
          </div>
        </div>
      )}

      {/* 2. Error State */}
      {detectRelationshipsError && !isDetectingRelationships && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{detectRelationshipsError}</span>
          </div>
          <button
            onClick={detectRelationships}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Pre-detection prompt card */}
      {!hasDetectedRelationships && !isDetectingRelationships && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  Ready to Detect Relationships
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                  Our relationship engine evaluates candidate keys across your {datasets.length} datasets, inspecting column names, compatible data types, uniqueness (1 : Many, 1 : 1), and actual value overlaps.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={detectRelationships}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Network className="w-4 h-4" />
              <span>Detect Relationships</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Detected Relationships Cards */}
      {hasDetectedRelationships && !isDetectingRelationships && relationships.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Candidate Relationships ({relationships.length})
            </h4>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Review each candidate and choose Accept or Reject
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relationships.map((rel) => (
              <RelationshipCard
                key={rel.relationship_id}
                rel={rel}
                onAccept={() => updateRelationshipStatus(rel.relationship_id, 'accepted')}
                onReject={() => updateRelationshipStatus(rel.relationship_id, 'rejected')}
                onReset={() => updateRelationshipStatus(rel.relationship_id, 'suggested')}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. Accepted Relationships Summary Section */}
      {acceptedRelationships.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Selected Relationships
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                  {acceptedRelationships.length} relationship{acceptedRelationships.length === 1 ? '' : 's'} selected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                These relationships have been accepted for your combined data model.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  const res = await buildDataModel();
                  if (res) {
                    setViewMode('datamodel');
                  }
                }}
                disabled={isBuildingDataModel}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isBuildingDataModel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Building Data Model...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Data Model</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                Build and validate schema from {acceptedRelationships.length} accepted relationship{acceptedRelationships.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {dataModelError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{dataModelError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
            {acceptedRelationships.map((rel) => (
              <div
                key={rel.relationship_id}
                className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate block">
                    {rel.left_dataset}.{rel.left_column}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium my-0.5">
                    <span>↓</span>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200/80 dark:border-emerald-800">
                      {rel.relationship_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate block">
                    {rel.right_dataset}.{rel.right_column}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 shrink-0">
                  {rel.confidence}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. No Relationships Case */}
      {hasDetectedRelationships && !isDetectingRelationships && relationships.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="max-w-md mx-auto">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block mb-2">
              {datasets.length} independent datasets
            </span>
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              No relationships detected
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              We evaluated candidate column names, compatible data types, and value overlaps across your datasets, but found no shared foreign key connections.
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">
              These datasets can still be analyzed independently.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                selectDataset(activeDataset.dataset_id);
                navigate('/dataset/overview');
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span>Explore Individual Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dataset Summary Cards Grid */}
      <div id="individual-datasets-section" className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Uploaded Datasets Overview ({datasets.length})
          </h4>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Click a card to inspect schema & data preview</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((ds) => {
            const isSelected = ds.dataset_id === activeDataset.dataset_id;
            const qualityTheme = getQualityTheme(ds.profile.quality.label);

            return (
              <div
                key={ds.dataset_id}
                onClick={() => handleSelectDataset(ds.dataset_id)}
                className={cn(
                  'bg-white dark:bg-slate-900 rounded-xl border p-4.5 cursor-pointer transition-all text-left shadow-xs flex flex-col justify-between relative',
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/10 dark:ring-blue-500/20 shadow-sm'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Selected</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5">
                    {getFileIcon(ds.filename)}
                    <div className="min-w-0 pr-16">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={ds.filename}>
                        {ds.filename}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                        ID: {ds.dataset_id}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Rows</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{formatNumber(ds.rows)}</p>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Columns</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{ds.columns}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Quality:</span>
                    <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium border', qualityTheme.badge)}>
                      {ds.profile.quality.score}% {ds.profile.quality.label}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {formatBytes(ds.profile.file.size_bytes)}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectDataset(ds.dataset_id);
                      navigate('/dataset/overview');
                    }}
                    className="w-full py-1.5 px-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Explore Full Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Individual Dataset Inspector */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Inspector Header with Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {activeDataset.dataset_id}
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {activeDataset.filename} Details
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review schema columns, missing values, duplicates, and data samples
            </p>
          </div>

          {/* Dataset Tabs & Action Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5">
              {datasets.map((ds) => {
                const isSelected = ds.dataset_id === activeDataset.dataset_id;
                return (
                  <button
                    key={ds.dataset_id}
                    onClick={() => handleSelectDataset(ds.dataset_id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    <span>{ds.filename}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded text-[10px]',
                        isSelected ? 'bg-blue-700/60 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {formatNumber(ds.rows)}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                selectDataset(activeDataset.dataset_id);
                navigate('/dataset/overview');
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer ml-1"
            >
              <span>Explore Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Dataset KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <KPICard
            label="Total Rows"
            value={formatNumber(activeDataset.rows)}
            subtitle={
              activeDataset.profile.dataset.duplicate_rows > 0
                ? `${formatNumber(activeDataset.profile.dataset.duplicate_rows)} duplicates`
                : 'Zero duplicate rows'
            }
            icon={Layers}
            iconBgColor="bg-blue-50 dark:bg-blue-950/60"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <KPICard
            label="Total Columns"
            value={String(activeDataset.columns)}
            subtitle={`${activeDataset.profile.summary.numeric_columns.length} num • ${activeDataset.profile.summary.categorical_columns.length} cat`}
            icon={Columns}
            iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
            iconColor="text-indigo-600 dark:text-indigo-400"
          />
          <KPICard
            label="Missing Values"
            value={`${activeDataset.profile.summary.missing_value_percentage}%`}
            subtitle={`${formatNumber(activeDataset.profile.summary.total_missing_values)} missing cells`}
            icon={AlertTriangle}
            iconBgColor="bg-amber-50 dark:bg-amber-950/60"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <KPICard
            label="Duplicate Rows"
            value={formatNumber(activeDataset.profile.dataset.duplicate_rows)}
            subtitle={`${activeDataset.profile.dataset.duplicate_percentage}% redundancy`}
            icon={Database}
            iconBgColor="bg-slate-100 dark:bg-slate-800"
            iconColor="text-slate-600 dark:text-slate-400"
          />
          <KPICard
            label="Data Score"
            value={`${activeDataset.profile.quality.score}%`}
            subtitle={`Rating: ${activeDataset.profile.quality.label}`}
            icon={CheckCircle2}
            iconBgColor={activeDataset.profile.quality.score >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-amber-50 dark:bg-amber-950/60'}
            iconColor={activeDataset.profile.quality.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
          />
        </div>

        {/* Column Intelligence Table */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                Column Intelligence ({activeDataset.profile.columns.length} columns)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Semantic classification, non-null counts, and distinct value distributions
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter column..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>

              <div className="flex items-center gap-1">
                {['all', 'numeric', 'categorical', 'datetime', 'boolean', 'text'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTypeFilter(t)}
                    className={cn(
                      'px-2 py-1 text-[11px] font-medium rounded-lg capitalize transition-colors cursor-pointer',
                      selectedTypeFilter === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
                <tr className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/80">Column Name</th>
                  <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/80">Semantic Type</th>
                  <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/80 text-right">Missing</th>
                  <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/80 text-right">Unique</th>
                  <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/80">Summary / Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredColumns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No columns match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredColumns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{col.name}</span>
                          {col.null_count === activeDataset.rows && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              Empty
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getSemanticBadge(col.semantic_type)}
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">({col.dtype})</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {col.null_count > 0 ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {formatNumber(col.null_count)} ({col.null_percentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">0 (0.0%)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatNumber(col.unique_count)}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {col.statistics && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                            <span>Min: {col.statistics.min}</span>
                            <span>Avg: {col.statistics.mean}</span>
                            <span>Max: {col.statistics.max}</span>
                          </div>
                        )}

                        {col.date_range && (
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {col.date_range.min ? col.date_range.min.slice(0, 10) : '—'} →{' '}
                            {col.date_range.max ? col.date_range.max.slice(0, 10) : '—'}
                          </div>
                        )}

                        {col.top_values && col.top_values.length > 0 && !col.statistics && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {col.top_values.slice(0, 3).map((tv, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                              >
                                {String(tv.value)} ({tv.percentage}%)
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 10-Row Data Preview Table */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                Dataset Preview (First 10 Rows)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Showing {Math.min(10, activeDataset.profile.preview.length)} of {formatNumber(activeDataset.rows)} rows
            </span>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
                <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center font-mono text-slate-400 dark:text-slate-500">#</th>
                  {activeDataset.profile.columns.map((col) => (
                    <th key={col.name} className="py-2.5 px-4 whitespace-nowrap">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {activeDataset.profile.preview.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeDataset.profile.columns.length + 1}
                      className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans text-xs"
                    >
                      No preview rows available.
                    </td>
                  </tr>
                ) : (
                  activeDataset.profile.preview.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-sans text-[11px]">
                        {rowIdx + 1}
                      </td>
                      {activeDataset.profile.columns.map((col) => {
                        const val = row[col.name];
                        const isNull = val === null || val === undefined;
                        return (
                          <td
                            key={col.name}
                            className={cn(
                              'py-2.5 px-4 whitespace-nowrap max-w-[220px] truncate',
                              isNull ? 'text-slate-300 dark:text-slate-600 italic' : 'text-slate-800 dark:text-slate-200'
                            )}
                            title={isNull ? 'null' : String(val)}
                          >
                            {isNull ? 'null' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
