import React, { useEffect, useState } from 'react';
import { MapPin, Compass } from 'lucide-react';
import { apiService } from '@/services/api';
import { GeographyData, CityMetric } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber, formatPercent } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { StateChart } from '@/components/charts/StateChart';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

export function GeographyPage() {
  const { filters } = useFilterParams();
  const [geoData, setGeoData] = useState<GeographyData | null>(null);
  const [citiesData, setCitiesData] = useState<CityMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders'>('revenue');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stRes, ctRes] = await Promise.all([
        apiService.getGeographyStates(filters),
        apiService.getGeographyCities(25, filters),
      ]);

      if (stRes.success) setGeoData(stRes.data);
      if (ctRes.success) setCitiesData(ctRes.data);
    } catch (err: any) {
      console.error('Failed to load geography data:', err);
      setError(err.message || 'Failed to load Indian geography analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const stateColumns: ColumnDef<any>[] = [
    {
      key: 'state',
      header: 'Indian State / UT',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-800">{row.state}</span>
        </div>
      ),
    },
    {
      key: 'region',
      header: 'Region',
      sortable: true,
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.region}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Total Revenue',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders)}</span>,
    },
    {
      key: 'customers',
      header: 'Unique Buyers',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.customers)}</span>,
    },
    {
      key: 'aov',
      header: 'AOV',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatINR(row.aov)}</span>,
    },
    {
      key: 'percentage_of_total',
      header: 'GMV Share',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-blue-600">{formatPercent(row.percentage_of_total)}</span>
      ),
    },
  ];

  const cityColumns: ColumnDef<any>[] = [
    {
      key: 'city',
      header: 'City Name',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.city}</span>,
    },
    {
      key: 'state',
      header: 'State',
      sortable: true,
      render: (row) => <span className="text-slate-600">{row.state}</span>,
    },
    {
      key: 'region',
      header: 'Region',
      sortable: true,
      render: (row) => <span className="text-slate-500">{row.region}</span>,
    },
    {
      key: 'revenue',
      header: 'City Revenue',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders)}</span>,
    },
    {
      key: 'aov',
      header: 'AOV',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatINR(row.aov)}</span>,
    },
  ];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Regional Performance Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {geoData?.regions.map((reg) => (
          <div
            key={reg.region}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {reg.region} India
              </span>
              <Compass className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-base font-bold text-slate-900">{formatINR(reg.revenue, true)}</div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>{formatNumber(reg.orders)} orders</span>
              <span className="font-semibold text-blue-600">{formatPercent(reg.percentage_of_total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* State Chart & Metric Toggle */}
      <ChartCard
        title="Indian State-wise Sales Performance"
        subtitle="Ranked geographic contribution across 20 active Indian states"
        loading={loading}
        error={error}
        isEmpty={!geoData || geoData.states.length === 0}
        onRetry={fetchData}
        actions={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                selectedMetric === 'revenue'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Revenue
            </button>
            <button
              onClick={() => setSelectedMetric('orders')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                selectedMetric === 'orders'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Orders
            </button>
          </div>
        }
      >
        {geoData && <StateChart data={geoData.states} metric={selectedMetric} />}
      </ChartCard>

      {/* State & City Detailed Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">State Analytics Breakdown</h3>
            <p className="text-xs text-slate-500">State-level volume, customer counts, and basket sizes</p>
          </div>
          <DataTable
            columns={stateColumns}
            data={geoData?.states || []}
            searchPlaceholder="Search states (e.g. Gujarat)..."
            pageSize={8}
          />
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Top Indian Metro & Tier-2 Cities</h3>
            <p className="text-xs text-slate-500">Highest grossing customer municipal locations</p>
          </div>
          <DataTable
            columns={cityColumns}
            data={citiesData}
            searchPlaceholder="Search cities (e.g. Hyderabad)..."
            pageSize={8}
          />
        </div>
      </div>
    </PageContainer>
  );
}
