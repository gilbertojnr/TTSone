
import React from 'react';
import { StockSetup } from '../types';
import { Clock, TrendingUp, TrendingDown, ShieldAlert } from 'lucide-react';

interface Props {
  futures: StockSetup[];
}

const MidnightOpenBias: React.FC<Props> = ({ futures }) => {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md h-full flex flex-col">
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic">ICT Midnight Open</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">00:00 EST DAILY BIAS CONTEXT</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1 space-y-4">
        {futures.map((f) => {
          const midnightOpen = f.midnightOpen || f.price * 0.999;
          const isAbove = f.price > midnightOpen;
          return (
            <div key={f.symbol} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${isAbove ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {f.symbol}
                </div>
                <div>
                   <div className="text-xs font-black text-slate-100 uppercase">{f.symbol}</div>
                   <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">M. Open: ${midnightOpen.toFixed(1)}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isAbove ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                   {isAbove ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                   {isAbove ? 'Bullish' : 'Bearish'}
                </div>
                <div className="mt-1 text-[10px] font-mono font-bold text-slate-400">
                  ${f.price.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
        {futures.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 gap-2">
            <ShieldAlert className="w-8 h-8 text-slate-500" />
            <span className="text-[10px] font-bold uppercase">No Futures Data</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-slate-950/40 text-center border-t border-slate-800">
        <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest">Context: Price above midnight open favors longs.</span>
      </div>
    </div>
  );
};

export default MidnightOpenBias;
