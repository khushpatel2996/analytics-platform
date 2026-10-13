import React from 'react';
import { BarChart3, X, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicDatasetSidebar } from '@/components/layout/DynamicDatasetSidebar';
import { useDataset } from '@/context/DatasetContext';
import { formatNumber } from '@/utils/formatting';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const {
    status,
    datasetName,
    isMultiDataset,
    multiDatasetProfile,
    totalRows,
    dataModel,
    relationships,
    crossAnalytics,
  } = useDataset();

  const hasConnectedDatasets =
    isMultiDataset &&
    Boolean(
      (dataModel?.relationships && dataModel.relationships.length > 0) ||
      (relationships && relationships.some((r) => r.status === 'accepted')) ||
      (crossAnalytics?.groups && crossAnalytics.groups.length > 0)
    );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[240px] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-all duration-200 ease-in-out lg:static lg:translate-x-0 shrink-0 h-screen sticky top-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs shrink-0">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
                Analytics Platform
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                Dataset Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Content Area */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          <DynamicDatasetSidebar
            onItemClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
          />
        </nav>

        {/* Compact Footer Dataset Context */}
        {status === 'analyzed' && (
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={datasetName || undefined}>
                  {isMultiDataset && multiDatasetProfile
                    ? `${multiDatasetProfile.dataset_count} datasets`
                    : datasetName || 'Dataset'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', hasConnectedDatasets ? 'bg-emerald-500' : 'bg-blue-500')} />
                  <span>
                    {isMultiDataset
                      ? hasConnectedDatasets
                        ? 'Connected'
                        : 'Loaded'
                      : totalRows
                      ? `${formatNumber(totalRows)} rows`
                      : 'Loaded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
