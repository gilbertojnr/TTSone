import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ScannerTable from './components/ScannerTable';
import AnalysisPanel from './components/AnalysisPanel';
import MarketPulseBanner from './components/MarketPulseBanner';
import CatalystWatch from './components/CatalystWatch';
import MidnightOpenBias from './components/MidnightOpenBias';
import HighProbabilityReel from './components/HighProbabilityReel';
import StratChat from './components/StratChat';
import { MOCK_STOCKS, EnhancedStockSetup } from './constants';
import { CandleType, StockCategory } from './types';
import { marketStream } from './services/marketDataService';
import { getWatchlistFromCloud } from './services/firebaseService';
import { LayoutGrid, Info, Database, Activity, Wifi, RefreshCcw, History, TrendingUp, BarChart3, Cloud, CloudLightning } from 'lucide-react';

const App: React.FC = () => {
  const [stocks, setStocks] = useState<EnhancedStockSetup[]>(MOCK_STOCKS);
  const [selectedStock, setSelectedStock] = useState<EnhancedStockSetup | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'scanner' | 'rules' | 'education'>('scanner');
  const [isLive, setIsLive] = useState(true);
  const [connStatus, setConnStatus] = useState<any>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [canShowCatalysts, setCanShowCatalysts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      const hasMassiveKey = !!import.meta.env.VITE_MASSIVE_API_KEY;
      const hasFinnhubKey = !!import.meta.env.VITE_FINNHUB_API_KEY;
      
      if (!hasMassiveKey && !hasFinnhubKey) {
        setError('No API keys configured. Please set VITE_MASSIVE_API_KEY or VITE_FINNHUB_API_KEY in .env.local');
        setSyncing(false);
        return;
      }
      
      try {
        setSyncing(true);
        setError(null);
        await getWatchlistFromCloud();
        
        // WebSocket-only: Get initial prices from cache after connection
        // The WebSocket will populate the cache with live data
        setTimeout(() => {
          const cachedPrices = marketStream.getAllCachedPrices();
          if (Object.keys(cachedPrices).length > 0) {
            setStocks(prev => prev.map(stock => {
              const cached = cachedPrices[stock.symbol];
              if (cached) {
                return {
                  ...stock,
                  price: cached.price,
                  change: cached.change,
                  changePercent: cached.changePercent
                };
              }
              return stock;
            }));
          }
          setSyncing(false);
          setTimeout(() => setCanShowCatalysts(true), 1000);
        }, 2000); // Wait 2s for WebSocket to populate cache
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize data');
        setSyncing(false);
      }
    };

    initializeData();
    marketStream.onStatusChange((status) => setConnStatus(status));
    marketStream.connectToLiveProvider('massive');
  }, []);

  const handleMarketUpdate = useCallback((symbol: string, price: number, tick: number) => {
    setStocks(prev => prev.map(s => {
      if (s.symbol === symbol) {
        const nPrice = price > 0 ? price : s.price * (1 + tick);
        const nChange = nPrice - (s.openPrice || nPrice);
        return { ...s, price: nPrice, change: nChange, changePercent: s.openPrice ? (nChange / s.openPrice) * 100 : 0 };
      }
      return s;
    }));
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (isLive) marketStream.subscribe(handleMarketUpdate);
    else marketStream.unsubscribe(handleMarketUpdate);
    return () => marketStream.unsubscribe(handleMarketUpdate);
  }, [isLive, handleMarketUpdate]);

  const getStatusDisplay = () => {
    if (syncing) return { label: 'SYNCING INFRA...', color: 'text-indigo-400', icon: <RefreshCcw className="w-3 h-3 animate-spin" /> };
    switch(connStatus) {
      case 'cloud_active': return { label: 'CLOUD-NODE ACTIVE', color: 'text-emerald-400', icon: <CloudLightning className="w-3 h-3" /> };
      case 'connected': return { label: 'LIVE FEED (FINNHUB)', color: 'text-sky-400', icon: <Wifi className="w-3 h-3" /> };
      case 'reconnecting': return { label: 'HANDSHAKING...', color: 'text-amber-500', icon: <RefreshCcw className="w-3 h-3 animate-spin" /> };
      case 'error': return { label: 'PROTO ERROR', color: 'text-rose-500', icon: <Activity className="w-3 h-3" /> };
      default: return { label: 'OFFLINE', color: 'text-slate-500', icon: <Wifi className="w-3 h-3 opacity-20" /> };
    }
  };

  const status = getStatusDisplay();
  const watchlist = useMemo(() => stocks.filter(s => s.category === 'Watchlist'), [stocks]);
  const indices = useMemo(() => stocks.filter(s => s.category === 'Indices'), [stocks]);
  const futures = useMemo(() => stocks.filter(s => s.category === 'Futures'), [stocks]);

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      <aside className="w-16 md:w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-8 z-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20"><Activity className="w-6 h-6 text-white" /></div>
        <nav className="flex flex-col gap-6">
          <button onClick={() => setActiveTab('scanner')} className={`p-3 rounded-xl ${activeTab === 'scanner' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500'}`}><LayoutGrid className="w-6 h-6" /></button>
          <button onClick={() => setActiveTab('rules')} className={`p-3 rounded-xl ${activeTab === 'rules' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500'}`}><Database className="w-6 h-6" /></button>
          <button onClick={() => setActiveTab('education')} className={`p-3 rounded-xl ${activeTab === 'education' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500'}`}><Info className="w-6 h-6" /></button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/80 backdrop-blur-xl">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic strat-glow leading-none">TTS<span className="text-indigo-500 ml-1">Cloud</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] font-black ${status.color} uppercase tracking-[0.2em] flex items-center gap-1`}>
                {status.icon} {status.label} {lastUpdate ? `| ${lastUpdate}` : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
               <Cloud className="w-3 h-3" />
               ID: gen-lang-client-0278144585
            </div>
            <button onClick={() => setIsLive(!isLive)} className={`px-5 py-1.5 rounded-full text-[10px] font-black transition-all uppercase tracking-widest border ${isLive ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {isLive ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {error && (
            <div className="max-w-[1600px] mx-auto mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <p className="text-rose-400 text-sm font-medium">{error}</p>
            </div>
          )}
          <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
            {activeTab === 'scanner' && (
              <>
                <MarketPulseBanner stocks={stocks} />
                <HighProbabilityReel stocks={stocks} />
                {canShowCatalysts && <CatalystWatch stocks={stocks} />}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                  <div className="xl:col-span-3 space-y-12">
                    <ScannerTable stocks={watchlist} onSelect={setSelectedStock} selectedSymbol={selectedStock?.symbol} title="Cloud Watchlist" subtitle="Aggregated Real-Time Intelligence" icon={<TrendingUp className="w-5 h-5 text-indigo-400" />} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <ScannerTable stocks={indices} onSelect={setSelectedStock} title="Global Indices" subtitle="Broad Market Context" icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} />
                      <MidnightOpenBias futures={futures} />
                    </div>
                  </div>
                  <div className="xl:col-span-1"><div className="sticky top-4"><AnalysisPanel stock={selectedStock} /></div></div>
                </div>
              </>
            )}
          </div>
        </div>
        <StratChat />
      </main>
    </div>
  );
};

export default App;