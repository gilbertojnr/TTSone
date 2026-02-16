
import React, { useState, useEffect } from 'react';
import { StockSetup, HighProbSetup } from '../types';
import { getHighProbabilitySetups } from '../services/kimiService';
import { saveSignalToCloud, streamSignals } from '../services/firebaseService';
import { ShieldCheck, TrendingUp, TrendingDown, Target, Zap, AlertTriangle, RefreshCw, Cloud, Fingerprint, Activity } from 'lucide-react';

interface Props {
  stocks: StockSetup[];
}

const HighProbabilityReel: React.FC<Props> = ({ stocks }) => {
  const [setups, setSetups] = useState<HighProbSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = streamSignals((cloudSignals) => {
      setSetups(cloudSignals);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const generateIntelligence = async () => {
      if (generating) return;
      setGenerating(true);
      try {
        const newSetups = await getHighProbabilitySetups(stocks);
        for (const s of newSetups) {
          await saveSignalToCloud(s);
        }
      } catch (e) {
        console.error("AI Intel Generation Failed:", e);
      } finally {
        setGenerating(false);
      }
    };

    const timer = setInterval(generateIntelligence, 1000 * 60 * 10);
    generateIntelligence();
    return () => clearInterval(timer);
  }, [stocks.length]);

  if (loading && setups.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center gap-4 animate-pulse">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Aenigma Protocol Handshake...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-white italic">
            Confluence Signal Feed
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-tighter flex items-center gap-1">
            <Cloud className="w-2.5 h-2.5" />
            Global Sync
          </div>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar snap-x">
        {setups.map((setup, idx) => {
          const isConfluence = setup.protocol === 'CONFLUENCE';
          const isAenigma = setup.protocol === 'AENIGMA';
          
          return (
            <div 
              key={`${setup.symbol}-${idx}`} 
              className={`min-w-[340px] bg-slate-900 border rounded-2xl p-5 hover:scale-[1.02] transition-all cursor-default group relative overflow-hidden shadow-xl snap-start ${
                isConfluence ? 'border-emerald-500/40' : 'border-slate-800'
              }`}
            >
              <div 
                className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${
                  isConfluence ? 'bg-emerald-500' : 'bg-indigo-500'
                }`} 
                style={{ width: `${setup.probability}%` }}
              ></div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${setup.direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {setup.symbol}
                  </div>
                  <div>
                    <div className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      {setup.pattern}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${setup.direction === 'Long' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {setup.direction} Setup
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border uppercase ${
                        isConfluence ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                        isAenigma ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                        'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      }`}>
                        {setup.protocol || 'TTS'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-200 leading-none">{setup.probability}%</div>
                  <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Conf Score</div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 mb-4 min-h-[60px]">
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {setup.reasoning}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Target:</span>
                  <span className="text-[11px] font-mono font-black text-white">{setup.target}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase">
                  <Fingerprint className="w-3 h-3" />
                  Protocol Verified
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HighProbabilityReel;
