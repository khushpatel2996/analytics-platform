import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { formatLabel } from '@/utils/formatting';
import { DatasetProvider, useDataset } from '@/context/DatasetContext';


import { ThemeProvider } from '@/context/ThemeContext';

// Pages
import { DashboardPage } from '@/pages/DashboardPage';
import { SalesPage } from '@/pages/SalesPage';
import { GeographyPage } from '@/pages/GeographyPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerSegmentsPage } from '@/pages/CustomerSegmentsPage';
import { SellersPage } from '@/pages/SellersPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { UploadAnalytics } from '@/pages/UploadAnalytics';
import { DatasetModulePage } from '@/pages/DatasetModulePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const ROUTE_CONFIG: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'India Sales Overview',
    subtitle: 'Monitor sales, customers, products, and geographic performance across India',
  },
  '/upload-analytics': {
    title: 'Upload & Analyze',
    subtitle: 'Upload your own dataset and generate personalized analytics.',
  },
  '/dataset/overview': {
    title: 'Dataset Overview',
    subtitle: 'Statistical distribution, columns, and sample preview of analyzed dataset',
  },
  '/dataset/cross-dataset': {
    title: 'Cross-Dataset Analytics',
    subtitle: 'Unified cross-dataset intelligence across connected data models',
  },
  '/sales': {
    title: 'Sales Analytics',
    subtitle: 'Analyze revenue and order performance over time and across categories',
  },
  '/geography': {
    title: 'India Geography',
    subtitle: 'Explore sales performance across 20 Indian states and 4,000+ cities',
  },
  '/products': {
    title: 'Product Performance',
    subtitle: 'Understand which products and categories drive marketplace sales',
  },
  '/customers': {
    title: 'Customer Analytics',
    subtitle: 'Analyze customer behavior, acquisition trends, and purchasing patterns',
  },
  '/customers/segments': {
    title: 'Customer Segmentation',
    subtitle: 'Explore customer groups using RFM quintile scoring and K-Means clustering',
  },
  '/sellers': {
    title: 'Seller Analytics',
    subtitle: 'Analyze seller performance, orders fulfilled, and geographic distribution',
  },
  '/payments': {
    title: 'Payment Analytics',
    subtitle: 'Understand checkout payment method adoption and transaction distribution',
  },
  '/reviews': {
    title: 'Review & Satisfaction',
    subtitle: 'Analyze customer rating distribution and category sentiment benchmarks',
  },
  '/insights': {
    title: 'Business Insights',
    subtitle: 'Data-driven executive observations generated dynamically from active dataset slice',
  },
};

function LayoutWrapper() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { datasetName, crossAnalytics, dataModel, profile, totalRows } = useDataset();

  let currentRoute = ROUTE_CONFIG[location.pathname];
  if (!currentRoute && location.pathname.startsWith('/dataset/')) {
    const sub = location.pathname.replace('/dataset/', '');
    if (sub === 'outliers') {
      currentRoute = {
        title: 'Unusual Values',
        subtitle: 'Identify statistically unusual records that may require further investigation.',
      };
    } else if (sub === 'cross-dataset') {
      currentRoute = {
        title: 'Cross-Dataset Analytics',
        subtitle: 'Unified cross-dataset intelligence across connected data models',
      };
    } else {
      currentRoute = {
        title: sub === 'overview' ? 'Dataset Overview' : `${formatLabel(sub)} Analytics`,
        subtitle: datasetName ? `Dynamic module for ${datasetName}` : 'Dataset-driven analytics workspace',
      };
    }
  } else if (!currentRoute) {
    currentRoute = {
      title: 'Analytics Platform',
      subtitle: 'Generic Dataset Intelligence',
    };
  }

  let metadataInfo: string | undefined;
  if (location.pathname === '/dataset/cross-dataset') {
    const connected =
      (crossAnalytics?.groups && crossAnalytics.groups.length > 0
        ? crossAnalytics.groups[0].datasets
        : null) ||
      (dataModel?.connected_components && dataModel.connected_components.length > 0
        ? dataModel.connected_components[0].datasets
        : null) ||
      dataModel?.datasets?.map((d) => d.filename) ||
      [];
    const relCount = dataModel?.relationships?.length || 0;
    if (connected.length > 0) {
      metadataInfo = `${connected.join(' ↔ ')} · ${connected.length} datasets connected${relCount > 0 ? ` · ${relCount} relationships` : ''}`;
    } else {
      metadataInfo = 'Combined Analysis';
    }
  } else if (location.pathname.startsWith('/dataset') && datasetName) {
    const colCount = profile?.columns?.length || profile?.dataset?.columns || 0;
    const parts = [
      datasetName,
      totalRows ? `${totalRows.toLocaleString()} rows` : null,
      colCount ? `${colCount} cols` : null,
    ].filter(Boolean);
    metadataInfo = parts.join(' · ');
  } else {
    metadataInfo = undefined;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title={currentRoute.title}
          subtitle={currentRoute.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          metadataInfo={metadataInfo}
        />

        <div className="flex-1 pb-12">
          <Routes>
            <Route path="/" element={<Navigate to="/upload-analytics" replace />} />
            <Route path="/upload-analytics" element={<UploadAnalytics />} />
            <Route path="/dataset/overview" element={<DatasetModulePage />} />
            <Route path="/dataset/:moduleId" element={<DatasetModulePage />} />
            
            {/* Built-in India Sales Analytics Routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/geography" element={<GeographyPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/segments" element={<CustomerSegmentsPage />} />
            <Route path="/sellers" element={<SellersPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <DatasetProvider>
          <LayoutWrapper />
        </DatasetProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
