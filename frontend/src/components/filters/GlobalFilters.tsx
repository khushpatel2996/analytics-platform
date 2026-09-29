import React, { useEffect, useState } from 'react';
import { Filter, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '@/services/api';
import { FiltersResponse } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatLabel } from '@/utils/formatting';

export function GlobalFilters() {
  const { filters, setFilter, clearFilter, resetFilters, activeFiltersCount } = useFilterParams();
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiService
      .getFilters()
      .then((res) => {
        if (isMounted && res.success) {
          setFilterOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not load filter options:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 tracking-tight">Global Analytics Filters</span>
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  {activeFiltersCount} active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Refine metrics by geography, timeline, segment, or category</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 rounded-lg border border-blue-200/60 transition-colors"
          >
            <span>{isOpen ? 'Hide Filters' : 'Filter Options'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Filter Grid */}
      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Calendar Year</label>
            <select
              value={filters.year || ''}
              onChange={(e) => setFilter('year', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Years</option>
              {filterOptions?.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Month</label>
            <select
              value={filters.month || ''}
              onChange={(e) => setFilter('month', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Months</option>
              {filterOptions?.months.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Indian State</label>
            <select
              value={filters.state || ''}
              onChange={(e) => setFilter('state', e.target.value || undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All 20 States</option>
              {filterOptions?.states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Indian City</label>
            <select
              value={filters.city || ''}
              onChange={(e) => setFilter('city', e.target.value || undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Cities</option>
              {filterOptions?.cities.slice(0, 100).map((c) => (
                <option key={c} value={c}>
                  {formatLabel(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Indian Region</label>
            <select
              value={filters.region || ''}
              onChange={(e) => setFilter('region', e.target.value || undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Regions</option>
              {filterOptions?.regions.map((r) => (
                <option key={r} value={r}>
                  {r} India
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilter('category', e.target.value || undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Categories</option>
              {filterOptions?.categories.map((c) => (
                <option key={c} value={c}>
                  {formatLabel(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
            <select
              value={filters.payment_method || ''}
              onChange={(e) => setFilter('payment_method', e.target.value || undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Payment Methods</option>
              {filterOptions?.payment_methods.map((p) => (
                <option key={p} value={p}>
                  {formatLabel(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Segment */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer Segment</label>
            <select
              value={filters.customer_segment || ''}
              onChange={(e) => setFilter('customer_segment', e.target.value || undefined)}
              className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Segments</option>
              {filterOptions?.customer_segments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date range from/to */}
          <div className="sm:col-span-2 flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilter('date_from', e.target.value || undefined)}
                className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilter('date_to', e.target.value || undefined)}
                className="w-full h-9 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Active:</span>
          {Object.entries(filters).map(([k, v]) => {
            if (v === undefined || v === null || v === '') return null;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
              >
                <span className="text-slate-400 capitalize">{k.replace('_', ' ')}:</span>
                <span className="font-semibold">{String(v)}</span>
                <button
                  onClick={() => clearFilter(k as any)}
                  className="hover:text-slate-900 ml-0.5"
                  aria-label={`Remove filter ${k}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
