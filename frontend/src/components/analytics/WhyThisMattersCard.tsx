import React from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

interface WhyThisMattersCardProps {
  text?: string | null;
  moduleTitle?: string;
}

export function WhyThisMattersCard({ text, moduleTitle }: WhyThisMattersCardProps) {
  if (!text) return null;

  return (
    <div className="bg-linear-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-xl p-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Why This Matters</span>
              {moduleTitle && (
                <span className="text-slate-400 font-normal">• {moduleTitle} Context</span>
              )}
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider ml-auto shrink-0">
              Business Interpretation
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
