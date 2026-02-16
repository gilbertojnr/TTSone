import { StockSetup, CandleType } from "../types";

export type MarketUpdateHandler = (symbol: string, price: number, tick: number) => void;
export type ConnectionStatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'silent' | 'reconnecting' | 'cloud_active') => void;

export interface FinnhubQuote {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number;
}

// API Keys from environment
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';
const MASSIVE_API_KEY = import.meta.env.VITE_MASSIVE_API_KEY || '';

class MarketDataStream {
  private handlers: Set<MarketUpdateHandler> = new Set();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private intervalId: number | null = null;
  private socket: WebSocket | null = null;
  private isLiveConnection: boolean = false;
  private lastMessageTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private currentProvider: 'finnhub' | 'massive' | 'simulation' = 'simulation';
  
  // Provider endpoints
  private FINNHUB_WS_URL = "wss://ws.finnhub.io";
  private MASSIVE_WS_URL = "wss://api.massive.com/v1/ws"; // Update with actual MASSIVE endpoint

  private allSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'SMCI', 'PLTR',
    'SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'GLD', 'SLV', 'GDX',
    'MNQ', 'MES', 'MGC', 'SIL', 'M2K'
  ];

  constructor() {
    this.startSilentMonitor();
  }

  public onStatusChange(handler: ConnectionStatusHandler) {
    this.statusHandlers.add(handler);
  }

  private updateStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'silent' | 'reconnecting' | 'cloud_active') {
    this.statusHandlers.forEach(h => h(status));
  }

  // Fetch quote from Finnhub REST API
  public async fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
    if (!FINNHUB_API_KEY) {
      console.warn('Finnhub API key not configured');
      return null;
    }
    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
      return await response.json();
    } catch (e) { 
      console.error('Error fetching quote:', e);
      return null; 
    }
  }

  // Fetch quote from MASSIVE API
  public async fetchQuoteFromMassive(symbol: string): Promise<FinnhubQuote | null> {
    if (!MASSIVE_API_KEY) {
      console.warn('MASSIVE API key not configured');
      return null;
    }
    try {
      // Update with actual MASSIVE API endpoint
      const response = await fetch(`https://api.massive.com/v1/quote?symbol=${symbol}`, {
        headers: {
          'Authorization': `Bearer ${MASSIVE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (e) { 
      console.error('Error fetching from MASSIVE:', e);
      return null; 
    }
  }

  private startSilentMonitor() {
    window.setInterval(() => {
      if (this.isLiveConnection && this.lastMessageTime > 0 && Date.now() - this.lastMessageTime > 20000) {
        this.updateStatus('silent');
        this.reconnect();
      }
    }, 10000);
  }

  public connectToLiveProvider(preferredProvider: 'massive' | 'finnhub' = 'massive') {
    this.reconnectAttempts = 0;
    this.currentProvider = preferredProvider;
    this.initiateConnection(preferredProvider);
  }

  private initiateConnection(provider: 'massive' | 'finnhub') {
    if (this.socket) { 
      try { this.socket.close(); } catch(e) {} 
    }
    
    this.updateStatus('connecting');
    
    // Determine which provider to use - MASSIVE first, then Finnhub
    let url: string;
    let apiKey: string;
    
    if (provider === 'massive' && MASSIVE_API_KEY) {
      url = `${this.MASSIVE_WS_URL}?token=${MASSIVE_API_KEY}`;
      apiKey = MASSIVE_API_KEY;
      this.currentProvider = 'massive';
    } else if (FINNHUB_API_KEY) {
      url = `${this.FINNHUB_WS_URL}?token=${FINNHUB_API_KEY}`;
      apiKey = FINNHUB_API_KEY;
      this.currentProvider = 'finnhub';
    } else if (MASSIVE_API_KEY) {
      // Fallback to MASSIVE if Finnhub not available
      url = `${this.MASSIVE_WS_URL}?token=${MASSIVE_API_KEY}`;
      apiKey = MASSIVE_API_KEY;
      this.currentProvider = 'massive';
    } else {
      console.warn('No API keys configured, starting simulation');
      this.startSimulation();
      return;
    }
    
    try {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        this.isLiveConnection = true;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.updateStatus('connected');
        this.stopSimulation();
        
        // Subscribe to all symbols
        this.allSymbols.forEach(s => {
          this.socket?.send(JSON.stringify({'type':'subscribe', 'symbol': s}));
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'trade') {
            this.lastMessageTime = Date.now();
            data.data.forEach((trade: any) => {
              this.handlers.forEach(handler => handler(trade.s, trade.p, 0));
            });
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isLiveConnection = false;
        this.updateStatus('error');
        this.reconnect();
      };

      this.socket.onclose = () => {
        this.isLiveConnection = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        } else {
          this.updateStatus('disconnected');
          this.startSimulation();
        }
      };
    } catch (e) {
      console.error('Error creating WebSocket:', e);
      this.reconnect();
    }
  }

  private reconnect() {
    this.reconnectAttempts++;
    setTimeout(() => {
      if (!this.isLiveConnection) {
        // Try fallback provider if primary fails
        // Priority: MASSIVE → Finnhub → Simulation
        if (this.currentProvider === 'massive' && FINNHUB_API_KEY) {
          console.log('MASSIVE failed, falling back to Finnhub');
          this.initiateConnection('finnhub');
        } else if (this.currentProvider === 'finnhub' && MASSIVE_API_KEY) {
          console.log('Finnhub failed, trying MASSIVE');
          this.initiateConnection('massive');
        } else {
          this.initiateConnection(this.currentProvider);
        }
      }
    }, 2000);
  }

  public subscribe(handler: MarketUpdateHandler) {
    this.handlers.add(handler);
    if (!this.intervalId && !this.isLiveConnection) {
      this.startSimulation();
    }
  }

  public unsubscribe(handler: MarketUpdateHandler) {
    this.handlers.delete(handler);
  }

  private stopSimulation() {
    if (this.intervalId) { 
      window.clearInterval(this.intervalId); 
      this.intervalId = null; 
    }
  }

  public startSimulation() {
    if (this.isLiveConnection || this.intervalId) return;
    this.currentProvider = 'simulation';
    this.updateStatus('disconnected');
    this.intervalId = window.setInterval(() => {
      this.handlers.forEach(handler => {
        const randomSymbol = this.allSymbols[Math.floor(Math.random() * this.allSymbols.length)];
        handler(randomSymbol, 0, (Math.random() * 0.001) - 0.0005); 
      });
    }, 1000);
  }

  public getCurrentProvider(): string {
    return this.currentProvider;
  }
}

export const marketStream = new MarketDataStream();
