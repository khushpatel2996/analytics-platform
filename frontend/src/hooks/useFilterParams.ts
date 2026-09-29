import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterParams } from '@/types';

export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse current URL params into FilterParams object
  const filters = useMemo<FilterParams>(() => {
    const f: FilterParams = {};
    if (searchParams.get('date_from')) f.date_from = searchParams.get('date_from')!;
    if (searchParams.get('date_to')) f.date_to = searchParams.get('date_to')!;
    if (searchParams.get('year')) f.year = Number(searchParams.get('year'));
    if (searchParams.get('month')) f.month = Number(searchParams.get('month'));
    if (searchParams.get('state')) f.state = searchParams.get('state')!;
    if (searchParams.get('city')) f.city = searchParams.get('city')!;
    if (searchParams.get('region')) f.region = searchParams.get('region')!;
    if (searchParams.get('category')) f.category = searchParams.get('category')!;
    if (searchParams.get('payment_method')) f.payment_method = searchParams.get('payment_method')!;
    if (searchParams.get('customer_segment')) f.customer_segment = searchParams.get('customer_segment')!;
    return f;
  }, [searchParams]);

  const setFilter = useCallback((key: keyof FilterParams, value: any) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value !== undefined && value !== null && value !== '') {
        next.set(key, String(value));
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [setSearchParams]);

  const clearFilter = useCallback((key: keyof FilterParams) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      return next;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilter,
    resetFilters,
    activeFiltersCount,
  };
}
