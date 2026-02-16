
export enum CandleType {
  Type1 = '1',   // Inside Bar
  Type2U = '2U', // Trending Up
  Type2D = '2D', // Trending Down
  Type3 = '3'    // Outside Bar
}

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  type: CandleType;
  timestamp: string;
}

export interface TimeframeData {
  monthly: CandleType;
  weekly: CandleType;
  daily: CandleType;
  h4: CandleType;
  h1: CandleType;
}

export type StockCategory = 'Watchlist' | 'Indices' | 'Metals' | 'Futures';

export interface StockSetup {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timeframes: TimeframeData;
  ftfc: 'Bullish' | 'Bearish' | 'Mixed';
  pattern: string;
  volume: string;
  category: StockCategory;
  midnightOpen?: number;
}

export interface HighProbSetup {
  symbol: string;
  timeframe: '1H' | '4H';
  pattern: string;
  direction: 'Long' | 'Short';
  probability: number;
  reasoning: string;
  target: string;
  protocol?: 'TTS' | 'AENIGMA' | 'CONFLUENCE';
}

export interface CatalystStock {
  symbol: string;
  event: string;
  date: string;
  impact: 'High' | 'Medium' | 'Low';
  stratAlignment: string;
  universalTruth: '1' | '2' | '3';
}

export interface StratInsight {
  analysis: string;
  potentialTarget: string;
  stopLoss: string;
  probability: 'High' | 'Medium' | 'Low';
}

export interface AenigmaInsight {
  macroBias: string;
  liquidityZone: string;
  protocolNote: string;
  confluenceScore: number; // 0-100
}

export interface MarketPulse {
  summary: string;
  topPick: string;
  marketBias: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
