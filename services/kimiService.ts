import { StockSetup, StratInsight, MarketPulse, CatalystStock, HighProbSetup, AenigmaInsight, ChatMessage } from "../types";

// Kimi API Configuration - Access at runtime to prevent tree-shaking
const getKimiApiKey = (): string => {
  try {
    // @ts-ignore
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_KIMI_API_KEY) || '';
  } catch {
    return '';
  }
};

// Verify API key is loaded (for debugging)
console.log('Kimi API Key loaded:', !!getKimiApiKey(), '- Ready for production');

// Use regular Kimi API endpoint (not coding)
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1';

const STORAGE_KEY_PREFIX = 'tts_cache_';
const CACHE_DURATIONS = {
  analysis: 1000 * 60 * 15,
  catalyst: 1000 * 60 * 60,
  pulse: 1000 * 60 * 15,
  highProb: 1000 * 60 * 30
};

function getStoredData<T>(key: string, duration: number): T | null {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!item) return null;
    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp < duration) return data;
  } catch (e) {}
  return null;
}

function setStoredData(key: string, data: any) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {}
}

interface KimiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callKimi(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = getKimiApiKey();
  if (!apiKey) {
    throw new Error('KIMI_API_KEY not configured');
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'kimi-latest',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Kimi API error:', response.status, errorText);
    
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your Kimi API key in GitHub Secrets.');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`Kimi API error: ${response.status}`);
  }

  const data: KimiResponse = await response.json();
  return data.choices[0]?.message?.content || '{}';
}

/**
 * AGENT: AENIGMA-PARVUM (Macro-Protocol)
 * Handles macro-context, liquidity voids, and trend exhaustion.
 */
export async function getAenigmaAnalysis(stock: StockSetup): Promise<AenigmaInsight> {
  if (!getKimiApiKey()) {
    return { macroBias: 'Neutral', liquidityZone: 'N/A', protocolNote: 'API key not configured.', confluenceScore: 0 };
  }
  
  const systemInstruction = `You are Aenigma-Parvum, a macro-focused trading analyst using ICT (Inner Circle Trader) methodology. 
Analyze for liquidity voids, macro exhaustion, and institutional order flow. Be precise and technical.`;

  const prompt = `
Analyze ${stock.symbol} at $${stock.price} with ${stock.ftfc} FTFC bias.

Identify:
1. Macro bias (Bullish/Bearish/Neutral)
2. Hidden liquidity zone (price level)
3. Confluence score (0-100) based on macro alignment

Return ONLY this JSON format:
{
  "macroBias": "Bullish/Bearish/Neutral",
  "liquidityZone": "price level",
  "protocolNote": "1 sentence technical note",
  "confluenceScore": number
}`;

  try {
    const content = await callKimi(prompt, systemInstruction);
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    return JSON.parse(jsonStr) as AenigmaInsight;
  } catch (error) {
    console.error('Aenigma analysis failed:', error);
    return { macroBias: 'Neutral', liquidityZone: 'N/A', protocolNote: 'Analysis unavailable.', confluenceScore: 50 };
  }
}

/**
 * ENGINE: TTS (The Strat Engine)
 * Handles raw candle patterns and Universal Truths.
 */
export async function getStratAnalysis(stock: StockSetup): Promise<StratInsight> {
  if (!getKimiApiKey()) {
    return { analysis: "API key not configured.", potentialTarget: "N/A", stopLoss: "N/A", probability: "Medium" };
  }
  
  const systemInstruction = `You are The Strat Engine (TTS), analyzing markets using Rob Smith's Strat methodology.
Focus on 1-2-3 candle patterns, Full Time Frame Continuity (FTFC), and Universal Truths.`;

  const prompt = `
Analyze ${stock.symbol} using The Strat methodology:
- Pattern: ${stock.pattern}
- FTFC: ${stock.ftfc}
- Monthly: ${stock.timeframes.monthly}, Weekly: ${stock.timeframes.weekly}, Daily: ${stock.timeframes.daily}

Provide:
1. Professional Strat analysis
2. Potential target price
3. Stop loss level
4. Probability (High/Medium/Low)

Return ONLY this JSON:
{
  "analysis": "detailed Strat analysis",
  "potentialTarget": "target price",
  "stopLoss": "stop loss price",
  "probability": "High/Medium/Low"
}`;

  try {
    const content = await callKimi(prompt, systemInstruction);
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    return JSON.parse(jsonStr) as StratInsight;
  } catch (error) {
    console.error('Strat analysis failed:', error);
    return { analysis: "Error analyzing setup.", potentialTarget: "N/A", stopLoss: "N/A", probability: "Medium" };
  }
}

/**
 * AGENT: Catalyst-Scout
 * Scours for upcoming market-moving events.
 */
