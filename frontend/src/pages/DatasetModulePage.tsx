import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { UploadCloud, ArrowRight } from 'lucide-react';
import { useDataset } from '@/context/DatasetContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { DatasetGlobalFilterBar } from '@/components/filters/DatasetGlobalFilterBar';
import { OverviewAnalyticsView } from '@/components/analytics/OverviewAnalyticsView';
import { MetricDetailView } from '@/components/analytics/MetricDetailView';
import { TrendsAnalyticsView } from '@/components/analytics/TrendsAnalyticsView';
import { DistributionsAnalyticsView } from '@/components/analytics/DistributionsAnalyticsView';
import { RankingsAnalyticsView } from '@/components/analytics/RankingsAnalyticsView';
import { GeographyAnalyticsView } from '@/components/analytics/GeographyAnalyticsView';
import { CorrelationsAnalyticsView } from '@/components/analytics/CorrelationsAnalyticsView';
import { OutliersAnalyticsView } from '@/components/analytics/OutliersAnalyticsView';
import { DataQualityAnalyticsView } from '@/components/analytics/DataQualityAnalyticsView';
import { InsightsAnalyticsView } from '@/components/analytics/InsightsAnalyticsView';

export function DatasetModulePage() {
  const { moduleId = 'overview' } = useParams<{ moduleId?: string }>();
  const { profile, datasetName, status, modules, analysis, activeAnalytics } = useDataset();

  // If no dataset analyzed, show empty prompt
  if (status !== 'analyzed' || !profile) {
    return (
      <PageContainer>
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto shadow-xs my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            No Dataset Analyzed Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Upload your CSV, Excel, or JSON dataset first. The system will profile its structure and determine the relevant analytics modules dynamically.
          </p>
          <div className="mt-6">
            <Link
              to="/upload-analytics"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all"
            >
              <span>Go to Upload & Analyze</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const currentModule = modules.find((m) => m.id === moduleId);
  const moduleTitle = currentModule?.title || moduleId.replace(/-/g, ' ').toUpperCase();
  const moduleDescription = currentModule?.description;
  const analytics = activeAnalytics || analysis?.analytics;

  // Render module view based on moduleId
  const renderModuleContent = () => {
    switch (moduleId) {
      case 'overview':
        return (
          <OverviewAnalyticsView
            datasetName={datasetName || 'Dataset'}
            profile={profile}
            analytics={analytics}
          />
        );

      case 'trends':
        return (
          <TrendsAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'distributions':
      case 'categories':
      case 'departments':
        return (
          <DistributionsAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'rankings':
      case 'products':
      case 'customers':
      case 'students':
      case 'employees':
        return (
          <RankingsAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'geography':
        return (
          <GeographyAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'correlations':
        return (
          <CorrelationsAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'outliers':
        return (
          <OutliersAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'data-quality':
        return (
          <DataQualityAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'insights':
        return (
          <InsightsAnalyticsView
            moduleTitle={moduleTitle}
            analytics={analytics}
          />
        );

      case 'sales-revenue':
      case 'compensation':
      case 'tuition-fees':
      case 'academic-performance':
      case 'attendance':
      case 'payments':
      default:
        // Render detailed quantitative metric view
        return (
          <MetricDetailView
            moduleTitle={moduleTitle}
            moduleDescription={moduleDescription}
            analytics={analytics}
          />
        );
    }
  };

  return (
    <PageContainer>
      <DatasetGlobalFilterBar />
      {renderModuleContent()}
    </PageContainer>
  );
}

export default DatasetModulePage;
