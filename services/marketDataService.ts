import { StockSetup, CandleType } from "../types";

export type MarketUpdateHandler = (symbol: string, price: number, tick: number) => void;
export type ConnectionStatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'silent' | 'reconnecting' | 'cloud_active') => void;

// API Keys from environment
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';
const MASSIVE_API_KEY = import.meta.env.VITE_MASSIVE_API_KEY || '';

// Price cache from WebSocket data
const priceCache = new Map<string, { price: number; change: number; changePercent: number; timestamp: number }>();

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

  // Get cached price (from WebSocket data only)
  public getCachedPrice(symbol: string) {
    return priceCache.get(symbol);
  }

  // Get all cached prices
  public getAllCachedPrices() {
    return Object.fromEntries(priceCache);
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
      const url = `${this.MASSIVE_WS_URL}`;
      this.socket = new WebSocket(url);
      
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
            const change = data.change || data.d || 0;
            const changePercent = data.changePercent || data.dp || 0;
            
            if (symbol && price) {
              // Update cache
              priceCache.set(symbol, {
                price,
                change,
                changePercent,
                timestamp: Date.now()
              });
              
              // Notify handlers
              this.handlers.forEach(handler => handler(symbol, price, 0));
            }
          } else if (data.trades) {
            // Batch trades format
            data.trades.forEach((trade: any) => {
              const symbol = trade.symbol || trade.s;
              const price = trade.price || trade.p;
              const change = trade.change || trade.d || 0;
              const changePercent = trade.changePercent || trade.dp || 0;
              
              if (symbol && price) {
                priceCache.set(symbol, {
                  price,
                  change,
                  changePercent,
                  timestamp: Date.now()
                });
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
              const symbol = trade.s;
              const price = trade.p;
              
              // Update cache with Finnhub data
              const cached = priceCache.get(symbol);
              const change = cached ? price - cached.price : 0;
              const changePercent = cached && cached.price > 0 ? (change / cached.price) * 100 : 0;
              
              priceCache.set(symbol, {
                price,
                change,
                changePercent,
                timestamp: Date.now()
              });
              
              this.handlers.forEach(handler => handler(symbol, price, 0));
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
