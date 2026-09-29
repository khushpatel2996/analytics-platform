import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  Circle,
  Database,
  Layers,
  Columns,
  Calendar,
  Hash,
  Tag,
  Type,
  ToggleLeft,
  Trash2,
  Search,
  Check,
  Percent,
  ArrowRight,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { DatasetProfileResponse, ColumnProfile } from '@/types';
import { PageContainer } from '@/components/layout/PageContainer';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatNumber, formatBytes } from '@/utils/formatting';
import { useDataset } from '@/context/DatasetContext';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json'];

export function UploadAnalytics() {
  const navigate = useNavigate();
  const {
    profile: profileData,
    selectedFile,
    status,
    setUploadedFile,
    startAnalyzing,
    setAnalyzed,
    resetDataset,
  } = useDataset();


  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  const ANALYSIS_STEPS = [
    'Reading data and initializing pipeline',
    'Understanding columns and semantic roles',
    'Calculating statistics and distributions',
    'Detecting patterns, correlations & anomalies',
    'Building dynamic analytics & insights',
    'Preparing your tailored analytics workspace',
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setAnalysisStep(0);
      interval = setInterval(() => {
        setAnalysisStep((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
      }, 650);
    } else {
      setAnalysisStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Column Intelligence filters
  const [columnSearch, setColumnSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates file format and size
   */
  const validateFile = (file: File): string | null => {
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      return 'Unsupported file type. Please upload a CSV, XLSX, XLS, or JSON file.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${formatBytes(file.size)}). Maximum allowed size is 50 MB.`;
    }

    if (file.size === 0) {
      return 'The selected file is empty (0 bytes). Please upload a valid dataset.';
    }

    return null;
  };

  /**
   * Handles user file selection
   */
  const handleFileSelection = (file: File) => {
    setApiError(null);
    const error = validateFile(file);
    if (error) {
      setFileValidationError(error);
      setUploadedFile(null);
    } else {
      setFileValidationError(null);
      setUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    resetDataset();
    setFileValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyzeDataset = async () => {
    if (!selectedFile) return;

    setLoading(true);
    startAnalyzing();
    setApiError(null);

    try {
      const response = await apiService.uploadAndAnalyzeDataset(selectedFile);
      setAnalyzed(response.profile, response.modules, response);
      navigate('/dataset/overview');
    } catch (err: any) {
      setApiError(err.message || 'Unable to analyze this dataset. Please check the file and try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleAnalyzeAnother = () => {
    resetDataset();
    setFileValidationError(null);
    setApiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper for file type icon
  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />;
    }
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />;
    }
    if (lower.endsWith('.json')) {
      return <FileCode className="w-8 h-8 text-blue-600 shrink-0" />;
    }
    return <FileText className="w-8 h-8 text-slate-500 shrink-0" />;
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

  // Filtered columns for Column Intelligence table
  const filteredColumns = useMemo(() => {
    if (!profileData) return [];
    return profileData.columns.filter((col) => {
      const matchesSearch = col.name.toLowerCase().includes(columnSearch.toLowerCase());
      const matchesType =
        selectedTypeFilter === 'all' || col.semantic_type.toLowerCase() === selectedTypeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [profileData, columnSearch, selectedTypeFilter]);

  // Overall date bounds across any detected datetime columns
  const detectedDateRange = useMemo(() => {
    if (!profileData) return null;
    const dateCols = profileData.columns.filter((c) => c.date_range && (c.date_range.min || c.date_range.max));
    if (dateCols.length === 0) return null;
    return dateCols[0].date_range;
  }, [profileData]);

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

  return (
    <PageContainer>
      {/* API Error Notification */}
      {apiError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-800 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-900">Analysis Error</h4>
              <p className="text-xs text-rose-700 mt-0.5">{apiError}</p>
            </div>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 hover:text-rose-700 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Area Card (hidden when results are shown unless re-uploading) */}
      {!profileData && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl mx-auto text-center mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Analyze Your Own Dataset
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-normal">
              Upload a CSV, Excel, or JSON dataset and let the platform automatically profile your data.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer',
              isDragging
                ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
                : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/70',
              loading && 'pointer-events-none opacity-60'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv, .xlsx, .xls, .json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h4 className="text-sm font-semibold text-slate-800">
              Drag & drop your file here
            </h4>
            <p className="text-xs text-slate-500 mt-1">or browse from your computer</p>

            <button
              type="button"
              className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </button>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <span>Supported formats:</span>
              <span className="font-semibold text-slate-600">CSV • XLSX • XLS • JSON</span>
              <span>(Max 50 MB)</span>
            </div>
          </div>

          {/* Validation Error Message */}
          {fileValidationError && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-800 flex items-center gap-2.5 text-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{fileValidationError}</span>
            </div>
          )}

          {/* File Selection Card & Analyze Button */}
          {selectedFile && !fileValidationError && (
            <div className="mt-6 p-4.5 bg-slate-50/90 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                {getFileIcon(selectedFile.name)}
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {selectedFile.name.split('.').pop()?.toUpperCase()} • {formatBytes(selectedFile.size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={loading}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzeDataset}
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing dataset...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Dataset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progressive Checklist Loading Indicator */}
          {loading && (
            <div className="mt-6 p-6 bg-slate-50 border border-slate-200/90 rounded-xl shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Analyzing {selectedFile?.name}...
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Step {analysisStep + 1} of {ANALYSIS_STEPS.length}: {ANALYSIS_STEPS[analysisStep]}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                  {Math.round(((analysisStep + 1) / ANALYSIS_STEPS.length) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {ANALYSIS_STEPS.map((step, idx) => {
                  const isDone = idx < analysisStep;
                  const isCurrent = idx === analysisStep;
                  return (
                    <div
                      key={step}
                      className={cn(
                        'flex items-center gap-2.5 text-xs py-1 transition-colors',
                        isDone
                          ? 'text-emerald-700 font-medium'
                          : isCurrent
                          ? 'text-blue-700 font-semibold'
                          : 'text-slate-400'
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Results Section */}
      {profileData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Success Indicator & Analyze Another Action */}
          <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-emerald-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Dataset Analyzed Successfully</h4>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {profileData.file.name} • {formatNumber(profileData.dataset.rows)} rows profiled across {profileData.dataset.columns} columns
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/dataset/overview"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs shadow-blue-500/20 transition-colors"
              >
                <span>Explore Overview Module</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={handleAnalyzeAnother}
                className="px-3.5 py-2 bg-white hover:bg-emerald-100/50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upload Another</span>
              </button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              label="Rows"
              value={formatNumber(profileData.dataset.rows)}
              subtitle={
                profileData.dataset.duplicate_rows > 0
                  ? `${formatNumber(profileData.dataset.duplicate_rows)} (${profileData.dataset.duplicate_percentage}%) duplicates`
                  : 'Zero duplicate rows'
              }
              icon={Layers}
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
            <KPICard
              label="Columns"
              value={String(profileData.dataset.columns)}
              subtitle={`${profileData.summary.numeric_columns.length} numeric • ${profileData.summary.categorical_columns.length} categorical`}
              icon={Columns}
              iconBgColor="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <KPICard
              label="Missing Values"
              value={`${profileData.summary.missing_value_percentage}%`}
              subtitle={`${formatNumber(profileData.summary.total_missing_values)} / ${formatNumber(profileData.summary.total_cells)} cells`}
              icon={AlertTriangle}
              iconBgColor="bg-amber-50"
              iconColor="text-amber-600"
            />
            <KPICard
              label="Duplicate Rows"
              value={formatNumber(profileData.dataset.duplicate_rows)}
              subtitle={`${profileData.dataset.duplicate_percentage}% row redundancy`}
              icon={Database}
              iconBgColor="bg-slate-100"
              iconColor="text-slate-600"
            />
            <KPICard
              label="Data Score"
              value={`${profileData.quality.score}%`}
              subtitle={`Rating: ${profileData.quality.label}`}
              icon={CheckCircle2}
              iconBgColor={profileData.quality.score >= 75 ? 'bg-emerald-50' : 'bg-amber-50'}
              iconColor={profileData.quality.score >= 75 ? 'text-emerald-600' : 'text-amber-600'}
            />
          </div>

          {/* Middle Row: Dataset Information & Data Quality Assessment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dataset Information */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
                      Dataset Information
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Overview of uploaded file dimensions, memory consumption, and coverage
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider">
                    {profileData.file.extension.replace('.', '')} File
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">File Name</span>
                    <p className="font-semibold text-slate-900 truncate mt-1" title={profileData.file.name}>
                      {profileData.file.name}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">File Size</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {formatBytes(profileData.file.size_bytes)} ({profileData.file.size_mb} MB)
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Memory In-RAM</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {profileData.dataset.memory_usage_mb} MB
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Grid Cells</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {formatNumber(profileData.summary.total_cells)} cells
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Empty Columns</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {profileData.summary.empty_column_count > 0 ? (
                        <span className="text-amber-600 font-bold">
                          {profileData.summary.empty_column_count} ({profileData.summary.empty_columns.join(', ')})
                        </span>
                      ) : (
                        'None (0 empty)'
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Date Span</span>
                    <p className="font-semibold text-slate-900 mt-1 truncate" title={detectedDateRange?.min && detectedDateRange?.max ? `${detectedDateRange.min} → ${detectedDateRange.max}` : 'No date column'}>
                      {detectedDateRange?.min && detectedDateRange?.max
                        ? `${detectedDateRange.min.slice(0, 10)} to ${detectedDateRange.max.slice(0, 10)}`
                        : 'None detected'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Semantic Distribution Badges */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Column Breakdown:</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-200/70">
                  {profileData.summary.numeric_columns.length} Numeric
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[11px] border border-purple-200/70">
                  {profileData.summary.categorical_columns.length} Categorical
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium text-[11px] border border-amber-200/70">
                  {profileData.summary.datetime_columns.length} Datetime
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-medium text-[11px] border border-teal-200/70">
                  {profileData.summary.boolean_columns.length} Boolean
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                  {profileData.summary.text_columns.length} Free Text
                </span>
              </div>
            </div>

            {/* Data Quality Card */}
            {(() => {
              const theme = getQualityTheme(profileData.quality.label);
              return (
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
                          Data Quality Score
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Calculated from missingness, duplicates, and completeness
                        </p>
                      </div>
                      <span className={cn('px-2.5 py-1 rounded-md text-[11px] font-bold border', theme.badge)}>
                        {profileData.quality.label}
                      </span>
                    </div>

                    {/* Prominent Score Gauge */}
                    <div className="my-5 text-center">
                      <div className={cn('text-4xl sm:text-5xl font-black tracking-tight leading-none', theme.text)}>
                        {profileData.quality.score}%
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">Preliminary Quality Indicator</p>

                      <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                        <div
                          className={cn('h-2.5 rounded-full transition-all duration-500', theme.bar)}
                          style={{ width: `${Math.min(100, Math.max(0, profileData.quality.score))}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Factors */}
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500">Cell Completeness</span>
                        <span className="font-semibold text-slate-800">
                          {(100 - profileData.summary.missing_value_percentage).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500">Row Uniqueness</span>
                        <span className="font-semibold text-slate-800">
                          {(100 - profileData.dataset.duplicate_percentage).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                        <span className="text-slate-500">Usable Columns</span>
                        <span className="font-semibold text-slate-800">
                          {profileData.dataset.columns - profileData.summary.empty_column_count} / {profileData.dataset.columns}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-4 leading-relaxed italic">
                    Scoring considers missing cell ratio, redundant rows, and empty columns.
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Column Intelligence Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
                  Column Intelligence
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semantic detection, missing value distribution, and statistical metrics per column
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search column..."
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'numeric', 'categorical', 'datetime', 'boolean', 'text'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTypeFilter(t)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors',
                        selectedTypeFilter === t
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Column Name</th>
                    <th className="py-2.5 px-4">Detected Type</th>
                    <th className="py-2.5 px-4 text-right">Missing Values</th>
                    <th className="py-2.5 px-4 text-right">Unique Values</th>
                    <th className="py-2.5 px-4">Statistical Summary & Values Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredColumns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No columns match the search or type filter.
                      </td>
                    </tr>
                  ) : (
                    filteredColumns.map((col) => (
                      <tr key={col.name} className="hover:bg-slate-50/70 transition-colors">
                        {/* Column Name */}
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{col.name}</span>
                            {col.null_count === profileData.dataset.rows && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200">
                                Empty
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Semantic Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getSemanticBadge(col.semantic_type)}
                            <span className="text-[11px] text-slate-400 font-mono">({col.dtype})</span>
                          </div>
                        </td>

                        {/* Missing Values */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {col.null_count > 0 ? (
                            <span className="font-semibold text-amber-600">
                              {formatNumber(col.null_count)} ({col.null_percentage}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">0 (0.0%)</span>
                          )}
                        </td>

                        {/* Unique Values */}
                        <td className="py-3 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {formatNumber(col.unique_count)}
                        </td>

                        {/* Summary Stats or Values Preview */}
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {/* Numeric Stats */}
                          {col.statistics && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                              <span>
                                <strong className="text-slate-500 font-sans font-medium">Min:</strong> {col.statistics.min}
                              </span>
                              <span>
                                <strong className="text-slate-500 font-sans font-medium">Max:</strong> {col.statistics.max}
                              </span>
                              <span>
                                <strong className="text-slate-500 font-sans font-medium">Mean:</strong> {col.statistics.mean}
                              </span>
                              <span>
                                <strong className="text-slate-500 font-sans font-medium">Median:</strong> {col.statistics.median}
                              </span>
                            </div>
                          )}

                          {/* Date Range */}
                          {col.date_range && (col.date_range.min || col.date_range.max) && (
                            <div className="text-[11px] text-slate-700 font-mono">
                              <span className="text-slate-400 font-sans">Span: </span>
                              {col.date_range.min} <span className="text-slate-400 font-sans">to</span> {col.date_range.max}
                            </div>
                          )}

                          {/* Categorical / Text Top Values */}
                          {col.top_values && col.top_values.length > 0 && !col.statistics && !col.date_range && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {col.top_values.slice(0, 4).map((tv, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]"
                                  title={`${tv.value}: ${tv.count} occurrences (${tv.percentage}%)`}
                                >
                                  <span className="truncate max-w-[120px]">{String(tv.value)}</span>
                                  <span className="text-slate-400 text-[10px]">({tv.percentage}%)</span>
                                </span>
                              ))}
                              {col.top_values.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  +{col.top_values.length - 4} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Fallback if no specific stats */}
                          {!col.statistics && !col.date_range && (!col.top_values || col.top_values.length === 0) && (
                            <span className="text-slate-400 italic">No summary statistics</span>
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
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
                  Data Preview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  First 10 rows returned from the uploaded dataset
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                10 rows • {profileData.columns.length} columns
              </span>
            </div>

            <div className="overflow-x-auto mt-4 rounded-lg border border-slate-200/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-12 text-center text-slate-400">#</th>
                    {profileData.columns.map((col) => (
                      <th key={col.name} className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{col.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal lowercase">({col.semantic_type})</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profileData.preview.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {rowIdx + 1}
                      </td>
                      {profileData.columns.map((col) => {
                        const cellVal = row[col.name];
                        const isNull = cellVal === null || cellVal === undefined;

                        return (
                          <td
                            key={col.name}
                            className={cn(
                              'py-2.5 px-4 whitespace-nowrap text-xs',
                              isNull ? 'text-slate-300 italic' : 'text-slate-800'
                            )}
                          >
                            {isNull ? (
                              'null'
                            ) : typeof cellVal === 'boolean' ? (
                              cellVal ? (
                                <span className="text-teal-600 font-semibold">true</span>
                              ) : (
                                <span className="text-slate-500 font-semibold">false</span>
                              )
                            ) : typeof cellVal === 'number' ? (
                              <span className="font-mono">{formatNumber(cellVal)}</span>
                            ) : (
                              <span className="truncate max-w-xs block" title={String(cellVal)}>
                                {String(cellVal)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default UploadAnalytics;
