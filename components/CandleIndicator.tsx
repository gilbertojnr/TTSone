
import React from 'react';
import { CandleType } from '../types';

interface Props {
  type: CandleType;
  label: string;
}

const CandleIndicator: React.FC<Props> = ({ type, label }) => {
  const getColors = () => {
    switch (type) {
      case CandleType.Type1:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case CandleType.Type2U:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case CandleType.Type2D:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case CandleType.Type3:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
      <div className={`w-8 h-8 rounded border flex items-center justify-center font-black text-sm transition-all hover:scale-110 cursor-help ${getColors()}`} title={`${label}: ${type}`}>
        {type}
      </div>
    </div>
  );
};

export default CandleIndicator;
