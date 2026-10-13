import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  AlertTriangle,
  Sparkles,
  Network,
  LayoutDashboard,
  TrendingUp,
  Package,
  PieChart,
  MapPin,
  Award,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { useDataset } from '@/context/DatasetContext';
import { cn } from '@/lib/utils';
import { resolveModuleIcon } from '@/utils/moduleIcons';

interface DynamicDatasetSidebarProps {
  onItemClick?: () => void;
}

export function DynamicDatasetSidebar({ onItemClick }: DynamicDatasetSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    status,
    datasetName,
    modules,
    profile,
    isMultiDataset,
    multiDatasetProfile,
    selectedDatasetId,
    selectDataset,
    relationships,
    dataModel,
    crossAnalytics,
  } = useDataset();
  const isAnalyzed = status === 'analyzed';

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
    }
    if (lower.endsWith('.json')) {
      return <FileCode className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />;
  };

  // Connected datasets exist when data model is built or accepted relationships exist
  const hasConnectedDatasets =
    isMultiDataset &&
    Boolean(
      (dataModel?.relationships && dataModel.relationships.length > 0) ||
      (relationships && relationships.some((r) => r.status === 'accepted')) ||
      (crossAnalytics?.groups && crossAnalytics.groups.length > 0)
    );

  const hasModule = (id: string) => modules.some((m) => m.id === id);

  // Consolidated Analytics navigation items matching exact specification:
  // Overview, Trends, Products, Categories, Geography, Rankings, Correlations, Insights
  const analyticsNavItems: Array<{
    id: string;
    label: string;
    path: string;
    icon: React.ElementType;
    activeMatch?: (pathname: string) => boolean;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      path: '/dataset/overview',
      icon: LayoutDashboard,
    },
    ...(hasModule('trends') ||
    (profile?.summary?.datetime_columns && profile.summary.datetime_columns.length > 0) ||
    (profile?.datetime_columns && profile.datetime_columns.length > 0)
      ? [
          {
            id: 'trends',
            label: 'Trends',
            path: '/dataset/trends',
            icon: TrendingUp,
          },
        ]
      : []),
    ...(hasModule('products')
      ? [
          {
            id: 'products',
            label: 'Products',
            path: '/dataset/products',
            icon: Package,
          },
        ]
      : []),
    ...(hasModule('categories') || hasModule('distributions')
      ? [
          {
            id: 'categories',
            label: 'Categories',
            path: '/dataset/categories',
            icon: PieChart,
            activeMatch: (pathname: string) =>
              pathname === '/dataset/categories' || pathname === '/dataset/distributions',
          },
        ]
      : []),
    ...(hasModule('geography')
      ? [
          {
            id: 'geography',
            label: 'Geography',
            path: '/dataset/geography',
            icon: MapPin,
          },
        ]
      : []),
    ...(hasModule('rankings') && !hasModule('products')
      ? [
          {
            id: 'rankings',
            label: 'Rankings',
            path: '/dataset/rankings',
            icon: Award,
          },
        ]
      : []),
    ...(hasModule('correlations')
      ? [
          {
            id: 'correlations',
            label: 'Correlations',
            path: '/dataset/correlations',
            icon: Network,
          },
        ]
      : []),
    ...(hasModule('insights')
      ? [
          {
            id: 'insights',
            label: 'Insights',
            path: '/dataset/insights',
            icon: Lightbulb,
          },
        ]
      : []),
  ];

  // Custom domain quantitative metric modules (e.g. sales-revenue, compensation, tuition-fees)
  const customDomainModules = modules.filter(
    (m) =>
      ![
        'overview',
        'trends',
        'products',
        'categories',
        'distributions',
        'geography',
        'rankings',
        'correlations',
        'insights',
        'data-quality',
        'outliers',
      ].includes(m.id)
  );

  const hasDataQuality = hasModule('data-quality');
  const hasOutliers = hasModule('outliers');

  return (
    <div className="space-y-4 text-xs">
      {/* Before analysis: Upload state */}
      {!isAnalyzed ? (
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Workspace
          </div>

          <NavLink
            to="/upload-analytics"
            onClick={onItemClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )
            }
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">Upload & Analyze</span>
          </NavLink>

          <div className="px-3 py-3 mt-3 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a dataset to generate tailored analytics.
            </p>
          </div>
        </div>
      ) : (
        /* After Analysis: Structured 3-Tier Navigation */
        <div className="space-y-4">
          {/* Multi-Dataset Selector (if multiple datasets uploaded) */}
          {isMultiDataset && multiDatasetProfile && (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Datasets</span>
                <span className="font-mono">{multiDatasetProfile.dataset_count}</span>
              </div>

              <div className="space-y-0.5">
                {multiDatasetProfile.datasets.map((ds) => {
                  const isSelected = selectedDatasetId === ds.dataset_id || datasetName === ds.filename;
                  return (
                    <button
                      key={ds.dataset_id}
                      type="button"
                      onClick={() => {
                        selectDataset(ds.dataset_id);
                        onItemClick?.();
                        if (location.pathname === '/dataset/cross-dataset') {
                          navigate('/dataset/overview');
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer',
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(ds.filename)}
                        <span className="truncate" title={ds.filename}>
                          {ds.filename}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 1: ANALYTICS */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Analytics
            </div>

            {analyticsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.activeMatch
                ? item.activeMatch(location.pathname)
                : location.pathname === item.path;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={onItemClick}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 transition-colors',
                      isActive
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}

            {/* Custom domain quantitative modules if any */}
            {customDomainModules.map((mod) => {
              const Icon = resolveModuleIcon(mod.icon || mod.id);
              const targetPath = `/dataset/${mod.id}`;
              const isActive = location.pathname === targetPath;

              return (
                <NavLink
                  key={mod.id}
                  to={targetPath}
                  onClick={onItemClick}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 transition-colors',
                      isActive
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span className="truncate">{mod.title}</span>
                </NavLink>
              );
            })}

            {/* Combined Analysis Entry (when multiple datasets are connected) */}
            {hasConnectedDatasets && (
              <NavLink
                to="/dataset/cross-dataset"
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors mt-1',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">Combined Analysis</span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  Model
                </span>
              </NavLink>
            )}
          </div>

          {/* SECTION 2: DATA */}
          {hasDataQuality && (
            <div className="space-y-0.5 pt-1">
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Data
              </div>

              <NavLink
                to="/dataset/data-quality"
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )
                }
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">Data Quality</span>
              </NavLink>
            </div>
          )}

          {/* SECTION 3: INVESTIGATE */}
          {hasOutliers && (
            <div className="space-y-0.5 pt-1">
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Investigate
              </div>

              <NavLink
                to="/dataset/outliers"
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )
                }
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">Unusual Values</span>
              </NavLink>
            </div>
          )}

          {/* Bottom Action: Workspace & Upload */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
            <NavLink
              to="/upload-analytics"
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )
              }
            >
              {isMultiDataset ? (
                <>
                  <Network className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">Data Model & Joins</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">Upload / Manage</span>
                </>
              )}
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}

export default DynamicDatasetSidebar;
