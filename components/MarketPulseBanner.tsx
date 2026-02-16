
import React, { useState, useEffect, useCallback } from 'react';
import { StockSetup, MarketPulse } from '../types';
import { getMarketPulse } from '../services/geminiService';
import { Sparkles, ArrowRight, TrendingUp, TrendingDown, Minus, ExternalLink, Globe, RefreshCcw, Quote } from 'lucide-react';

interface Props {
  stocks: StockSetup[];
}

const ROB_SMITH_QUOTES = [
  "The Strat: It is what it is.",
  "Trust the Strat.",
  "Price action is the only truth.",
  "Broadening formations are the result of 3 bars.",
  "Full Time Frame Continuity is non-negotiable.",
  "Objective Truth: Price over opinion.",
  "Look for the 2-2 reversal.",
  "Inside bars are the quiet before the storm.",
  "Everything else is just noise.",
  "Multiple time frame analysis is the key to the kingdom.",
  "Don't guess, just watch the candles.",
  "The 3-1-2 is the most powerful reversal."
];

const MarketPulseBanner: React.FC<Props> = ({ stocks }) => {
  const [pulse, setPulse] = useState<(MarketPulse & { sources?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<number>(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const fetchPulse = useCallback(async (force = false) => {
    // Prevent spamming
    if (!force && Date.now() - lastRefreshed < 1000 * 30) return;
    
    setLoading(true);
    try {
      const res = await getMarketPulse(stocks);
      setPulse(res);
      setLastRefreshed(Date.now());
    } finally {
      setLoading(false);
    }
  }, [stocks, lastRefreshed]);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  // Cycle Rob Smith Clarion Quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % ROB_SMITH_QUOTES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !pulse) return (
    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex items-center justify-center animate-pulse">
      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Grounded Intelligence Sync...</span>
    </div>
  );

  const BiasIcon = pulse?.marketBias === 'Bullish' ? TrendingUp : pulse?.marketBias === 'Bearish' ? TrendingDown : Minus;
  const biasColor = pulse?.marketBias === 'Bullish' ? 'text-emerald-400' : pulse?.marketBias === 'Bearish' ? 'text-rose-400' : 'text-slate-400';

  return (
    <div className="bg-gradient-to-r from-indigo-500/10 via-slate-900 to-transparent border border-indigo-500/20 rounded-2xl shadow-2xl relative overflow-hidden group pt-12 pb-6 px-6">
      
      {/* Clarion Ticker of Quotes */}
      <div className="absolute top-0 left-0 w-full h-10 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center px-6 overflow-hidden">
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top duration-1000 w-full" key={quoteIndex}>
          <Quote className="w-3 h-3 text-indigo-500/40 fill-indigo-500/5 shrink-0" />
          <span className="text-[11px] font-black text-indigo-400/80 uppercase tracking-[0.2em] whitespace-nowrap italic">
            {ROB_SMITH_QUOTES[quoteIndex]}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent ml-4"></div>
          <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest hidden md:block">Strat Clarion</span>
        </div>
      </div>

      {/* Decorative Background Element */}
      <div className="absolute top-10 right-0 p-8 opacity-5">
         <Sparkles className="w-24 h-24 text-indigo-500" />
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-indigo-500 p-1 rounded">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Real-Time Grounded Analysis</span>
              {loading && <RefreshCcw className="w-2.5 h-2.5 text-indigo-400 animate-spin ml-2" />}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
              {pulse?.summary}
            </h2>
            <div className="flex items-center gap-4 pt-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold ${biasColor}`}>
                <BiasIcon className="w-3 h-3" />
                {pulse?.marketBias} Bias
              </div>
              <p className="text-sm text-slate-400 font-medium italic">
                <span className="text-indigo-400 not-italic font-bold uppercase text-[10px] mr-2 tracking-widest">Active Setup:</span>
                {pulse?.topPick}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchPulse(true)}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Intelligence"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 group-hover:scale-105 active:scale-95 whitespace-nowrap uppercase tracking-widest">
              Market Scan <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grounding Sources */}
        {pulse?.sources && pulse.sources.length > 0 && (
          <div className="pt-4 mt-2 border-t border-slate-800/50 flex flex-wrap gap-4 items-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Globe className="w-3 h-3" /> Grounding:
            </span>
            {pulse.sources.slice(0, 3).map((chunk: any, idx: number) => (
              <a 
                key={idx}
                href={chunk.web?.uri || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors border-b border-indigo-500/20"
              >
                {chunk.web?.title || 'External Reference'}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPulseBanner;
