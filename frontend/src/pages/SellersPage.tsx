import React, { useEffect, useState } from 'react';
import { Store, MapPin, Award } from 'lucide-react';
import { apiService } from '@/services/api';
import { SellersTopData, SellerGeographyData } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { KPICard } from '@/components/dashboard/KPICard';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

export function SellersPage() {
  const { filters } = useFilterParams();

  const [topSellersData, setTopSellersData] = useState<SellersTopData | null>(null);
  const [geoData, setGeoData] = useState<SellerGeographyData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [topRes, geoRes] = await Promise.all([
        apiService.getTopSellers(15, filters),
        apiService.getSellerGeography(filters),
      ]);

      if (topRes.success) setTopSellersData(topRes.data);
      if (geoRes.success) setGeoData(geoRes.data);
    } catch (err: any) {
      console.error('Sellers fetch error:', err);
      setError(err.message || 'Failed to load seller analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const sellerColumns: ColumnDef<any>[] = [
    {
      key: 'seller_id',
      header: 'Seller ID (Masked)',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-800" title={row.seller_id}>
          {row.seller_id}
        </span>
      ),
    },
    {
      key: 'city',
      header: 'Seller City',
      sortable: true,
      render: (row) => <span className="text-slate-700">{row.city}</span>,
    },
    {
      key: 'state',
      header: 'State',
      sortable: true,
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.state}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Gross Turnover',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'orders_count',
      header: 'Orders Fulfilled',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders_count)}</span>,
    },
    {
      key: 'items_sold',
      header: 'Units Sold',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.items_sold)}</span>,
    },
  ];

  const sellerStateColumns: ColumnDef<any>[] = [
    {
      key: 'state',
      header: 'State / Territory',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.state}</span>,
    },
    {
      key: 'seller_count',
      header: 'Merchants',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.seller_count)}</span>,
    },
    {
      key: 'revenue',
      header: 'State GMV',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
  ];

  const topSeller = topSellersData?.sellers[0];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Seller High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Active Marketplace Sellers"
          value={formatNumber(topSellersData?.total_sellers)}
          subtitle="Registered vendor merchant base"
          icon={Store}
          iconBgColor="bg-cyan-50"
          iconColor="text-cyan-600"
        />
        <KPICard
          label="Top Vendor Revenue"
          value={formatINR(topSeller?.revenue, true)}
          subtitle={`Seller: ${topSeller?.seller_id || 'N/A'}`}
          icon={Award}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          label="Total Merchant States"
          value={formatNumber(geoData?.by_state.length || 0)}
          subtitle="Indian states with active fulfillment"
          icon={MapPin}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* 2/3 and 1/3 Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Top Marketplace Sellers by Revenue</h3>
            <p className="text-xs text-slate-500">Highest grossing commercial merchants across the platform</p>
          </div>
          <DataTable
            columns={sellerColumns}
            data={topSellersData?.sellers || []}
            searchPlaceholder="Search seller ID, city, or state..."
            pageSize={10}
          />
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Seller Geographic Base</h3>
            <p className="text-xs text-slate-500">Merchant density by state</p>
          </div>
          <DataTable
            columns={sellerStateColumns}
            data={geoData?.by_state || []}
            searchPlaceholder="Search states..."
            pageSize={10}
          />
        </div>
      </div>
    </PageContainer>
  );
}
