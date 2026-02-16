
import React, { useState, useEffect } from 'react';
import { StockSetup, StratInsight, AenigmaInsight } from '../types';
import { getStratAnalysis, getAenigmaAnalysis } from '../services/geminiService';
import { BrainCircuit, Loader2, Zap, AlertTriangle, ShieldCheck, Target, Hexagon, Fingerprint, Activity } from 'lucide-react';

interface Props {
  stock?: StockSetup;
}

const AnalysisPanel: React.FC<Props> = ({ stock }) => {
  const [stratInsight, setStratInsight] = useState<StratInsight | null>(null);
  const [aenigmaInsight, setAenigmaInsight] = useState<AenigmaInsight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stock) {
      setLoading(true);
      Promise.all([
        getStratAnalysis(stock),
        getAenigmaAnalysis(stock)
      ]).then(([strat, aenigma]) => {
        setStratInsight(strat);
        setAenigmaInsight(aenigma);
        setLoading(false);
      });
    }
  }, [stock?.symbol]);

  if (!stock) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
        <Fingerprint className="w-12 h-12 opacity-20" />
        <div>
          <h3 className="text-lg font-semibold text-slate-400">Intelligence Hub Offline</h3>
          <p className="text-sm mt-1">Select a ticker to initialize Dual-Agent Protocol Analysis.</p>
        </div>
      </div>
    );
  }

  const isConfluence = stratInsight?.probability === 'High' && (aenigmaInsight?.confluenceScore ?? 0) > 70;

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
      
      {/* Intelligence Status */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${loading ? 'bg-slate-800 animate-pulse' : 'bg-indigo-500/10'}`}>
            <Hexagon className={`w-5 h-5 ${loading ? 'text-slate-600' : 'text-indigo-400'}`} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocol Status</div>
            <div className="text-xs font-bold text-slate-200">
              {loading ? 'Handshaking Protocols...' : 'Dual Confluence Active'}
            </div>
          </div>
        </div>
        {!loading && isConfluence && (
           <div className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-1 rounded border border-emerald-500/40 animate-pulse uppercase">
             Total Confluence
           </div>
        )}
      </div>

      {/* Engine 1: TTS Strat Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
           <Activity className="w-12 h-12 text-indigo-500" />
        </div>
        <div className="flex items-center gap-3 mb-4">
           <BrainCircuit className="w-5 h-5 text-indigo-400" />
           <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest">TTS Strat Engine</h3>
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-indigo-500/40 animate-spin" />
          </div>
        ) : stratInsight ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {stratInsight.analysis}
            </p>
            <div className="flex items-center gap-4">
               <div className="flex-1 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                 <div className="text-[8px] font-bold text-slate-500 uppercase">Target</div>
                 <div className="text-sm font-mono font-bold text-emerald-400">{stratInsight.potentialTarget}</div>
               </div>
               <div className="flex-1 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                 <div className="text-[8px] font-bold text-slate-500 uppercase">Stop</div>
                 <div className="text-sm font-mono font-bold text-rose-400">{stratInsight.stopLoss}</div>
               </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Engine 2: Aenigma-Parvum Agent */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="flex items-center gap-3 mb-4 relative z-10">
           <Zap className="w-5 h-5 text-amber-400" />
           <h3 className="text-sm font-black text-amber-300 uppercase tracking-widest">Aenigma-Parvum Agent</h3>
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500/40 animate-spin" />
          </div>
        ) : aenigmaInsight ? (
          <div className="space-y-4 relative z-10">
            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 italic text-[11px] text-amber-100/80">
              "{aenigmaInsight.protocolNote}"
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Macro Bias</div>
                  <div className={`text-xs font-black uppercase ${aenigmaInsight.macroBias === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {aenigmaInsight.macroBias}
                  </div>
               </div>
               <div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Liquidity Zone</div>
                  <div className="text-xs font-black text-slate-200 font-mono">
                    {aenigmaInsight.liquidityZone}
                  </div>
               </div>
            </div>

            <div className="pt-2">
               <div className="flex items-center justify-between mb-1">
                 <span className="text-[8px] font-black text-slate-500 uppercase">Confluence Score</span>
                 <span className="text-[10px] font-black text-amber-400">{aenigmaInsight.confluenceScore}%</span>
               </div>
               <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-amber-500 transition-all duration-1000" 
                   style={{ width: `${aenigmaInsight.confluenceScore}%` }}
                 ></div>
               </div>
            </div>
          </div>
        ) : null}
      </div>

    </div>
  );
};

export default AnalysisPanel;
