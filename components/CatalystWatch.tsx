import React, { useState, useEffect } from 'react';
import { CatalystStock, StockSetup } from '../types';
import { getCatalystInsights } from '../services/kimiService';
import { Flame, Calendar, Info, Zap, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  stocks: StockSetup[];
}

const CatalystWatch: React.FC<Props> = ({ stocks }) => {
  const [catalysts, setCatalysts] = useState<CatalystStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getCatalystInsights(stocks);
        if (mounted) {
          setCatalysts(res);
          if (res.length === 0) setError(true);
        }
      } catch (e) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [stocks.length]); // Re-fetch when stocks change significantly

  if (loading) return (
    <div className="flex gap-4 overflow-hidden py-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="min-w-[300px] h-24 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse"></div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500 fill-rose-500/20" />
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Volatile Catalyst Watch</h3>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {catalysts.length > 0 ? 'Confluence-Aware Intel' : 'Awaiting Data'}
        </div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {catalysts.length > 0 ? catalysts.map((cat, idx) => (
          <div key={idx} className="min-w-[320px] bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all cursor-default group relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
               <Zap className="w-12 h-12 text-indigo-400" />
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">{cat.symbol}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  cat.impact === 'High' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {cat.impact}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <Calendar className="w-3 h-3" /> {cat.date}
              </div>
            </div>
            
            <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-3">{cat.event}</p>
            
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-[10px] font-black border border-indigo-500/30 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Truth #{cat.universalTruth}
              </div>
              <div className="text-[10px] text-slate-500 italic font-medium truncate flex-1">
                {cat.stratAlignment}
              </div>
            </div>
          </div>
        )) : (
          <div className="w-full flex items-center justify-center py-10 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl min-h-[120px]">
             <div className="flex flex-col items-center gap-2">
               {error ? (
                 <>
                   <AlertCircle className="w-5 h-5 text-amber-500/50" />
                   <span className="text-xs font-bold text-slate-600 uppercase tracking-widest text-center">
                     Grounded Search Limited (429)<br/>
                     <span className="text-[10px] opacity-60">Retrying with objective price action only</span>
                   </span>
                 </>
               ) : (
                 <>
                   <RefreshCw className="w-5 h-5 text-indigo-500/30 animate-spin" />
                   <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Scanning Market for Catalysts...</span>
                 </>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalystWatch;