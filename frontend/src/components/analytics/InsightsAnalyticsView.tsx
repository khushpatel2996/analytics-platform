import React from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Award,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { DatasetAnalytics } from '@/types';
import { WhyThisMattersCard } from './WhyThisMattersCard';

interface InsightsAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function InsightsAnalyticsView({
  moduleTitle,
  analytics,
}: InsightsAnalyticsViewProps) {
  const insights = analytics?.insights || [];
  const whyThisMatters = analytics?.why_this_matters?.insights;

  if (insights.length === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle}
          text={whyThisMatters || 'Automated discoveries summarize factual statistical findings calculated directly from the dataset without preconceived assumptions.'}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
          <Lightbulb className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Generating Insights
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            No automated insight statements could be synthesized for this dataset structure.
          </p>
        </div>
      </div>
    );
  }

  const getInsightCategory = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('unusual') || lower.includes('outlier')) {
      return {
        label: 'Unusual Values',
        icon: AlertTriangle,
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        isUnusual: true,
      };
    }
    if (lower.includes('health') || lower.includes('score') || lower.includes('completeness')) {
      return { label: 'Data Quality & Health', icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', isUnusual: false };
    }
    if (lower.includes('peaked') || lower.includes('cycle') || lower.includes('velocity') || lower.includes('period')) {
      return { label: 'Temporal Velocity', icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-200', isUnusual: false };
    }
    if (lower.includes('ranking') || lower.includes('leads') || lower.includes('leader')) {
      return { label: 'Top Performance', icon: Award, color: 'text-amber-700 bg-amber-50 border-amber-200', isUnusual: false };
    }
    return { label: 'Statistical Finding', icon: Sparkles, color: 'text-purple-700 bg-purple-50 border-purple-200', isUnusual: false };
  };

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || 'Automated discoveries summarize factual statistical findings calculated directly from the dataset without preconceived assumptions.'}
      />
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key findings, correlations, and performance benchmarks synthesized from mathematical analysis.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shrink-0">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{insights.length} Factual Insights</span>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => {
          const category = getInsightCategory(insight);
          const Icon = category.icon;

          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1.5 ${category.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{category.label}</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {insight}
                </p>

                {category.isUnusual && (
                  <div className="mt-3 pt-2">
                    <Link
                      to="/dataset/outliers"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      <span>Investigate unusual values</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Derived from dataset mathematics</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
