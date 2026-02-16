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
  private isAuthenticated: boolean = false;
  
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
    
    console.log('Attempting MASSIVE connection...', { hasKey: !!MASSIVE_API_KEY, keyLength: MASSIVE_API_KEY?.length });
    
    this.updateStatus('connecting');
    this.currentProvider = 'massive';
    this.isAuthenticated = false;
    
    try {
      // Try connecting with API key in URL if available
      const url = MASSIVE_API_KEY 
        ? `${this.MASSIVE_WS_URL}?apiKey=${MASSIVE_API_KEY}`
        : `${this.MASSIVE_WS_URL}`;
      console.log('Connecting to:', this.MASSIVE_WS_URL);
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('MASSIVE WebSocket connected successfully');
        
        // Try multiple auth formats
        // Format 1: Simple auth message
        const authMsg1 = JSON.stringify({
          type: 'auth',
          apiKey: MASSIVE_API_KEY
        });
        
        // Format 2: Login message
        const authMsg2 = JSON.stringify({
          action: 'login',
          apiKey: MASSIVE_API_KEY
        });
        
        // Format 3: Just subscribe directly (some APIs don't need auth)
        
        console.log('Sending auth messages...');
        if (MASSIVE_API_KEY) {
          this.socket?.send(authMsg1);
          setTimeout(() => this.socket?.send(authMsg2), 100);
        }
        
        // Subscribe immediately as well (in case no auth needed)
        setTimeout(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            console.log('Subscribing to symbols:', this.allSymbols.length);
            
            // Try different subscription formats
            // Format 1: MASSIVE native format
            this.allSymbols.forEach((symbol, i) => {
              setTimeout(() => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                  // Try MASSIVE format with "ev" field
                  this.socket.send(JSON.stringify({
                    ev: 'subscribe',
                    symbol: symbol
                  }));
                }
              }, i * 100);
            });
            
            // Format 2: Alternative - subscribe to all at once
            setTimeout(() => {
              if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                  action: 'subscribe',
                  symbols: this.allSymbols
                }));
              }
            }, this.allSymbols.length * 100 + 100);
          }
        }, 500);
      };

      this.socket.onmessage = (event) => {
        try {
          // MASSIVE sends array of messages sometimes
          const messages = JSON.parse(event.data);
          const dataArray = Array.isArray(messages) ? messages : [messages];
          
          for (const data of dataArray) {
            console.log('MASSIVE message:', JSON.stringify(data));
            this.lastMessageTime = Date.now();
            
            // Handle status message (ev = "status")
            if (data.ev === 'status' || data.type === 'status' || data.event === 'status') {
              console.log('MASSIVE status:', data.message || data.status);
              if (data.status === 'connected' || data.status === 'success') {
                this.isLiveConnection = true;
                this.updateStatus('connected');
                this.stopSimulation();
              }
              continue;
            }
            
            // Handle auth response
            if (data.type === 'auth' || data.type === 'login' || data.action === 'login') {
              if (data.status === 'success' || data.success === true || data.authenticated === true) {
                console.log('MASSIVE auth successful');
                this.isAuthenticated = true;
                this.isLiveConnection = true;
                this.reconnectAttempts = 0;
                this.updateStatus('connected');
                this.stopSimulation();
              } else {
                console.error('MASSIVE auth failed:', data.message || data.error || 'Unknown error');
              }
              continue;
            }
            
            // Handle subscription confirmation
            if (data.type === 'subscribe' || data.type === 'subscribed' || data.ev === 'subscribe') {
              console.log('Subscription confirmed:', data.symbol || data.s);
              continue;
            }
            
            // If we get any data message with price, we're connected
            if (data.price || data.last || data.c || data.p || data.trade || data.quote) {
              if (!this.isLiveConnection) {
                console.log('MASSIVE data received - marking as connected');
                this.isLiveConnection = true;
                this.updateStatus('connected');
                this.stopSimulation();
              }
            }
            
            // Handle MASSIVE WebSocket message format - try multiple field mappings
          const symbol = data.symbol || data.s || data.ticker || data.sym;
          const price = data.price || data.p || data.last || data.c || data.lp || data.value;
          const change = data.change || data.d || data.ch || 0;
          const changePercent = data.changePercent || data.dp || data.chp || data.pChange || 0;
          
          if (symbol && price && typeof price === 'number') {
            console.log(`MASSIVE trade: ${symbol} @ $${price}`);
            // Update cache
            priceCache.set(symbol, {
              price,
              change,
              changePercent,
              timestamp: Date.now()
            });
            
            // Notify handlers
            this.handlers.forEach(handler => handler(symbol, price, 0));
          } else if (data.trades && Array.isArray(data.trades)) {
            // Batch trades format
            data.trades.forEach((trade: any) => {
              const tSymbol = trade.symbol || trade.s || trade.ticker;
              const tPrice = trade.price || trade.p || trade.last || trade.c;
              const tChange = trade.change || trade.d || 0;
              const tChangePercent = trade.changePercent || trade.dp || 0;
              
              if (tSymbol && tPrice) {
                priceCache.set(tSymbol, {
                  price: tPrice,
                  change: tChange,
                  changePercent: tChangePercent,
                  timestamp: Date.now()
                });
                this.handlers.forEach(handler => handler(tSymbol, tPrice, 0));
              }
            });
          } else if (data.quotes && Array.isArray(data.quotes)) {
            // Batch quotes format
            data.quotes.forEach((quote: any) => {
              const qSymbol = quote.symbol || quote.s || quote.ticker;
              const qPrice = quote.price || quote.p || quote.c || quote.last;
              if (qSymbol && qPrice) {
                priceCache.set(qSymbol, {
                  price: qPrice,
                  change: quote.change || 0,
                  changePercent: quote.changePercent || 0,
                  timestamp: Date.now()
                });
                this.handlers.forEach(handler => handler(qSymbol, qPrice, 0));
              }
            });
          }
          } // End for loop
        } catch (e) {
          console.error('Error parsing MASSIVE WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('MASSIVE WebSocket error:', error);
        this.isLiveConnection = false;
        this.isAuthenticated = false;
        this.updateStatus('error');
        if (FINNHUB_API_KEY) {
          console.log('MASSIVE error, falling back to Finnhub');
          this.initiateFinnhubConnection();
        } else {
          this.reconnect();
        }
      };

      this.socket.onclose = (event) => {
        console.log('MASSIVE WebSocket closed:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        this.isLiveConnection = false;
        this.isAuthenticated = false;
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
      console.log('Connecting to Finnhub:', url);
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

      this.socket.onclose = (event) => {
        console.log('Finnhub WebSocket closed:', { code: event.code, reason: event.reason });
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
    console.log(`Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
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
