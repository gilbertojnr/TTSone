import { StockSetup, CandleType } from "../types";

export type MarketUpdateHandler = (symbol: string, price: number, tick: number) => void;
export type ConnectionStatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'silent' | 'reconnecting' | 'cloud_active') => void;

export interface FinnhubQuote {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number;
}

class MarketDataStream {
  private handlers: Set<MarketUpdateHandler> = new Set();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private intervalId: number | null = null;
  private socket: WebSocket | null = null;
  private isLiveConnection: boolean = false;
  private lastMessageTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  // Added property to store the API key for reconnection logic
  private apiKey: string = '';
  
  // Target endpoints from infrastructure
  private CLOUD_WS_URL = "wss://trustthestrat-websocket-service-gen-lang-client-0278144585.us-central1.run.app";
  private FINNHUB_WS_URL = "wss://ws.finnhub.io";

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

  public async fetchQuote(symbol: string, apiKey: string): Promise<FinnhubQuote | null> {
    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      return await response.json();
    } catch (e) { return null; }
  }

  private startSilentMonitor() {
    window.setInterval(() => {
      if (this.isLiveConnection && this.lastMessageTime > 0 && Date.now() - this.lastMessageTime > 20000) {
        this.updateStatus('silent');
        // Fix: Pass the stored apiKey to the reconnect call
        this.reconnect(this.apiKey);
      }
    }, 10000);
  }

  public connectToLiveProvider(apiKey: string) {
    // Store the apiKey for future reconnection attempts
    this.apiKey = apiKey;
    this.reconnectAttempts = 0;
    this.initiateConnection(apiKey);
  }

  private initiateConnection(apiKey: string) {
    if (this.socket) { try { this.socket.close(); } catch(e) {} }
    this.updateStatus('connecting');
    
    // Attempt Cloud-Run WebSocket First, Fallback to direct Finnhub
    const url = this.reconnectAttempts === 0 ? this.CLOUD_WS_URL : `${this.FINNHUB_WS_URL}?token=${apiKey}`;
    
    try {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        this.isLiveConnection = true;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.updateStatus(url === this.CLOUD_WS_URL ? 'cloud_active' : 'connected');
        this.stopSimulation();
        
        this.allSymbols.forEach(s => {
          this.socket?.send(JSON.stringify({'type':'subscribe', 'symbol': s}));
        });
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'trade') {
          this.lastMessageTime = Date.now();
          data.data.forEach((trade: any) => {
            this.handlers.forEach(handler => handler(trade.s, trade.p, 0));
          });
        }
      };

      this.socket.onerror = () => {
        this.isLiveConnection = false;
        this.updateStatus('error');
        this.reconnect(apiKey);
      };

      this.socket.onclose = () => {
        this.isLiveConnection = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect(apiKey);
        } else {
          this.updateStatus('disconnected');
          this.startSimulation();
        }
      };
    } catch (e) {
      this.reconnect(apiKey);
    }
  }

  private reconnect(apiKey: string) {
    this.reconnectAttempts++;
    setTimeout(() => {
      if (!this.isLiveConnection) this.initiateConnection(apiKey);
    }, 2000);
  }

  public subscribe(handler: MarketUpdateHandler) {
    this.handlers.add(handler);
    if (!this.intervalId && !this.isLiveConnection) this.startSimulation();
  }

  public unsubscribe(handler: MarketUpdateHandler) {
    this.handlers.delete(handler);
  }

  private stopSimulation() {
    if (this.intervalId) { window.clearInterval(this.intervalId); this.intervalId = null; }
  }

  public startSimulation() {
    if (this.isLiveConnection || this.intervalId) return;
    this.intervalId = window.setInterval(() => {
      this.handlers.forEach(handler => {
        const randomSymbol = this.allSymbols[Math.floor(Math.random() * this.allSymbols.length)];
        handler(randomSymbol, 0, (Math.random() * 0.001) - 0.0005); 
      });
    }, 1000);
  }
}

export const marketStream = new MarketDataStream();