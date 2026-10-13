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
import { CrossDatasetAnalyticsView } from '@/components/analytics/CrossDatasetAnalyticsView';
import { Database, Network, Files } from 'lucide-react';
import { formatNumber } from '@/utils/formatting';

export function DatasetModulePage() {
  const { moduleId = 'overview' } = useParams<{ moduleId?: string }>();
  const {
    profile,
    datasetName,
    status,
    modules,
    analysis,
    activeAnalytics,
    isMultiDataset,
    multiDatasetProfile,
    selectedDatasetId,
    selectDataset,
    resetDataset,
  } = useDataset();

  // If no dataset analyzed, show empty prompt
  if (status !== 'analyzed' || !profile) {
    return (
      <PageContainer>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center max-w-xl mx-auto shadow-xs my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400 shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            No Dataset Analyzed Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Upload your CSV, Excel, or JSON dataset first. The system will profile its structure and determine the relevant analytics modules dynamically.
          </p>
          <div className="mt-6">
            <Link
              to="/upload-analytics"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
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
      case 'cross-dataset':
        return <CrossDatasetAnalyticsView />;

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
      {/* Multi-Dataset Context Bar & Selector (for individual analytics views) */}
      {isMultiDataset && multiDatasetProfile && moduleId !== 'cross-dataset' && (
        <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Selected Dataset ({multiDatasetProfile.dataset_count} Available)
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={selectedDatasetId || multiDatasetProfile.datasets[0]?.dataset_id}
                  onChange={(e) => selectDataset(e.target.value)}
                  className="text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                >
                  {multiDatasetProfile.datasets.map((ds) => (
                    <option key={ds.dataset_id} value={ds.dataset_id}>
                      {ds.filename} ({formatNumber(ds.rows)} rows, {ds.columns} cols)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              to="/upload-analytics"
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Data Model</span>
            </Link>
          </div>
        </div>
      )}

      {moduleId !== 'cross-dataset' && <DatasetGlobalFilterBar />}
      {renderModuleContent()}
    </PageContainer>
  );
}

export default DatasetModulePage;
