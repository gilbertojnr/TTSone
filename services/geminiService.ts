
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { StockSetup, StratInsight, MarketPulse, CatalystStock, HighProbSetup, AenigmaInsight } from "../types";

// Initialize the Google GenAI client using the environment variable.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('GEMINI_API_KEY not set. AI features will not work.');
}

const ai = new GoogleGenAI({ apiKey });

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

/**
 * AGENT: AENIGMA-PARVUM (Macro-Protocol)
 * Handles macro-context, liquidity voids, and trend exhaustion.
 */
export async function getAenigmaAnalysis(stock: StockSetup): Promise<AenigmaInsight> {
  if (!apiKey) {
    return { macroBias: 'Neutral', liquidityZone: 'N/A', protocolNote: 'API key not configured.', confluenceScore: 0 };
  }
  
  const prompt = `
    AGENT: Aenigma-Parvum Protocol Analysis
    TASK: Analyze ${stock.symbol} for Macro-Exhaustion and Liquidity Voids.
    PRICE: $${stock.price}
    BIAS: ${stock.ftfc}
    
    INSTRUCTIONS:
    - Use "Aenigma-Parvum" persona (technical, precise, macro-focused).
    - Identify a hidden Liquidity Zone.
    - Provide a Confluence Score (0-100) based on how well this aligns with major macro flows.
    
    Return JSON:
    {
      "macroBias": "Bullish/Bearish/Neutral",
      "liquidityZone": "Price Level",
      "protocolNote": "1-sentence cryptic but professional note",
      "confluenceScore": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    // Accessing the .text property directly as per the latest SDK requirements.
    return JSON.parse(response.text || '{}') as AenigmaInsight;
  } catch (error) {
    return { macroBias: 'Neutral', liquidityZone: 'N/A', protocolNote: 'Aenigma link unstable.', confluenceScore: 50 };
  }
}

/**
 * ENGINE: TTS (The Strat Engine)
 * Handles raw candle patterns and Universal Truths.
 */
export async function getStratAnalysis(stock: StockSetup): Promise<StratInsight> {
  if (!apiKey) {
    return { analysis: "API key not configured.", potentialTarget: "N/A", stopLoss: "N/A", probability: "Medium" };
  }
  
  const prompt = `
    ENGINE: TTS (The Strat)
    Analyze ${stock.symbol} using 1-2-3 Candle Patterns.
    Pattern: ${stock.pattern}
    FTFC: ${stock.ftfc}
    
    Return JSON:
    {
      "analysis": "Professional Strat analysis",
      "potentialTarget": "Target price",
      "stopLoss": "Stop loss price",
      "probability": "High/Medium/Low"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    // Accessing the .text property directly as per the latest SDK requirements.
    return JSON.parse(response.text || '{}') as StratInsight;
  } catch (error) {
    return { analysis: "Error analyzing setup.", potentialTarget: "N/A", stopLoss: "N/A", probability: "Medium" };
  }
}

/**
 * AGENT: Catalyst-Scout
 * Scours the web for upcoming market-moving events and explains their alignment with The Strat.
 * Enhanced to consider FTFC confluence.
 */
