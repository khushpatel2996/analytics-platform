import React, { useEffect, useState } from 'react';
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import { apiService } from '@/services/api';
import {
  OverviewData,
  SalesTrendData,
  SalesBreakdownData,
  ProductsData,
  CategoriesData,
  CustomerSegmentsData,
  PaymentSummaryData,
  ReviewSummaryData,
  InsightsData,
} from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber, formatPercent } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { KPICardSkeleton } from '@/components/common/LoadingSkeleton';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { OrdersChart } from '@/components/charts/OrdersChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { StateChart } from '@/components/charts/StateChart';
import { CityChart } from '@/components/charts/CityChart';
import { PaymentChart } from '@/components/charts/PaymentChart';
import { TopProductsChart } from '@/components/charts/TopProductsChart';
import { ProductCategoriesChart } from '@/components/charts/ProductCategoriesChart';
import { SegmentChart } from '@/components/charts/SegmentChart';
import { ReviewRatingChart } from '@/components/charts/ReviewRatingChart';
import { InsightCard } from '@/components/dashboard/InsightCard';

export function DashboardPage() {
  const { filters } = useFilterParams();

  // State for all 10 analytical datasets
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<SalesTrendData | null>(null);
  const [salesByCategory, setSalesByCategory] = useState<SalesBreakdownData | null>(null);
  const [salesByState, setSalesByState] = useState<SalesBreakdownData | null>(null);
  const [salesByCity, setSalesByCity] = useState<SalesBreakdownData | null>(null);
  const [payments, setPayments] = useState<PaymentSummaryData | null>(null);
  const [topProducts, setTopProducts] = useState<ProductsData | null>(null);
  const [productCategories, setProductCategories] = useState<CategoriesData | null>(null);
  const [segments, setSegments] = useState<CustomerSegmentsData | null>(null);
  const [reviews, setReviews] = useState<ReviewSummaryData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        ovRes,
        trRes,
        catRes,
        stRes,
        cityRes,
        payRes,
        prodRes,
        prodCatRes,
        segRes,
        revRes,
        insRes,
      ] = await Promise.all([
        apiService.getOverview(filters),
        apiService.getSalesTrend('month', filters),
        apiService.getSalesByCategory(10, filters),
        apiService.getSalesByState(10, filters),
        apiService.getSalesByCity(10, filters),
        apiService.getPaymentSummary(filters),
        apiService.getTopProducts('revenue', 8, filters),
        apiService.getProductCategories(8, filters),
        apiService.getCustomerSegments(),
        apiService.getReviewSummary(filters),
        apiService.getInsights(filters),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (trRes.success) setTrends(trRes.data);
      if (catRes.success) setSalesByCategory(catRes.data);
      if (stRes.success) setSalesByState(stRes.data);
      if (cityRes.success) setSalesByCity(cityRes.data);
      if (payRes.success) setPayments(payRes.data);
      if (prodRes.success) setTopProducts(prodRes.data);
      if (prodCatRes.success) setProductCategories(prodCatRes.data);
      if (segRes.success) setSegments(segRes.data);
      if (revRes.success) setReviews(revRes.data);
      if (insRes.success) setInsights(insRes.data);
    } catch (err: any) {
      console.error('Dashboard load failed:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const kpis = overview?.kpis;

  return (
    <PageContainer>
      {/* Global Filter Bar */}
      <GlobalFilters />

      {/* Primary KPI Row */}
      {loading && !overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Gross Revenue"
            value={formatINR(kpis?.total_revenue, true)}
            subtitle={`Full: ${formatINR(kpis?.total_revenue)}`}
            icon={IndianRupee}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <KPICard
            label="Total Orders"
            value={formatNumber(kpis?.total_orders, true)}
            subtitle={`${formatNumber(kpis?.total_orders)} completed orders`}
            icon={ShoppingBag}
            iconBgColor="bg-teal-50"
            iconColor="text-teal-600"
          />
          <KPICard
            label="Unique Customers"
            value={formatNumber(kpis?.total_customers, true)}
            subtitle={`${formatNumber(kpis?.total_customers)} customer records`}
            icon={Users}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <KPICard
            label="Avg Order Value (AOV)"
            value={formatINR(kpis?.average_order_value)}
            subtitle={`Avg items per order: ${kpis?.average_order_items || 0}`}
            icon={TrendingUp}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <KPICard
            label="Product Catalog"
            value={formatNumber(kpis?.total_products)}
            subtitle={`${formatNumber(kpis?.total_quantity)} units sold`}
            icon={Package}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <KPICard
            label="Active Sellers"
            value={formatNumber(kpis?.total_sellers)}
            subtitle="Registered merchant vendors"
            icon={Store}
            iconBgColor="bg-cyan-50"
            iconColor="text-cyan-600"
          />
          <KPICard
            label="Customer Satisfaction"
            value={`${kpis?.average_review_score || 0} / 5.0`}
            subtitle="Average platform review score"
            icon={Star}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <KPICard
            label="Delivery Rate"
            value={formatPercent(kpis?.delivery_rate)}
            subtitle={`Cancellation rate: ${formatPercent(kpis?.cancellation_rate)}`}
            icon={Truck}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
          />
        </div>
      )}

      {/* 1. Monthly Revenue & Order Volume Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Monthly Revenue Trend"
          subtitle="Gross merchandise value trajectory across Indian markets"
          loading={loading}
          error={error}
          isEmpty={!trends || trends.trend.length === 0}
          onRetry={fetchData}
        >
          {trends && <RevenueChart data={trends.trend} />}
        </ChartCard>

        <ChartCard
          title="Monthly Order Trend"
          subtitle="Completed customer transaction volume by month"
          loading={loading}
          error={error}
          isEmpty={!trends || trends.trend.length === 0}
          onRetry={fetchData}
        >
          {trends && <OrdersChart data={trends.trend} />}
        </ChartCard>
      </div>

      {/* 2. Sales by Category, State & Payment Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Sales by Category"
          subtitle="Top product categories ranked by gross turnover"
          loading={loading}
          error={error}
          isEmpty={!salesByCategory?.items || salesByCategory.items.length === 0}
          onRetry={fetchData}
        >
          {salesByCategory?.items && (
            <CategoryChart
              data={salesByCategory.items}
              valueKey="value"
              labelKey="label"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Sales by Indian State"
          subtitle="Geographic turnover across top Indian states"
          loading={loading}
          error={error}
          isEmpty={!salesByState?.items || salesByState.items.length === 0}
          onRetry={fetchData}
        >
          {salesByState?.items && (
            <StateChart
              data={salesByState.items}
              metric="revenue"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Payment Distribution"
          subtitle="Checkout method volume and revenue share breakdown"
          loading={loading}
          error={error}
          isEmpty={!payments?.distribution || payments.distribution.length === 0}
          onRetry={fetchData}
        >
          {payments?.distribution && <PaymentChart data={payments.distribution} />}
        </ChartCard>
      </div>

      {/* 3. Sales by City & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Sales by Indian City"
          subtitle="Top municipal commercial trading hubs by revenue"
          loading={loading}
          error={error}
          isEmpty={!salesByCity?.items || salesByCity.items.length === 0}
          onRetry={fetchData}
        >
          {salesByCity?.items && <CityChart data={salesByCity.items} />}
        </ChartCard>

        <ChartCard
          title="Top Products by Revenue"
          subtitle="Highest revenue-generating SKU items in catalog"
          loading={loading}
          error={error}
          isEmpty={!topProducts?.items || topProducts.items.length === 0}
          onRetry={fetchData}
        >
          {topProducts?.items && <TopProductsChart data={topProducts.items} />}
        </ChartCard>
      </div>

      {/* 4. Product Categories, Customer Segments & Review Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Product Categories Breakdown"
          subtitle="Category revenue contribution & catalog depth"
          loading={loading}
          error={error}
          isEmpty={!productCategories?.items || productCategories.items.length === 0}
          onRetry={fetchData}
        >
          {productCategories?.items && (
            <ProductCategoriesChart data={productCategories.items} />
          )}
        </ChartCard>

        <ChartCard
          title="Customer Segments (K-Means RFM)"
          subtitle="Machine learning clustering cohort distribution"
          loading={loading}
          error={error}
          isEmpty={!segments?.clusters || segments.clusters.length === 0}
          onRetry={fetchData}
        >
          {segments?.clusters && <SegmentChart data={segments.clusters} />}
        </ChartCard>

        <ChartCard
          title="Reviews & Rating Distribution"
          subtitle="Customer satisfaction frequency (1 to 5 Stars)"
          loading={loading}
          error={error}
          isEmpty={!reviews?.rating_distribution || reviews.rating_distribution.length === 0}
          onRetry={fetchData}
        >
          {reviews?.rating_distribution && (
            <ReviewRatingChart
              data={reviews.rating_distribution}
              averageRating={reviews.average_rating}
            />
          )}
        </ChartCard>
      </div>

      {/* Real-time Business Insights Section */}
      {insights?.insights && insights.insights.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Key Business Observations</h3>
              <p className="text-xs text-slate-500">Automated data-driven insights derived from current dataset slice</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.insights.slice(0, 3).map((ins, idx) => (
              <InsightCard key={idx} insight={ins} />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
