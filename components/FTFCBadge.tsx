
import React from 'react';

interface Props {
  status: 'Bullish' | 'Bearish' | 'Mixed';
}

const FTFCBadge: React.FC<Props> = ({ status }) => {
  const config = {
    Bullish: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: '↑' },
    Bearish: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: '↓' },
    Mixed: { color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: '↔' }
  };

  const current = config[status];

  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold flex items-center gap-1 w-fit ${current.color}`}>
      <span className="text-sm">{current.icon}</span>
      {status}
    </span>
  );
};

export default FTFCBadge;
