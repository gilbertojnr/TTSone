<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TTS Cloud - Trust The Strat Trading Dashboard

A sophisticated React-based trading analysis platform combining **The Strat** (Rob Smith's methodology) with **Aenigma-Parvum** (ICT/Macro analysis) and AI-powered insights.

## Features

- **Real-time Market Scanner** - Live data via Finnhub WebSocket
- **The Strat Analysis** - 1-2-3 candle patterns, FTFC, Universal Truths
- **Aenigma-Parvum Integration** - Macro bias, liquidity zones, confluence scoring
- **AI-Powered Insights** - Google Gemini for trade analysis and market pulse
- **Catalyst Watch** - Upcoming events with Strat alignment
- **StratChat** - AI trading mentor

## Prerequisites

- Node.js 18+
- Finnhub API key (free)
- Google Gemini API key (free)

## Setup

1. **Clone and install:**
   ```bash
   git clone git@github.com:gilbertojnr/TTSone.git
   cd TTSone
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Get API keys:**
   - **Finnhub:** https://finnhub.io/ (free tier available)
   - **Gemini:** https://aistudio.google.com/app/apikey

4. **Run locally:**
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FINNHUB_API_KEY` | Yes | Market data API key |
| `VITE_GEMINI_API_KEY` | Yes | AI analysis API key |

## Architecture

```
React Frontend
├── Market Data Service (Finnhub WebSocket)
├── Firebase (Cloud sync)
└── Gemini AI Services
    ├── TTS Engine (Strat patterns)
    ├── Aenigma-Parvum (Macro/ICT)
    ├── Catalyst Scout (Events)
    └── Market Pulse (Broad analysis)
```

## Security Notes

- API keys are stored in `.env.local` (never commit this file)
- All API calls are made client-side (keys are visible in browser)
- For production, consider a backend proxy for API calls

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key not configured" error | Check `.env.local` file exists and keys are set |
| No live data | Verify Finnhub API key is valid |
| AI not responding | Check Gemini API key and quota |
| Build errors | Run `npm install` again |

## Disclaimer

This is for educational purposes only. Not financial advice. Trading involves significant risk.

## License

MIT