export async function getCatalystInsights(stocks: StockSetup[]): Promise<CatalystStock[]> {
  if (!apiKey) {
    console.warn('Cannot fetch catalysts: API key not configured');
    return [];
  }
  
  const cacheKey = 'catalyst_insights';
  const cached = getStoredData<CatalystStock[]>(cacheKey, CACHE_DURATIONS.catalyst);
  if (cached) return cached;

  const tickersWithFTFC = stocks.map(s => `${s.symbol} [FTFC: ${s.ftfc}]`).join(', ');
  
  const prompt = `Find major upcoming market catalysts (earnings, economic data, product launches) for these tickers: ${tickersWithFTFC}. 
  
  For each catalyst, generate a response focusing on The Strat logic:
  1. Alignment with candle types (Inside bars, Trending, or Outside bars).
  2. Identify the Universal Truth (1, 2, or 3) it is most likely to produce.
  3. CONFLUENCE ANALYSIS: If the current FTFC (Full Time Frame Continuity) aligns with the expected catalyst impact (e.g., Bullish FTFC + positive earnings surprise), explicitly highlight this as a high-probability Strat confluence in the 'stratAlignment' field. If they conflict, note the risk of trend exhaustion.
  
  Return the response as a JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        switchModel: 'gemini-3-flash-preview',
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              event: { type: Type.STRING },
              date: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
              stratAlignment: { type: Type.STRING, description: "Detailed Strat analysis including FTFC confluence" },
              universalTruth: { type: Type.STRING, enum: ["1", "2", "3"] }
            },
            required: ["symbol", "event", "date", "impact", "stratAlignment", "universalTruth"]
          }
        }
      },
    });

    // Accessing the .text property directly and parsing the JSON result.
    const data = JSON.parse(response.text || '[]') as CatalystStock[];
    setStoredData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Catalyst Scout failed:", error);
    return [];
  }
}

export async function getHighProbabilitySetups(stocks: StockSetup[]): Promise<HighProbSetup[]> {
  if (!apiKey) {
    console.warn('Cannot fetch setups: API key not configured');
    return [];
  }
  
  const cacheKey = 'high_prob_setups';
  const cached = getStoredData<HighProbSetup[]>(cacheKey, CACHE_DURATIONS.highProb);
  if (cached) return cached;

  const tickersData = stocks.map(s => `${s.symbol} [FTFC: ${s.ftfc}, 4H: ${s.timeframes.h4}]`).join(', ');

  const prompt = `
    Analyze ${tickersData}. Identify 5 setups where TTS (Strat Patterns) and Aenigma (Macro Bias) COOPERATE.
    Label the protocol as 'CONFLUENCE' if both agree, or 'TTS' / 'AENIGMA' if identified by one.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              timeframe: { type: Type.STRING, enum: ["1H", "4H"] },
              pattern: { type: Type.STRING },
              direction: { type: Type.STRING, enum: ["Long", "Short"] },
              probability: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              target: { type: Type.STRING },
              protocol: { type: Type.STRING, enum: ["TTS", "AENIGMA", "CONFLUENCE"] }
            },
            required: ["symbol", "timeframe", "pattern", "direction", "probability", "reasoning", "target", "protocol"]
          }
        }
      }
    });

    // Accessing the .text property directly as per the latest SDK requirements.
    const data = JSON.parse(response.text || '[]') as HighProbSetup[];
    setStoredData(cacheKey, data);
    return data;
  } catch (error) { return []; }
}

export async function getMarketPulse(stocks: StockSetup[]): Promise<MarketPulse & { sources?: any[] }> {
  if (!apiKey) {
    return { summary: "API key not configured. Please set GEMINI_API_KEY.", topPick: "N/A", marketBias: "Neutral" };
  }
  
  const spy = stocks.find(s => s.symbol === 'SPY');
  const qqq = stocks.find(s => s.symbol === 'QQQ');
  const indexContext = `SPY FTFC: ${spy?.ftfc || 'Mixed'}, QQQ FTFC: ${qqq?.ftfc || 'Mixed'}.`;

  const prompt = `Summarize Pulse using TTS logic + Aenigma Macro filtering. ${indexContext}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    // Extracting the text directly from the response and also capturing grounding metadata for citations.
    const pulse = JSON.parse(response.text || '{}') as MarketPulse;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    return { ...pulse, sources };
  } catch (error: any) {
    return { summary: "Scanning market signals...", topPick: "N/A", marketBias: "Neutral" };
  }
}

export function createStratMentorChat(): Chat | null {
  if (!apiKey) {
    console.warn('Cannot create chat: API key not configured');
    return null;
  }
  
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are the Intelligence Hub of TTS and Aenigma-Parvum. You combine Rob Smith's Strat with macro sentiment from the Aenigma agent.",
    },
  });
}