export async function getCatalystInsights(stocks: StockSetup[]): Promise<CatalystStock[]> {
  if (!getKimiApiKey()) {
    console.warn('Cannot fetch catalysts: API key not configured');
    return [];
  }
  
  const cacheKey = 'catalyst_insights';
  const cached = getStoredData<CatalystStock[]>(cacheKey, CACHE_DURATIONS.catalyst);
  if (cached) return cached;

  const tickersWithFTFC = stocks.slice(0, 10).map(s => `${s.symbol} [FTFC: ${s.ftfc}]`).join(', ');
  
  const systemInstruction = `You are Catalyst-Scout, identifying market catalysts and their alignment with The Strat methodology.`;

  const prompt = `
For these tickers: ${tickersWithFTFC}

Identify 3-5 upcoming catalysts (earnings, economic data, FDA decisions, etc.) in the next 30 days.

For each:
1. Symbol
2. Event description
3. Date (estimate if exact unknown)
4. Impact: High/Medium/Low
5. Strat alignment (how it fits candle patterns)
6. Universal Truth most likely: 1, 2, or 3

Return ONLY JSON array:
[
  {
    "symbol": "TICKER",
    "event": "description",
    "date": "YYYY-MM-DD",
    "impact": "High/Medium/Low",
    "stratAlignment": "analysis",
    "universalTruth": "1/2/3"
  }
]`;

  try {
    const content = await callKimi(prompt, systemInstruction);
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const data = JSON.parse(jsonStr) as CatalystStock[];
    setStoredData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Catalyst Scout failed:", error);
    return [];
  }
}

/**
 * High Probability Setup Scanner
 */
export async function getHighProbabilitySetups(stocks: StockSetup[]): Promise<HighProbSetup[]> {
  if (!getKimiApiKey()) {
    console.warn('Cannot fetch setups: API key not configured');
    return [];
  }
  
  const cacheKey = 'high_prob_setups';
  const cached = getStoredData<HighProbSetup[]>(cacheKey, CACHE_DURATIONS.highProb);
  if (cached) return cached;

  const tickersData = stocks.slice(0, 15).map(s => 
    `${s.symbol} [FTFC: ${s.ftfc}, Pattern: ${s.pattern}]`
  ).join(', ');

  const systemInstruction = `You are a confluence analyst combining The Strat patterns with macro bias.`;

  const prompt = `
Analyze: ${tickersData}

Find 3-5 highest probability setups where:
- TTS (Strat patterns) shows clear direction
- Aenigma (macro) confirms or adds confluence

Label protocol:
- 'CONFLUENCE' if both agree
- 'TTS' or 'AENIGMA' if only one identifies it

Return JSON array:
[
  {
    "symbol": "TICKER",
    "timeframe": "1H/4H",
    "pattern": "pattern name",
    "direction": "Long/Short",
    "probability": 85,
    "reasoning": "explanation",
    "target": "price target",
    "protocol": "TTS/AENIGMA/CONFLUENCE"
  }
]`;

  try {
    const content = await callKimi(prompt, systemInstruction);
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const data = JSON.parse(jsonStr) as HighProbSetup[];
    setStoredData(cacheKey, data);
    return data;
  } catch (error) { 
    console.error('High prob setups failed:', error);
    return []; 
  }
}

/**
 * Market Pulse - Broad market summary
 */
export async function getMarketPulse(stocks: StockSetup[]): Promise<MarketPulse & { sources?: any[] }> {
  if (!getKimiApiKey()) {
    return { summary: "API key not configured. Please set VITE_KIMI_API_KEY.", topPick: "N/A", marketBias: "Neutral" };
  }
  
  const spy = stocks.find(s => s.symbol === 'SPY');
  const qqq = stocks.find(s => s.symbol === 'QQQ');
  const vix = stocks.find(s => s.symbol === 'VIX');
  
  const systemInstruction = `You are Market Pulse, providing concise broad market analysis using The Strat + Macro context.`;

  const prompt = `
Market Context:
- SPY FTFC: ${spy?.ftfc || 'Unknown'}, Price: $${spy?.price || 'N/A'}
- QQQ FTFC: ${qqq?.ftfc || 'Unknown'}, Price: $${qqq?.price || 'N/A'}
- VIX: ${vix?.price || 'N/A'}

Provide brief market pulse:
1. Summary (2-3 sentences)
2. Top pick symbol for today
3. Market bias: Bullish/Bearish/Neutral

Return JSON:
{
  "summary": "market summary",
  "topPick": "SYMBOL",
  "marketBias": "Bullish/Bearish/Neutral"
}`;

  try {
    const content = await callKimi(prompt, systemInstruction);
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const pulse = JSON.parse(jsonStr) as MarketPulse;
    return { ...pulse, sources: [] };
  } catch (error: any) {
    console.error('Market pulse failed:', error);
    return { summary: "Scanning market signals...", topPick: "N/A", marketBias: "Neutral" };
  }
}

// Simple chat interface for StratChat
let chatHistory: ChatMessage[] = [];

export async function sendChatMessage(message: string): Promise<string> {
  if (!getKimiApiKey()) {
    return 'API key not configured. Please set VITE_KIMI_API_KEY in GitHub Secrets';
  }

  const systemInstruction = `You are the Intelligence Hub of TTS (The Strat) and Aenigma-Parvum (ICT). 
Combine Rob Smith's Strat methodology with Inner Circle Trader concepts.
Be concise, technical, and actionable. Focus on 1-2-3 patterns, FTFC, order blocks, and liquidity.`;

  try {
    chatHistory.push({ role: 'user', text: message });
    const context = chatHistory.slice(-10).map(m => `${m.role}: ${m.text}`).join('\n');
    
    const response = await callKimi(context, systemInstruction);
    chatHistory.push({ role: 'model', text: response });
    return response;
  } catch (error: any) {
    console.error('StratChat error:', error);
    return `Error: ${error.message || 'Failed to process message'}`;
  }
}

export function clearChatHistory() {
  chatHistory = [];
}

export function createStratMentorChat() {
  clearChatHistory();
  return {
    sendMessage: sendChatMessage,
    clear: clearChatHistory,
  };
}
