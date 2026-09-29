import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  UploadCloud,
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  PieChart,
  MapPin,
  CreditCard,
  Star,
  Lightbulb,
  GraduationCap,
  CalendarCheck,
  Building,
  DollarSign,
  BarChart3,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  FileSpreadsheet,
  Award,
  Network,
  AlertCircle,
  AlertTriangle,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { useDataset } from '@/context/DatasetContext';
import { cn } from '@/lib/utils';
import { resolveModuleIcon } from '@/utils/moduleIcons';

interface DynamicDatasetSidebarProps {

  onItemClick?: () => void;
}

export function DynamicDatasetSidebar({ onItemClick }: DynamicDatasetSidebarProps) {
  const { status, datasetName, modules } = useDataset();
  const isAnalyzed = status === 'analyzed';

  return (
    <div className="space-y-4">
      {/* Before analysis: STATE 1 & STATE 2 */}
      {!isAnalyzed ? (
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            My Data
          </div>

          <NavLink
            to="/upload-analytics"
            onClick={onItemClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group',
                isActive
                  ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
              )
            }
          >
            {({ isActive }) => (
              <>
                <UploadCloud
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span className="truncate">Upload & Analyze</span>
              </>
            )}
          </NavLink>

          <div className="px-3 py-3 mt-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
            <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
              Upload a dataset to automatically generate dynamic analytics modules.
            </p>
          </div>
        </div>
      ) : (
        /* After analysis: STATE 3 (Dynamic Modules) */
        <div className="space-y-2">
          {/* Active Dataset Banner */}
          <div className="px-3 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              My Dataset
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate" title={datasetName || ''}>
                {datasetName}
              </span>
            </div>
          </div>

          {/* Dynamic Module Navigation Links */}
          <div className="space-y-1">
            <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Analytics Modules
            </div>

            {modules.filter((m) => m.id !== 'outliers').map((mod) => {
              const Icon = resolveModuleIcon(mod.icon || mod.id);
              const targetPath = mod.id === 'overview' ? '/dataset/overview' : `/dataset/${mod.id}`;

              return (
                <NavLink
                  key={mod.id}
                  to={targetPath}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group',
                      isActive
                        ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        )}
                      />
                      <span className="truncate">{mod.title}</span>
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Secondary INVESTIGATE Section */}
            {(modules.some((m) => m.id === 'outliers') || modules.some((m) => m.id === 'data-quality')) && (
              <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
                <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Investigate
                </div>

                {modules.some((m) => m.id === 'outliers') && (
                  <NavLink
                    to="/dataset/outliers"
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group',
                        isActive
                          ? 'bg-amber-50/90 text-amber-800 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <AlertTriangle
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-600'
                          )}
                        />
                        <span className="truncate">Unusual Values</span>
                      </>
                    )}
                  </NavLink>
                )}

                {modules.some((m) => m.id === 'data-quality') && (
                  <NavLink
                    to="/dataset/data-quality"
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group',
                        isActive
                          ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Search
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          )}
                        />
                        <span className="truncate">Data Quality Issues</span>
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            )}

            {/* Upload & Analyze action to change dataset */}
            <NavLink
              to="/upload-analytics"
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group mt-2 border-t border-slate-100 pt-2.5',
                  isActive
                    ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <UploadCloud
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  <span className="truncate">Upload & Analyze</span>
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
