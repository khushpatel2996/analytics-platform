import React from 'react';
import { BarChart3, X, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicDatasetSidebar } from '@/components/layout/DynamicDatasetSidebar';
import { useDataset } from '@/context/DatasetContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { status, datasetName } = useDataset();

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
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 shrink-0 h-screen sticky top-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shadow-blue-500/20">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-slate-900 leading-tight">Analytics Platform</h1>
              <p className="text-[11px] font-medium text-slate-400">
                Generic Dataset Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Content Area: Purely Dynamic Dataset Navigation */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4">
          <DynamicDatasetSidebar
            onItemClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
          />
        </nav>

        {/* Compact Footer Card */}
        <div className="p-3.5 border-t border-slate-100">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 text-slate-800">
              <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold">
                Dataset Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal truncate" title={datasetName || 'No dataset loaded'}>
              {status === 'analyzed' && datasetName
                ? `Active: ${datasetName}`
                : 'No dataset loaded'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
