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
  // MASSIVE WebSocket endpoint - actual URL from wscat test
  private MASSIVE_WS_URL = "wss://socket.massive.com/stocks";

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

  // Fetch quote from MASSIVE REST API
  public async fetchQuoteFromMassive(symbol: string): Promise<FinnhubQuote | null> {
    if (!MASSIVE_API_KEY) {
      console.warn('MASSIVE API key not configured');
      return null;
    }
    try {
      const response = await fetch(`https://api.massive.com/v1/stocks/quote?symbol=${symbol}`, {
        headers: {
          'Authorization': `Bearer ${MASSIVE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Map MASSIVE format to Finnhub format
      return {
        c: data.price || data.last || 0,
        d: data.change || 0,
        dp: data.changePercent || 0,
        h: data.high || 0,
        l: data.low || 0,
        o: data.open || 0,
        pc: data.previousClose || 0
      };
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
    
    // Try MASSIVE first if key available, otherwise Finnhub
    if (preferredProvider === 'massive' && MASSIVE_API_KEY) {
      this.initiateMassiveConnection();
    } else if (FINNHUB_API_KEY) {
      this.initiateFinnhubConnection();
    } else if (MASSIVE_API_KEY) {
      this.initiateMassiveConnection();
    } else {
      console.warn('No API keys configured, starting simulation');
      this.startSimulation();
    }
  }

  // MASSIVE WebSocket Connection
  private initiateMassiveConnection() {
    if (this.socket) { 
      try { this.socket.close(); } catch(e) {} 
    }
    
    if (!MASSIVE_API_KEY) {
      console.warn('MASSIVE API key not available');
      if (FINNHUB_API_KEY) {
        this.initiateFinnhubConnection();
      } else {
        this.startSimulation();
      }
      return;
    }
    
    this.updateStatus('connecting');
    this.currentProvider = 'massive';
    
    try {
      // MASSIVE WebSocket with authentication
      // MASSIVE uses different auth - check if API key is passed as query param or header
      const url = `${this.MASSIVE_WS_URL}`;
      this.socket = new WebSocket(url);
      
      // Send authentication message after connection
      this.socket.onopen = () => {
        console.log('MASSIVE WebSocket connected');
        
        // Authenticate with API key
        this.socket?.send(JSON.stringify({
          type: 'auth',
          apiKey: MASSIVE_API_KEY
        }));
        
        this.isLiveConnection = true;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.updateStatus('connected');
        this.stopSimulation();
        
        // Subscribe to symbols after auth
        this.allSymbols.forEach(symbol => {
          this.socket?.send(JSON.stringify({
            type: 'subscribe',
            symbol: symbol
          }));
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.lastMessageTime = Date.now();
          
          // Handle MASSIVE WebSocket message format
          if (data.type === 'trade' || data.event === 'trade') {
            const symbol = data.symbol || data.s;
            const price = data.price || data.p || data.last;
            if (symbol && price) {
              this.handlers.forEach(handler => handler(symbol, price, 0));
            }
          } else if (data.trades) {
            // Batch trades format
            data.trades.forEach((trade: any) => {
              const symbol = trade.symbol || trade.s;
              const price = trade.price || trade.p;
              if (symbol && price) {
                this.handlers.forEach(handler => handler(symbol, price, 0));
              }
            });
          }
        } catch (e) {
          console.error('Error parsing MASSIVE WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('MASSIVE WebSocket error:', error);
        this.isLiveConnection = false;
        this.updateStatus('error');
        // Fall back to Finnhub on error
        if (FINNHUB_API_KEY) {
          console.log('MASSIVE error, falling back to Finnhub');
          this.initiateFinnhubConnection();
        } else {
          this.reconnect();
        }
      };

      this.socket.onclose = () => {
        console.log('MASSIVE WebSocket closed');
        this.isLiveConnection = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        } else {
          this.updateStatus('disconnected');
          this.startSimulation();
        }
      };
    } catch (e) {
      console.error('Error creating MASSIVE WebSocket:', e);
      if (FINNHUB_API_KEY) {
        this.initiateFinnhubConnection();
      } else {
        this.reconnect();
      }
    }
  }

  // Finnhub WebSocket Connection
  private initiateFinnhubConnection() {
    if (this.socket) { 
      try { this.socket.close(); } catch(e) {} 
    }
    
    if (!FINNHUB_API_KEY) {
      console.warn('Finnhub API key not available');
      this.startSimulation();
      return;
    }
    
    this.updateStatus('connecting');
    this.currentProvider = 'finnhub';
    
    try {
      const url = `${this.FINNHUB_WS_URL}?token=${FINNHUB_API_KEY}`;
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('Finnhub WebSocket connected');
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
          console.error('Error parsing Finnhub WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Finnhub WebSocket error:', error);
        this.isLiveConnection = false;
        this.updateStatus('error');
        this.reconnect();
      };

      this.socket.onclose = () => {
        console.log('Finnhub WebSocket closed');
        this.isLiveConnection = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        } else {
          this.updateStatus('disconnected');
          this.startSimulation();
        }
      };
    } catch (e) {
      console.error('Error creating Finnhub WebSocket:', e);
      this.reconnect();
    }
  }

  private reconnect() {
    this.reconnectAttempts++;
    setTimeout(() => {
      if (!this.isLiveConnection) {
        // Try fallback provider
        if (this.currentProvider === 'massive' && FINNHUB_API_KEY) {
          console.log('Retrying with Finnhub...');
          this.initiateFinnhubConnection();
        } else if (this.currentProvider === 'finnhub' && MASSIVE_API_KEY) {
          console.log('Retrying with MASSIVE...');
          this.initiateMassiveConnection();
        } else if (this.currentProvider === 'massive') {
          this.initiateMassiveConnection();
        } else {
          this.initiateFinnhubConnection();
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
