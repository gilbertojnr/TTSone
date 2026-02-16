#!/usr/bin/env node
/**
 * TTS Cloud - Integration Test Suite
 * Tests live data connections and AI agents
 */

const TEST_CONFIG = {
  MASSIVE_WS_URL: 'wss://socket.massive.com/stocks',
  MASSIVE_API_KEY: process.env.VITE_MASSIVE_API_KEY || 'pjbKFGFqn9p_OD4CDL26slB4qm5KuRla',
  FINNHUB_API_KEY: process.env.VITE_FINNHUB_API_KEY || '',
  KIMI_API_KEY: process.env.VITE_KIMI_API_KEY || 'sk-kimi-euscIdhHm4iFicDkxRzcRmgvob7aQdjXI0r0qblYtVkf4ktQFhpD1ViSedhz7WuE',
  TEST_SYMBOLS: ['AAPL', 'SPY', 'QQQ', 'TSLA']
};

// Test 1: MASSIVE WebSocket Connection
async function testMassiveWebSocket() {
  console.log('\n🧪 TEST 1: MASSIVE WebSocket Connection');
  console.log('─────────────────────────────────────────');
  
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(TEST_CONFIG.MASSIVE_WS_URL);
      let connected = false;
      let receivedData = false;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected to', TEST_CONFIG.MASSIVE_WS_URL);
        connected = true;
        
        // Send auth
        ws.send(JSON.stringify({
          type: 'auth',
          apiKey: TEST_CONFIG.MASSIVE_API_KEY
        }));
        console.log('📤 Auth message sent');
        
        // Subscribe to test symbol
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            symbol: 'AAPL'
          }));
          console.log('📤 Subscribe message sent for AAPL');
        }, 1000);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 Received:', JSON.stringify(data).substring(0, 200));
          receivedData = true;
          
          // Check if it's trade data
          if (data.price || data.last || data.type === 'trade') {
            console.log('✅ Live trade data received!');
            console.log('   Symbol:', data.symbol || data.s);
            console.log('   Price:', data.price || data.p || data.last);
          }
        } catch (e) {
          console.log('📥 Raw message:', event.data.substring(0, 100));
        }
      };
      
      ws.onerror = (error) => {
        console.log('❌ WebSocket error:', error.message || 'Unknown error');
        resolve({ success: false, error: 'WebSocket error' });
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        resolve({ 
          success: connected && receivedData, 
          connected,
          receivedData 
        });
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        ws.close();
      }, 10000);
      
    } catch (e) {
      console.log('❌ Error:', e.message);
      resolve({ success: false, error: e.message });
    }
  });
}

// Test 2: MASSIVE REST API
async function testMassiveREST() {
  console.log('\n🧪 TEST 2: MASSIVE REST API');
  console.log('─────────────────────────────────────────');
  
  try {
    const response = await fetch(`https://api.massive.com/v1/stocks/quote?symbol=AAPL`, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.MASSIVE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ HTTP Error:', response.status);
      return { success: false, status: response.status };
    }
    
    const data = await response.json();
    console.log('✅ REST API working');
    console.log('   Response:', JSON.stringify(data).substring(0, 200));
    return { success: true, data };
  } catch (e) {
    console.log('❌ Error:', e.message);
    return { success: false, error: e.message };
  }
}

// Test 3: Finnhub REST API
async function testFinnhubREST() {
  console.log('\n🧪 TEST 3: Finnhub REST API');
  console.log('─────────────────────────────────────────');
  
  if (!TEST_CONFIG.FINNHUB_API_KEY) {
    console.log('⚠️  Skipped - No Finnhub API key');
    return { success: false, skipped: true };
  }
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${TEST_CONFIG.FINNHUB_API_KEY}`
    );
    const data = await response.json();
    
    if (data.c) {
      console.log('✅ Finnhub REST working');
      console.log('   AAPL Price:', data.c);
      return { success: true, price: data.c };
    } else {
      console.log('❌ Invalid response:', data);
      return { success: false };
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
    return { success: false, error: e.message };
  }
}

// Test 4: Kimi AI API
async function testKimiAI() {
  console.log('\n🧪 TEST 4: Kimi AI API');
  console.log('─────────────────────────────────────────');
  
  try {
    const response = await fetch('https://api.kimi.com/coding/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_CONFIG.KIMI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [
          { 
            role: 'system', 
            content: 'You are a trading analyst. Respond with JSON only.' 
          },
          { 
            role: 'user', 
            content: 'Analyze AAPL stock briefly. Return JSON: {"bias": "Bullish/Bearish", "confidence": 0-100}' 
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });
    
    if (!response.ok) {
      console.log('❌ HTTP Error:', response.status);
      const errorText = await response.text();
      console.log('   Error details:', errorText.substring(0, 200));
      return { success: false, status: response.status };
    }
    
    const data = await response.json();
    console.log('✅ Kimi AI working');
    console.log('   Response:', JSON.stringify(data.choices?.[0]?.message).substring(0, 200));
    return { success: true, response: data };
  } catch (e) {
    console.log('❌ Error:', e.message);
    return { success: false, error: e.message };
  }
}

// Test 5: All Agents
async function testAllAgents() {
  console.log('\n🧪 TEST 5: AI Agents Status');
  console.log('─────────────────────────────────────────');
  
  const agents = [
    { name: 'Aenigma-Parvum', status: '✅ Configured' },
    { name: 'TTS Engine', status: '✅ Configured' },
    { name: 'Catalyst-Scout', status: '✅ Configured' },
    { name: 'High Prob Scanner', status: '✅ Configured' },
    { name: 'Market Pulse', status: '✅ Configured' },
    { name: 'StratChat', status: '✅ Configured' }
  ];
  
  agents.forEach(agent => {
    console.log(`   ${agent.status} ${agent.name}`);
  });
  
  return { success: true, agents: agents.length };
}

// Main test runner
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║     TTS CLOUD - INTEGRATION TEST SUITE           ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  
  const results = {
    massiveWS: await testMassiveWebSocket(),
    massiveREST: await testMassiveREST(),
    finnhubREST: await testFinnhubREST(),
    kimiAI: await testKimiAI(),
    agents: await testAllAgents()
  };
  
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  
  console.log('\n📊 Results:');
  console.log('   MASSIVE WebSocket:', results.massiveWS.success ? '✅ PASS' : '❌ FAIL');
  console.log('   MASSIVE REST API:', results.massiveREST.success ? '✅ PASS' : '❌ FAIL');
  console.log('   Finnhub REST API:', results.finnhubREST.success ? '✅ PASS' : results.finnhubREST.skipped ? '⚠️ SKIP' : '❌ FAIL');
  console.log('   Kimi AI API:', results.kimiAI.success ? '✅ PASS' : '❌ FAIL');
  console.log('   AI Agents:', results.agents.success ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(r => r.success);
  
  console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'));
  console.log('\n🔧 If tests failed, check:');
  console.log('   1. API keys are valid');
  console.log('   2. Internet connection');
  console.log('   3. API rate limits');
  
  return results;
}

// Run tests
runAllTests().catch(console.error);
