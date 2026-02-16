import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StockSetup, CandleType } from '../types';
import CandleIndicator from './CandleIndicator';
import FTFCBadge from './FTFCBadge';
import { Search, TrendingUp, TrendingDown, Target, Zap, Activity, Filter, X } from 'lucide-react';

interface Props {
  stocks: StockSetup[];
  onSelect: (stock: StockSetup) => void;
  selectedSymbol?: string;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

const PriceCell: React.FC<{ stock: StockSetup }> = ({ stock }) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const [activeSignal, setActiveSignal] = useState(false);
  const prevPriceRef = useRef(stock.price);

  useEffect(() => {
    if (stock.price !== prevPriceRef.current) {
      setActiveSignal(true);
      const sTimer = setTimeout(() => setActiveSignal(false), 500);

      if (stock.price > prevPriceRef.current) {
        setFlash('up');
      } else if (stock.price < prevPriceRef.current) {
        setFlash('down');
      }
      const tTimer = setTimeout(() => setFlash(null), 300);
      
      prevPriceRef.current = stock.price;
      return () => {
        clearTimeout(sTimer);
        clearTimeout(tTimer);
      };
    }
  }, [stock.price]);

  const price = stock.price ?? 0;

  return (
    <div className={`px-6 py-4 text-right transition-colors duration-300 relative ${
      flash === 'up' ? 'bg-emerald-500/5' : flash === 'down' ? 'bg-rose-500/5' : ''
    }`}>
      <div className={`font-mono text-sm font-bold transition-colors flex items-center justify-end gap-2 ${
        flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-rose-400' : 'text-slate-100'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 transition-opacity duration-300 ${activeSignal ? 'opacity-100 shadow-[0_0_8px_rgba(99,102,241,1)]' : 'opacity-0'}`}></div>
        ${price.toFixed(price < 50 ? 3 : 2)}
      </div>
      <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {stock.change >= 0 ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
        {stock.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      </div>
    </div>
  );
};

const ScannerTable: React.FC<Props> = ({ stocks, onSelect, selectedSymbol, title, subtitle, icon }) => {
  const [filter4H, setFilter4H] = useState<CandleType | null>(null);
  const [filter1H, setFilter1H] = useState<CandleType | null>(null);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      const match4H = !filter4H || s.timeframes.h4 === filter4H;
      const match1H = !filter1H || s.timeframes.h1 === filter1H;
      return match4H && match1H;
    });
  }, [stocks, filter4H, filter1H]);

  const FilterGroup = ({ label, current, setter }: { label: string, current: CandleType | null, setter: (t: CandleType | null) => void }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
        {[CandleType.Type1, CandleType.Type2U, CandleType.Type2D, CandleType.Type3].map(type => (
          <button
            key={type}
            onClick={() => setter(current === type ? null : type)}
            className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-black transition-all border ${
              current === type 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            {icon || <Target className="w-5 h-5 text-indigo-400" />}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic">{title}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <FilterGroup label="Filter 4H" current={filter4H} setter={setFilter4H} />
            <FilterGroup label="Filter 1H" current={filter1H} setter={setFilter1H} />
          </div>
          {(filter4H || filter1H) && (
            <button 
              onClick={() => { setFilter4H(null); setFilter1H(null); }}
              className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/40 text-slate-500 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-800/50">
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4">Bias</th>
              <th className="px-6 py-4 text-center">Strat (M W D 4H 1H)</th>
              <th className="px-6 py-4">Pattern</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredStocks.map((stock) => (
              <tr 
                key={stock.symbol}
                onClick={() => onSelect(stock)}
                className={`group cursor-pointer transition-all ${
                  selectedSymbol === stock.symbol 
                  ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20' 
                  : 'hover:bg-slate-800/40'
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-400 transition-all">
                      {stock.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-slate-100 text-sm tracking-tight group-hover:text-indigo-300 transition-colors uppercase">{stock.symbol}</div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{stock.category}</div>
                    </div>
                  </div>
                </td>
                
                <PriceCell stock={stock} />

                <td className="px-6 py-4">
                  <FTFCBadge status={stock.ftfc} />
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <CandleIndicator type={stock.timeframes.monthly} label="M" />
                    <CandleIndicator type={stock.timeframes.weekly} label="W" />
                    <CandleIndicator type={stock.timeframes.daily} label="D" />
                    <CandleIndicator type={stock.timeframes.h4} label="4H" />
                    <CandleIndicator type={stock.timeframes.h1} label="1H" />
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 w-fit uppercase tracking-tighter flex items-center gap-1.5">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      {stock.pattern}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredStocks.length === 0 && (
        <div className="p-10 flex flex-col items-center justify-center text-slate-600 gap-4">
          <Activity className="w-8 h-8 opacity-20 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-widest">No assets match criteria</p>
        </div>
      )}
    </div>
  );
};

export default ScannerTable;