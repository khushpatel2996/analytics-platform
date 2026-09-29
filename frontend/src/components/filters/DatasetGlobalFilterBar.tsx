import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Filter,
  X,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
  Calendar,
  Hash,
  SlidersHorizontal,
  RefreshCw,
  Layers,
  ToggleLeft,
  ChevronRight,
} from 'lucide-react';
import { useDataset } from '@/context/DatasetContext';
import { ColumnFilterOption } from '@/types';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

export function DatasetGlobalFilterBar() {
  const {
    availableFilters,
    activeFilters,
    activeFiltersSummary,
    isFiltered,
    totalRows,
    filteredRows,
    percentageOfTotal,
    isFiltering,
    setFilter,
    removeFilter,
    clearAllFilters,
  } = useDataset();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [activeDrawerFilter, setActiveDrawerFilter] = useState<string | null>(null);
  const [drawerSearch, setDrawerSearch] = useState<string>('');
  const [catSearchTerms, setCatSearchTerms] = useState<Record<string, string>>({});
  const [globalSearchInput, setGlobalSearchInput] = useState<string>(activeFilters['_search'] || '');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<any>(null);

  // Sync global search input if cleared externally
  useEffect(() => {
    setGlobalSearchInput(activeFilters['_search'] || '');
  }, [activeFilters['_search']]);

  // Handle global search typing with debounce
  const handleGlobalSearchChange = (val: string) => {
    setGlobalSearchInput(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setFilter('_search', val.trim() ? val.trim() : null);
    }, 250);
  };

  const handleClearGlobalSearch = () => {
    setGlobalSearchInput('');
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    removeFilter('_search');
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!availableFilters || availableFilters.length === 0) {
    return null;
  }

  const primaryFilters = availableFilters.filter((f) => f.is_primary);
  const secondaryFilters = availableFilters.filter((f) => !f.is_primary);

  // Categorical helpers
  const toggleCategoricalOption = (col: string, val: string) => {
    const current = (activeFilters[col] as string[]) || [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    setFilter(col, next.length > 0 ? next : null);
  };

  const selectAllCategorical = (filter: ColumnFilterOption) => {
    const allVals = (filter.options || []).map((o) => o.value);
    setFilter(filter.column, allVals);
  };

  const clearCategorical = (col: string) => {
    removeFilter(col);
  };

  // Render individual filter editor (reused between popover and drawer)
  const renderFilterEditor = (filter: ColumnFilterOption, isInsideDrawer = false) => {
    if (filter.type === 'categorical') {
      const searchTerm = catSearchTerms[filter.column] || '';
      const filteredOptions = (filter.options || []).filter((opt) =>
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const selectedVals = (activeFilters[filter.column] as string[]) || [];

      return (
        <div className="space-y-2.5">
          {/* Search box if > 4 options */}
          {(filter.options?.length || 0) > 4 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${filter.label}...`}
                value={searchTerm}
                onChange={(e) =>
                  setCatSearchTerms((prev) => ({
                    ...prev,
                    [filter.column]: e.target.value,
                  }))
                }
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1.5 border-b border-slate-100">
            <span className="font-medium text-slate-400">
              {selectedVals.length} selected
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => selectAllCategorical(filter)}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => clearCategorical(filter.column)}
                className="text-slate-500 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className={cn("overflow-y-auto space-y-1 pr-1", isInsideDrawer ? "max-h-72" : "max-h-52")}>
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">No matching options</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedVals.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCategoricalOption(filter.column, opt.value)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="truncate text-slate-800 text-xs">{opt.value}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                      {formatNumber(opt.count)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      );
    }

    if (filter.type === 'boolean') {
      const currentVal = activeFilters[filter.column];
      return (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold text-slate-500">Filter by value:</div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => removeFilter(filter.column)}
              className={cn(
                "py-1.5 text-xs font-semibold rounded-md transition-all",
                currentVal === undefined || currentVal === null
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter(filter.column, true)}
              className={cn(
                "py-1.5 text-xs font-semibold rounded-md transition-all",
                currentVal === true
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              True / Yes
            </button>
            <button
              type="button"
              onClick={() => setFilter(filter.column, false)}
              className={cn(
                "py-1.5 text-xs font-semibold rounded-md transition-all",
                currentVal === false
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              False / No
            </button>
          </div>
        </div>
      );
    }

    if (filter.type === 'datetime') {
      const activeDate = activeFilters[filter.column] || {};
      const currentPreset = typeof activeDate === 'object' ? activeDate.preset : null;

      const datePresets = [
        { id: 'today', label: 'Today' },
        { id: 'this_week', label: 'This Week' },
        { id: 'this_month', label: 'This Month' },
        { id: 'this_year', label: 'This Year' },
      ];

      return (
        <div className="space-y-3">
          {filter.min_date && filter.max_date && (
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Bounds:</span>
              <span className="font-mono text-slate-700">{filter.min_date} → {filter.max_date}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Quick Relative Presets:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {datePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (currentPreset === p.id) {
                      removeFilter(filter.column);
                    } else {
                      setFilter(filter.column, { preset: p.id });
                    }
                  }}
                  className={cn(
                    "py-1 px-2 rounded-md text-xs font-semibold border transition-all text-center",
                    currentPreset === p.id
                      ? "bg-blue-50 border-blue-300 text-blue-800 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Custom Range:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Start Date</label>
                <input
                  type="date"
                  min={filter.min_date || undefined}
                  max={filter.max_date || undefined}
                  value={activeDate.start || ''}
                  onChange={(e) => {
                    setFilter(filter.column, {
                      ...activeDate,
                      preset: undefined,
                      start: e.target.value || undefined,
                    });
                  }}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">End Date</label>
                <input
                  type="date"
                  min={filter.min_date || undefined}
                  max={filter.max_date || undefined}
                  value={activeDate.end || ''}
                  onChange={(e) => {
                    setFilter(filter.column, {
                      ...activeDate,
                      preset: undefined,
                      end: e.target.value || undefined,
                    });
                  }}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeFilter(filter.column)}
            className="w-full py-1 text-center text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            Reset Date Filter
          </button>
        </div>
      );
    }

    if (filter.type === 'numeric') {
      const activeNum = activeFilters[filter.column] || {};
      return (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Observed Range:</span>
            <span className="font-mono text-slate-700">
              {filter.min_value != null ? formatNumber(filter.min_value) : '0'} to{' '}
              {filter.max_value != null ? formatNumber(filter.max_value) : '0'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Min Value</label>
              <input
                type="number"
                placeholder={String(filter.min_value ?? '')}
                value={activeNum.min ?? ''}
                onChange={(e) => {
                  setFilter(filter.column, {
                    ...activeNum,
                    min: e.target.value !== '' ? Number(e.target.value) : undefined,
                  });
                }}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Max Value</label>
              <input
                type="number"
                placeholder={String(filter.max_value ?? '')}
                value={activeNum.max ?? ''}
                onChange={(e) => {
                  setFilter(filter.column, {
                    ...activeNum,
                    max: e.target.value !== '' ? Number(e.target.value) : undefined,
                  });
                }}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeFilter(filter.column)}
            className="w-full py-1 text-center text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            Reset Range
          </button>
        </div>
      );
    }

    return null;
  };

  // Helper to render filter chip display value
  const getFilterDisplayValue = (col: string, val: any) => {
    if (col === '_search') {
      return `"${val}"`;
    }
    if (Array.isArray(val)) {
      if (val.length <= 2) return val.join(', ');
      return `${val.slice(0, 2).join(', ')} +${val.length - 2}`;
    }
    if (typeof val === 'object' && val !== null) {
      if (val.preset) {
        return val.preset.replace('_', ' ').toUpperCase();
      }
      if (val.start || val.end) {
        return `${val.start || 'Start'} → ${val.end || 'End'}`;
      }
      if (val.min !== undefined || val.max !== undefined) {
        return `[${val.min ?? 'Min'} – ${val.max ?? 'Max'}]`;
      }
    }
    if (typeof val === 'boolean') {
      return val ? 'True' : 'False';
    }
    return String(val);
  };

  // Secondary filters filtered by drawer search
  const filteredSecondaryFilters = useMemo(() => {
    if (!drawerSearch.trim()) return secondaryFilters;
    const q = drawerSearch.toLowerCase();
    return secondaryFilters.filter(
      (f) => f.label.toLowerCase().includes(q) || f.column.toLowerCase().includes(q)
    );
  }, [secondaryFilters, drawerSearch]);

  return (
    <div
      ref={dropdownRef}
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 mb-5 space-y-3 relative transition-all"
    >
      {/* Main Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Global Search + Primary Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Global Search Input */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dataset..."
              value={globalSearchInput}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
              className={cn(
                "w-full pl-8 pr-7 py-1.5 bg-slate-50 border rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white transition-all",
                activeFilters['_search']
                  ? "border-blue-400 bg-blue-50/30 text-blue-900 font-medium"
                  : "border-slate-200 focus:border-blue-500"
              )}
            />
            {globalSearchInput && (
              <button
                type="button"
                onClick={handleClearGlobalSearch}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Primary Filters (Horizontal Dropdown Pills) */}
          {primaryFilters.map((filter) => {
            const hasActive = Boolean(activeFilters[filter.column]);
            const isOpen = openDropdown === filter.column;

            return (
              <div key={filter.column} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(isOpen ? null : filter.column)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer',
                    hasActive
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {filter.type === 'datetime' ? (
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  ) : filter.type === 'numeric' ? (
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                  ) : filter.type === 'boolean' ? (
                    <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{filter.label}</span>
                  {hasActive && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {Array.isArray(activeFilters[filter.column])
                        ? activeFilters[filter.column].length
                        : '•'}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Dropdown Popover */}
                {isOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-900 text-xs">{filter.label}</span>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {renderFilterEditor(filter, false)}
                  </div>
                )}
              </div>
            );
          })}

          {/* More Filters Button */}
          {secondaryFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer',
                secondaryFilters.some((f) => Boolean(activeFilters[f.column]))
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More Filters</span>
              <span className="text-[10px] px-1.5 rounded bg-slate-100 text-slate-600 font-bold">
                +{secondaryFilters.length}
              </span>
            </button>
          )}
        </div>

        {/* Right Side: Population Summary & Clear All */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {isFiltering ? (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Updating analytics...</span>
            </div>
          ) : (
            <div className="text-xs">
              {isFiltered ? (
                <span className="text-slate-700">
                  Showing{' '}
                  <strong className="text-blue-700 font-mono">
                    {formatNumber(filteredRows)}
                  </strong>{' '}
                  / {formatNumber(totalRows)} records{' '}
                  <span className="text-slate-400 font-normal">
                    ({percentageOfTotal.toFixed(1)}%)
                  </span>
                </span>
              ) : (
                <span className="text-slate-500 font-medium">
                  All <strong className="text-slate-800 font-mono">{formatNumber(totalRows)}</strong> records
                </span>
              )}
            </div>
          )}

          {isFiltered && (
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={isFiltering}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Active:</span>
          {Object.keys(activeFilters).map((col) => {
            const val = activeFilters[col];
            if (val === null || val === undefined || (Array.isArray(val) && val.length === 0)) return null;

            const filterObj = availableFilters.find((f) => f.column === col);
            const label = col === '_search' ? 'Search' : (filterObj?.label || col);
            const displayVal = getFilterDisplayValue(col, val);

            return (
              <span
                key={col}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium shadow-2xs"
              >
                <span className="font-semibold text-slate-800">{label}:</span>
                <span className="truncate max-w-[150px] font-mono text-[11px]">{displayVal}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(col)}
                  className="hover:text-blue-900 ml-0.5 cursor-pointer"
                  aria-label={`Remove filter for ${label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Slide-over Drawer for All Secondary Filters */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setShowDrawer(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Dataset Filters</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                  {secondaryFilters.length} available
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Search */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find a filter attribute..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Drawer Filter List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
              {filteredSecondaryFilters.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No filters found matching "{drawerSearch}"
                </div>
              ) : (
                filteredSecondaryFilters.map((sFilter) => {
                  const isExpanded = activeDrawerFilter === sFilter.column;
                  const hasActive = Boolean(activeFilters[sFilter.column]);

                  return (
                    <div key={sFilter.column} className="pt-3 first:pt-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDrawerFilter(isExpanded ? null : sFilter.column)
                        }
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors",
                          isExpanded
                            ? "bg-slate-100"
                            : hasActive
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {sFilter.type === 'datetime' ? (
                            <Calendar className="w-4 h-4 text-slate-400" />
                          ) : sFilter.type === 'numeric' ? (
                            <Hash className="w-4 h-4 text-slate-400" />
                          ) : sFilter.type === 'boolean' ? (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Layers className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-xs font-bold text-slate-800">
                            {sFilter.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({sFilter.column})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasActive && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                              Active
                            </span>
                          )}
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 text-slate-400 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </div>
                      </button>

                      {/* Expanded Filter Body */}
                      {isExpanded && (
                        <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-b-lg mt-1 text-xs">
                          {renderFilterEditor(sFilter, true)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              {isFiltered ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                >
                  Clear All Filters
                </button>
              ) : (
                <span className="text-xs text-slate-400">All data records active</span>
              )}
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatasetGlobalFilterBar;
