import React, { useState } from 'react';
import {
  Database,
  Network,
  Check,
  CheckCircle2,
  X,
  AlertTriangle,
  Plus,
  Trash2,
  Key,
  Link2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  ShieldCheck,
  Eye,
  Info,
  RefreshCw,
  Table,
  HelpCircle,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';
import {
  DataModelResponse,
  DataModelRelationship,
  DataModelDataset,
  ValidateRelationshipRequest,
} from '@/types';
import { useDataset } from '@/context/DatasetContext';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface DataModelViewProps {
  onBackToRelationships: () => void;
  onContinueToAnalytics?: () => void;
  onReupload: () => void;
}

export function DataModelView({
  onBackToRelationships,
  onContinueToAnalytics,
  onReupload,
}: DataModelViewProps) {
  const {
    dataModel,
    multiDatasetProfile,
    isBuildingDataModel,
    dataModelError,
    buildDataModel,
    removeModelRelationship,
    validateAndAddManualRelationship,
    relationships,
  } = useDataset();

  // Modal / drawer states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [relToRemove, setRelToRemove] = useState<DataModelRelationship | null>(null);
  const [selectedRelDetail, setSelectedRelDetail] = useState<DataModelRelationship | null>(null);

  // Manual relationship builder form state
  const [leftDs, setLeftDs] = useState<string>('');
  const [leftCol, setLeftCol] = useState<string>('');
  const [rightDs, setRightDs] = useState<string>('');
  const [rightCol, setRightCol] = useState<string>('');
  const [relType, setRelType] = useState<string>('one_to_many');
  const [manualValidationMsg, setManualValidationMsg] = useState<{
    valid: boolean;
    notes: string[];
  } | null>(null);
  const [isValidatingManual, setIsValidatingManual] = useState<boolean>(false);

  const datasets = dataModel?.datasets || [];
  const modelRelationships = dataModel?.relationships || [];
  const connectedGroups = dataModel?.connected_components || [];
  const independentDatasets = dataModel?.independent_datasets || [];
  const summary = dataModel?.summary;

  // Available column lookups for manual add modal
  const leftDatasetObj = datasets.find((d) => d.filename === leftDs || d.dataset_id === leftDs);
  const rightDatasetObj = datasets.find((d) => d.filename === rightDs || d.dataset_id === rightDs);

  // Helper for cardinality badge
  const formatCardinality = (type: string) => {
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

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid':
        return {
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          text: 'Valid Model',
        };
      case 'warning':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: AlertTriangle,
          text: 'Model with Warnings',
        };
      default:
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: X,
          text: 'Validation Issues',
        };
    }
  };

  const statusTheme = getStatusBadge(dataModel?.status || 'valid');
  const StatusIcon = statusTheme.icon;

  // Handle manual relationship validation & add
  const handleValidateAndAdd = async () => {
    if (!leftDs || !leftCol || !rightDs || !rightCol) {
      setManualValidationMsg({
        valid: false,
        notes: ['Please select both datasets and both columns.'],
      });
      return;
    }

    setIsValidatingManual(true);
    setManualValidationMsg(null);

    const req: ValidateRelationshipRequest = {
      left_dataset: leftDs,
      left_column: leftCol,
      right_dataset: rightDs,
      right_column: rightCol,
      relationship_type: relType,
    };

    const res = await validateAndAddManualRelationship(req);
    setIsValidatingManual(false);
    setManualValidationMsg(res);

    if (res.valid) {
      setTimeout(() => {
        setShowAddModal(false);
        setManualValidationMsg(null);
        setLeftDs('');
        setLeftCol('');
        setRightDs('');
        setRightCol('');
      }, 1200);
    }
  };

  // Handle confirm delete relationship
  const handleConfirmRemove = async () => {
    if (!relToRemove) return;
    await removeModelRelationship(relToRemove.relationship_id);
    setRelToRemove(null);
  };

  if (!dataModel && isBuildingDataModel) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 p-12 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto animate-pulse">
          <Database className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Constructing Data Model...</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Validating schemas, column keys, cardinality rules, and value overlaps across accepted relationships.
        </p>
      </div>
    );
  }

  if (!dataModel) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs space-y-4">
        <Database className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">No Data Model Built Yet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Accept one or more suggested relationships in Phase 2, then click &ldquo;Continue to Data Model&rdquo; to validate and build your schema.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => buildDataModel()}
            disabled={isBuildingDataModel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Build Data Model Now</span>
          </button>
          <button
            onClick={onBackToRelationships}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Relationships</span>
          </button>
          <button
            onClick={onReupload}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Different Files</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Navigation */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-blue-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Data Model</h3>
                <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1', statusTheme.badge)}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusTheme.text}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  ID: {dataModel.model_id}
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Your datasets are connected through the relationships you selected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Add Relationship</span>
            </button>

            <button
              onClick={onBackToRelationships}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Review Relationships</span>
            </button>

            <button
              onClick={onReupload}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Upload Different Files</span>
            </button>

            <button
              onClick={() => {
                if (onContinueToAnalytics) {
                  onContinueToAnalytics();
                } else {
                  setShowAnalyticsModal(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs shadow-blue-500/20 cursor-pointer"
            >
              <span>Continue to Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Model Summary Compact KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <KPICard
          label="Datasets"
          value={formatNumber(summary?.dataset_count || datasets.length)}
          subtitle={`${formatNumber(independentDatasets.length)} independent`}
          icon={Layers}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <KPICard
          label="Relationships"
          value={formatNumber(summary?.relationship_count || modelRelationships.length)}
          subtitle={modelRelationships.length > 0 ? 'User confirmed' : 'Zero connections'}
          icon={Network}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />

        <KPICard
          label="Validation Status"
          value={dataModel.status === 'valid' ? 'Validated' : dataModel.status === 'warning' ? 'Warning' : 'Issues'}
          subtitle={dataModel.errors.length === 0 ? 'All constraints passed' : `${dataModel.errors.length} failed check(s)`}
          icon={ShieldCheck}
          iconBgColor={dataModel.status === 'valid' ? 'bg-emerald-50' : dataModel.status === 'warning' ? 'bg-amber-50' : 'bg-rose-50'}
          iconColor={dataModel.status === 'valid' ? 'text-emerald-600' : dataModel.status === 'warning' ? 'text-amber-600' : 'text-rose-600'}
        />

        <KPICard
          label="Connected Groups"
          value={formatNumber(summary?.connected_components || connectedGroups.length)}
          subtitle={connectedGroups.length > 1 ? 'Multiple sub-models' : connectedGroups.length === 1 ? 'Single unified model' : 'No connections'}
          icon={Database}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Warnings & Errors Alerts */}
      {dataModel.errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4.5 space-y-2 text-xs text-rose-800">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Validation Issues Detected</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-rose-700">
            {dataModel.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {dataModel.warnings.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-1.5 text-xs text-amber-800">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Model Notes & Invariants</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-amber-700">
            {dataModel.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RELATIONSHIP DIAGRAM & CONNECTED GROUPS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Data Model Schema Diagram
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Unique keys (🔑) and relationship reference keys (🔗) forming join paths
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700">
            {connectedGroups.length} Connected Component{connectedGroups.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Render each Connected Group */}
        {connectedGroups.map((group) => {
          const groupDatasets = datasets.filter((d) => group.datasets.includes(d.filename));
          const groupRels = modelRelationships.filter((r) => group.relationship_ids.includes(r.relationship_id));

          return (
            <div
              key={group.group_id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                    {group.name}
                  </h4>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {group.datasets.length} tables · {group.relationship_ids.length} relationship{group.relationship_ids.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Dataset Schema Cards Grid in this group */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupDatasets.map((ds) => (
                  <div
                    key={ds.dataset_id}
                    className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/90 dark:border-slate-700/80 overflow-hidden flex flex-col justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    {/* Table Card Header */}
                    <div className="p-3.5 bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Table className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={ds.filename}>
                          {ds.filename.replace(/\.[^/.]+$/, '').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {formatNumber(ds.rows)} rows
                      </span>
                    </div>

                    {/* Columns List */}
                    <div className="p-3 space-y-1 max-h-[220px] overflow-y-auto font-mono text-xs">
                      {ds.all_columns.map((colName) => {
                        const isUnique = ds.unique_keys.includes(colName);
                        const isRelKey = ds.relationship_keys.includes(colName);

                        return (
                          <div
                            key={colName}
                            className={cn(
                              'px-2 py-1 rounded-md text-[11px] flex items-center justify-between gap-1 transition-colors',
                              isUnique
                                ? 'bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-medium border border-amber-200/80 dark:border-amber-800'
                                : isRelKey
                                ? 'bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-medium border border-blue-200/80 dark:border-blue-800'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60'
                            )}
                          >
                            <span className="truncate" title={colName}>
                              {colName}
                            </span>

                            {isUnique && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-700 shrink-0">
                                <Key className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                                <span>Unique</span>
                              </span>
                            )}

                            {isRelKey && !isUnique && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-1 py-0.2 rounded border border-blue-200 dark:border-blue-700 shrink-0">
                                <Link2 className="w-2.5 h-2.5 text-blue-700 dark:text-blue-400" />
                                <span>Rel Key</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Table Footer */}
                    <div className="px-3 py-2 bg-white/70 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                      <span>{ds.columns} total columns</span>
                      <span>{ds.unique_keys.length + ds.relationship_keys.length} key(s)</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Relationship Links in this group */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Confirmed Relationships in this group ({groupRels.length})
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupRels.map((rel) => (
                    <div
                      key={rel.relationship_id}
                      className={cn(
                        'p-4 rounded-xl border text-xs transition-all flex flex-col justify-between shadow-2xs',
                        rel.validation_status === 'invalid'
                          ? 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900'
                          : rel.validation_status === 'warning'
                          ? 'bg-amber-50/40 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <div>
                        {/* Top Link Info */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                            <span>{rel.left_dataset}</span>
                            <span className="text-slate-400 dark:text-slate-500">→</span>
                            <span>{rel.right_dataset}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                              {formatCardinality(rel.relationship_type)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                              {rel.confidence}%
                            </span>
                          </div>
                        </div>

                        {/* Column Pair Diagram */}
                        <div className="flex items-center justify-between gap-2 my-2.5 text-xs font-mono">
                          <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700 min-w-0 flex-1 truncate">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{rel.left_dataset}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">{rel.left_column}</span>
                          </div>

                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">──▶</span>

                          <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700 min-w-0 flex-1 truncate text-right">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{rel.right_dataset}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">{rel.right_column}</span>
                          </div>
                        </div>

                        {/* Validation notes */}
                        {rel.validation_notes.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 my-1">
                            {rel.validation_notes.map((note, idx) => (
                              <p key={idx} className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{note}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons on edge */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedRelDetail(rel)}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRelToRemove(rel)}
                          className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* 0 Connected Groups Case */}
        {connectedGroups.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
              <Network className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No Connected Groups</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              None of your uploaded datasets currently have confirmed relationships. You can accept suggestions from the relationship detector or add relationships manually.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Relationship Manually</span>
              </button>
              <button
                onClick={onBackToRelationships}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
              >
                Review Suggestions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INDEPENDENT / ORPHAN DATASETS SECTION */}
      {independentDatasets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  Independent Datasets ({independentDatasets.length})
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                These datasets have no confirmed relationships and can still be analyzed individually.
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Zero relationships
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {independentDatasets.map((ds) => (
              <div
                key={ds.dataset_id}
                className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate" title={ds.filename}>
                      {ds.filename}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rows</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(ds.rows)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Columns</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{ds.columns}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Independent Dataset
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DATA MODEL PREVIEW & SUMMARY CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h4 className="text-base font-bold tracking-tight">Data Model Ready for Analytics</h4>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {datasets.length} datasets structured across {connectedGroups.length} connected component{connectedGroups.length === 1 ? '' : 's'}. Relationships are validated and ready to power cross-dataset intelligence.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onContinueToAnalytics) {
                onContinueToAnalytics();
              } else {
                setShowAnalyticsModal(true);
              }
            }}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <span>Continue to Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Visual link chain */}
        {connectedGroups.length > 0 && (
          <div className="p-3 bg-white/10 rounded-xl text-xs text-slate-200 font-mono flex items-center gap-2 flex-wrap">
            <span className="text-indigo-300 font-sans font-bold">Connected:</span>
            {connectedGroups.map((g, idx) => (
              <span key={g.group_id} className="bg-white/10 px-2.5 py-1 rounded-lg">
                {g.datasets.map((d) => d.replace(/\.[^/.]+$/, '')).join(' ──▶ ')}
                {idx < connectedGroups.length - 1 && ' | '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD RELATIONSHIP MANUALLY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Add Relationship Manually</h4>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setManualValidationMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Define a join relationship between two datasets. The engine will validate column existence, data type compatibility, and cardinality.
            </p>

            <div className="space-y-3 text-xs">
              {/* Dataset A */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Source Table (Left)</label>
                  <select
                    value={leftDs}
                    onChange={(e) => {
                      setLeftDs(e.target.value);
                      setLeftCol('');
                    }}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Select Dataset</option>
                    {datasets.map((d) => (
                      <option key={d.dataset_id} value={d.filename}>
                        {d.filename}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Source Column</label>
                  <select
                    value={leftCol}
                    onChange={(e) => setLeftCol(e.target.value)}
                    disabled={!leftDs}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs disabled:opacity-50"
                  >
                    <option value="">Select Column</option>
                    {leftDatasetObj?.all_columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cardinality */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cardinality</label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="one_to_many">1 : Many (Parent to Child)</option>
                  <option value="many_to_one">Many : 1 (Child to Parent)</option>
                  <option value="one_to_one">1 : 1 (One to One)</option>
                  <option value="many_to_many">Many : Many</option>
                </select>
              </div>

              {/* Dataset B */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Table (Right)</label>
                  <select
                    value={rightDs}
                    onChange={(e) => {
                      setRightDs(e.target.value);
                      setRightCol('');
                    }}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Select Dataset</option>
                    {datasets.map((d) => (
                      <option key={d.dataset_id} value={d.filename}>
                        {d.filename}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Column</label>
                  <select
                    value={rightCol}
                    onChange={(e) => setRightCol(e.target.value)}
                    disabled={!rightDs}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs disabled:opacity-50"
                  >
                    <option value="">Select Column</option>
                    {rightDatasetObj?.all_columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Validation feedback */}
            {manualValidationMsg && (
              <div
                className={cn(
                  'p-3 rounded-xl border text-xs',
                  manualValidationMsg.valid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                )}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {manualValidationMsg.valid ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{manualValidationMsg.valid ? 'Relationship Validated & Added' : 'Validation Failed'}</span>
                </div>
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px]">
                  {manualValidationMsg.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleValidateAndAdd}
                disabled={isValidatingManual || !leftDs || !leftCol || !rightDs || !rightCol}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                {isValidatingManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Validate & Add</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM REMOVE RELATIONSHIP */}
      {relToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900">Remove Relationship?</h4>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove the link between{' '}
              <strong className="text-slate-900">
                {relToRemove.left_dataset}.{relToRemove.left_column}
              </strong>{' '}
              and{' '}
              <strong className="text-slate-900">
                {relToRemove.right_dataset}.{relToRemove.right_column}
              </strong>
              ?
            </p>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              This will only remove the connection from your Data Model. Your uploaded datasets will remain untouched.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setRelToRemove(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
              >
                Remove Relationship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELATIONSHIP DETAILS */}
      {selectedRelDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Relationship Details</h4>
              </div>
              <button onClick={() => setSelectedRelDetail(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Source Table</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedRelDetail.left_dataset}</p>
                <p className="font-mono text-blue-700 mt-1">{selectedRelDetail.left_column}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Target Table</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedRelDetail.right_dataset}</p>
                <p className="font-mono text-blue-700 mt-1">{selectedRelDetail.right_column}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cardinality</span>
                <span className="font-bold text-slate-800">{formatCardinality(selectedRelDetail.relationship_type)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Confidence Score</span>
                <span className="font-bold text-emerald-700">{selectedRelDetail.confidence}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Validation Status</span>
                <span className="font-bold text-slate-800 capitalize">{selectedRelDetail.validation_status}</span>
              </div>
            </div>

            {selectedRelDetail.validation_notes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Validation Notes</span>
                <ul className="text-xs text-slate-600 space-y-1">
                  {selectedRelDetail.validation_notes.map((note, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRelDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PHASE 4 ANALYTICS TRANSITION PLACEHOLDER */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-blue-600 pb-2 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Phase 4 Cross-Dataset Analytics Workspace</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your multi-dataset Data Model has been validated and confirmed. Phase 4 will use this relationship graph to compute cross-table metrics, unified KPIs, merged drill-downs, and customer/product insights across all connected tables without duplicating memory.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Data Model Structure: {dataModel.summary.dataset_count} tables, {dataModel.summary.relationship_count} joins confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Status: {dataModel.status.toUpperCase()} (Ready for Phase 4 Analytics Engine)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Back to Data Model
              </button>
              {onContinueToAnalytics && (
                <button
                  onClick={() => {
                    setShowAnalyticsModal(false);
                    onContinueToAnalytics();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
                >
                  <span>Open Cross-Dataset Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
