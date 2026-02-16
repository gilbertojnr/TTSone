
import { CandleType, StockSetup } from './types';

export interface EnhancedStockSetup extends StockSetup {
  openPrice: number;
}

const getRandomCandle = () => {
  const types = [CandleType.Type1, CandleType.Type2U, CandleType.Type2D, CandleType.Type3];
  return types[Math.floor(Math.random() * types.length)];
};

const createRandomTimeframes = () => ({
  monthly: getRandomCandle(),
  weekly: getRandomCandle(),
  daily: getRandomCandle(),
  h4: getRandomCandle(),
  h1: getRandomCandle()
});

const getFTFCFromTimeframes = (tf: any): 'Bullish' | 'Bearish' | 'Mixed' => {
  const values = Object.values(tf);
  const up = values.filter(v => v === CandleType.Type2U).length;
  const down = values.filter(v => v === CandleType.Type2D).length;
  if (up >= 3) return 'Bullish';
  if (down >= 3) return 'Bearish';
  return 'Mixed';
};

export const MOCK_STOCKS: EnhancedStockSetup[] = [
  // MAG 7
  { symbol: 'AAPL', price: 180, openPrice: 181, change: -1, changePercent: -0.5, timeframes: createRandomTimeframes(), ftfc: 'Bearish', pattern: 'Inside Bar (W)', volume: '55M', category: 'Watchlist' },
  { symbol: 'MSFT', price: 410, openPrice: 405, change: 5, changePercent: 1.2, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: '2-2 Reversal Up', volume: '22M', category: 'Watchlist' },
  { symbol: 'GOOGL', price: 155, openPrice: 153, change: 2, changePercent: 1.3, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: '2-1-2 Cont (D)', volume: '28M', category: 'Watchlist' },
  { symbol: 'AMZN', price: 175, openPrice: 174, change: 1, changePercent: 0.6, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: '1-2 Cont Up', volume: '33M', category: 'Watchlist' },
  { symbol: 'META', price: 490, openPrice: 485, change: 5, changePercent: 1.0, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: '3-2 Reversal', volume: '18M', category: 'Watchlist' },
  { symbol: 'TSLA', price: 170, openPrice: 175, change: -5, changePercent: -2.8, timeframes: createRandomTimeframes(), ftfc: 'Bearish', pattern: '2-2 Rev Down', volume: '95M', category: 'Watchlist' },
  { symbol: 'NVDA', price: 900, openPrice: 880, change: 20, changePercent: 2.2, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Broadening 3', volume: '45M', category: 'Watchlist' },
  
  // High Vol Extras
  { symbol: 'AMD', price: 185, openPrice: 182, change: 3, changePercent: 1.6, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: '2-2 Reversal Up', volume: '40M', category: 'Watchlist' },
  { symbol: 'SMCI', price: 1100, openPrice: 1050, change: 50, changePercent: 4.7, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Gap and Go 2', volume: '12M', category: 'Watchlist' },
  { symbol: 'PLTR', price: 25, openPrice: 24, change: 1, changePercent: 4.1, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Strat Breakout', volume: '65M', category: 'Watchlist' },

  // INDICES
  { symbol: 'SPY', price: 515, openPrice: 512, change: 3, changePercent: 0.6, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Market Bias Up', volume: '70M', category: 'Indices' },
  { symbol: 'QQQ', price: 440, openPrice: 435, change: 5, changePercent: 1.1, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Tech Strength', volume: '50M', category: 'Indices' },
  { symbol: 'DIA', price: 390, openPrice: 389, change: 1, changePercent: 0.3, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Value Hold', volume: '5M', category: 'Indices' },
  { symbol: 'IWM', price: 205, openPrice: 207, change: -2, changePercent: -0.9, timeframes: createRandomTimeframes(), ftfc: 'Bearish', pattern: 'Small Cap 2-2', volume: '25M', category: 'Indices' },
  { symbol: 'VIX', price: 14.5, openPrice: 15, change: -0.5, changePercent: -3.3, timeframes: createRandomTimeframes(), ftfc: 'Mixed', pattern: 'Volatility Crush', volume: '1M', category: 'Indices' },

  // METALS
  { symbol: 'GLD', price: 200, openPrice: 198, change: 2, changePercent: 1.0, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Safe Haven 2', volume: '8M', category: 'Metals' },
  { symbol: 'SLV', price: 23.5, openPrice: 23, change: 0.5, changePercent: 2.1, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Metal 2-1-2', volume: '15M', category: 'Metals' },
  { symbol: 'GDX', price: 30.2, openPrice: 29.8, change: 0.4, changePercent: 1.3, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Mining Rev', volume: '10M', category: 'Metals' },

  // ICT FUTURES (Simulated with Proxy Symbols for Finnhub if needed, otherwise use indices as placeholders)
  { symbol: 'MNQ', price: 18200, openPrice: 18150, change: 50, changePercent: 0.28, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'FVG Entry', volume: '2M', category: 'Futures', midnightOpen: 18180 },
  { symbol: 'MES', price: 5120, openPrice: 5100, change: 20, changePercent: 0.39, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Judas Swing', volume: '1.5M', category: 'Futures', midnightOpen: 5110 },
  { symbol: 'MGC', price: 2180, openPrice: 2170, change: 10, changePercent: 0.46, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'Silver Bullet', volume: '800K', category: 'Futures', midnightOpen: 2175 },
  { symbol: 'SIL', price: 24.5, openPrice: 24.2, change: 0.3, changePercent: 1.24, timeframes: createRandomTimeframes(), ftfc: 'Bullish', pattern: 'London Killzone', volume: '400K', category: 'Futures', midnightOpen: 24.3 },
  { symbol: 'M2K', price: 2050, openPrice: 2060, change: -10, changePercent: -0.48, timeframes: createRandomTimeframes(), ftfc: 'Bearish', pattern: 'Turtle Soup', volume: '300K', category: 'Futures', midnightOpen: 2055 }
];

// Re-calculate FTFC for initial state
MOCK_STOCKS.forEach(s => {
    s.ftfc = getFTFCFromTimeframes(s.timeframes);
});

export const STRAT_RULES = [
  "Rule 1: Markets only move in 3 directions: 1 (Inside), 2 (Trending), 3 (Outside).",
  "Rule 2: FTFC is non-negotiable for high probability setups.",
  "Rule 3: Broadening formations are the result of 3 bars.",
  "Rule 4: Look for 2-1-2 and 2-2 reversals on HTF."
];
