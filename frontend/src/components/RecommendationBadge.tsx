import React from 'react';
import { Recommendation } from '../types';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface RecommendationBadgeProps {
  recommendation?: Recommendation | null;
  status?: string;
}

export const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({
  recommendation,
  status,
}) => {
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-900/40 text-rose-300 border border-rose-700/50">
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }

  switch (recommendation) {
    case 'strong':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Strong Match
        </span>
      );
    case 'maybe':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertCircle className="w-3.5 h-3.5" />
          Potential Fit
        </span>
      );
    case 'no':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5" />
          Not Recommended
        </span>
      );
  }
};
