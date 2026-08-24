import React from 'react';

interface ScoreBadgeProps {
  score?: number | null;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, status, size = 'md' }) => {
  if (status === 'error') {
    return (
      <div
        className={`inline-flex items-center justify-center font-bold rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800/60 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-2 text-xl' : 'px-3 py-1 text-sm'
        }`}
      >
        <span>Error</span>
      </div>
    );
  }

  const s = typeof score === 'number' ? Math.round(score) : 0;

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  if (s >= 80) {
    colorClasses = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-900/30';
  } else if (s >= 50) {
    colorClasses = 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-900/30';
  } else {
    colorClasses = 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-900/30';
  }

  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'lg'
      ? 'w-16 h-16 text-2xl font-black'
      : 'w-12 h-12 text-base font-extrabold';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-xl border ${colorClasses} ${sizeClasses}`}
      title={`Match Score: ${s}/100`}
    >
      <span>{s}</span>
      {size === 'lg' && <span className="text-[10px] uppercase font-medium tracking-wider opacity-70">/ 100</span>}
    </div>
  );
};
