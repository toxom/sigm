<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pb, currentUser, ensureAuthenticated } from '$lib/pocketbase';
  import ConnectExchangeModal from 'components/ConnectExchangeModal.svelte';
  import { createHuobiClient } from 'clients/huobi-api';
  import { createBybitClient } from 'clients/bybit-api';
  import { getExchangeInfo } from 'utils/exchanges';
  import { getTokenLogo, generateTokenSvg } from '$lib/utils/tokens';
  import PieChart from 'components/PieChart.svelte';


  import prelogo1 from '$lib/assets/prelogo1.svg';

  let isLoading = true;
  let totalBalance = 0;
  let tokens = [];
  let user = null;
  let portfolios = {};
  let isConnectionModalOpen = false;
  let loadingBalances = {};
  let errors = {};
  let refreshInterval;
  let unsubscribe;

  function handleTokenLogoError(event, symbol, sourceIndex = 0) {
  const target = event.target;
  const logoSources = getTokenLogo(symbol);
  
  // Try the next source if available
  if (sourceIndex < logoSources.length - 1) {
    target.src = logoSources[sourceIndex + 1];
    // Update the error handler to try the next source
    target.onerror = (e) => handleTokenLogoError(e, symbol, sourceIndex + 1);
  } 
  // If all sources failed, hide the icon element completely
  else {
    // Find the parent token-icon element and hide it
    const iconElement = target.closest('.token-icon');
    if (iconElement) {
      iconElement.style.display = 'none';
    }
  }
}
  
  onMount(async () => {
    try {
      // Check if user is authenticated
      const isAuthenticated = await ensureAuthenticated();
      
      // Subscribe to the currentUser store
      unsubscribe = currentUser.subscribe(value => {
        user = value;
      });
      
      // Fetch user data if authenticated
      if (isAuthenticated && user) {
        await loadConnectedExchanges();
        await fetchBalances();
        
        // Set up auto-refresh every 3 minutes
        refreshInterval = setInterval(() => {
          fetchBalances();
        }, 180000);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      // Delay to ensure loader is visible for at least a moment
      setTimeout(() => {
        isLoading = false;
      }, 1000);
    }
  });
  
  onDestroy(() => {
    // Clean up subscriptions and intervals
    if (unsubscribe) unsubscribe();
    if (refreshInterval) clearInterval(refreshInterval);
  });
  
  async function loadConnectedExchanges() {
    // Reset portfolios
    portfolios = {};
    
    // Get all possible exchanges
    const exchangeIds = ['binance', 'bybit', 'huobi', 'coinbase', 'kucoin'];
    
    // Check localStorage for API keys
    for (const exchangeId of exchangeIds) {
      const storedCreds = localStorage.getItem(`crypto_creds_${exchangeId}`);
      
      if (storedCreds) {
        try {
          const credentials = JSON.parse(storedCreds);
          
          // Create portfolio entry
          portfolios[exchangeId] = {
            id: exchangeId,
            name: getExchangeName(exchangeId),
            exchangeId,
            connected: true,
            lastSync: new Date().toISOString(),
            authType: credentials.authType,
            apiKey: credentials.apiKey ? '***' + credentials.apiKey.substring(3) : '***'
          };
        } catch (err) {
          console.error(`Error parsing credentials for ${exchangeId}:`, err);
        }
      }
    }
  }
  
  function getExchangeName(exchangeId) {
    const exchangeNames = {
      'binance': 'Binance',
      'bybit': 'Bybit',
      'huobi': 'Huobi/HTX',
      'coinbase': 'Coinbase',
      'kucoin': 'Kucoin'
    };
    
    return exchangeNames[exchangeId] || exchangeId.charAt(0).toUpperCase() + exchangeId.slice(1);
  }
  
  async function fetchBalances() {
  try {
    // Reset tokens and totalBalance
    tokens = [];
    totalBalance = 0;
    
    // Check if we have any connections
    if (Object.keys(portfolios).length === 0) {
      return;
    }
    
    // Process each connected exchange
    for (const exchangeId in portfolios) {
      if (exchangeId === 'huobi' || exchangeId === 'htx') {
        await fetchHTXBalances(exchangeId);
      } else if (exchangeId === 'bybit') {
        await fetchBybitBalances(exchangeId);
      } else {
        // For other exchanges that aren't implemented yet, generate random data
        await fetchMockBalances(exchangeId);
      }
    }
    
    // Sort tokens by value
    tokens = tokens.sort((a, b) => b.value - a.value);
    
  } catch (error) {
    console.error('Error fetching balances:', error);
  }
}
// Enhanced to handle multiple exchange types and unsupported symbols
async function getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const prices: Record<string, number> = {};
    
    // Try to use Bybit for price data first (if connected)
    const bybitClient = createBybitClient();
    if (bybitClient) {
      try {
        // For Bybit, we need to batch process symbols instead of one by one
        // First, get all available tickers from Bybit
        const allTickers = await bybitClient.get('/v5/market/tickers', {
          category: 'spot'
        });
        
        if (allTickers && allTickers.list && allTickers.list.length > 0) {
          // Create a map of all available trading pairs
          const tickerMap = {};
          allTickers.list.forEach(ticker => {
            // Extract the base currency from the symbol (e.g., "BTCUSDT" -> "BTC")
            const baseCurrency = ticker.symbol.replace(/USDT$|USDC$|USD$|BTC$|ETH$/, '');
            tickerMap[baseCurrency] = parseFloat(ticker.lastPrice) || 0;
          });
          
          // Now match our symbols with available tickers
          for (const symbol of symbols) {
            if (tickerMap[symbol]) {
              prices[symbol] = tickerMap[symbol];
              console.log(`Found price for ${symbol} from Bybit: ${prices[symbol]}`);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching all tickers from Bybit:', e);
      }
    }
    
    // Fallback to HTX if we have a connection and missing prices
    const htxClient = createHuobiClient('htx');
    if (htxClient) {
      // Find symbols without prices
      const missingSymbols = symbols.filter(s => !prices[s]);
      
      if (missingSymbols.length > 0) {
        console.log(`Fetching prices for ${missingSymbols.length} missing symbols from HTX`);
        
        for (const symbol of missingSymbols) {
          try {
            const response = await htxClient.get('/market/detail/merged', {
              symbol: symbol.toLowerCase() + 'usdt'
            });
            
            if (response.status === 'ok' && response.tick) {
              prices[symbol] = response.tick.close || 0;
              console.log(`Found price for ${symbol} from HTX: ${prices[symbol]}`);
            }
          } catch (e) {
            // If specific symbol fails, continue with others
            console.log(`Could not get price for ${symbol} from HTX: ${e.message}`);
          }
        }
      }
    }
    
    // For any remaining missing prices, use mock prices
    const finalMissingSymbols = symbols.filter(s => !prices[s]);
    if (finalMissingSymbols.length > 0) {
      console.log(`Using mock prices for ${finalMissingSymbols.length} symbols that couldn't be found on any exchange`);
      
      for (const symbol of finalMissingSymbols) {
        prices[symbol] = mockPrice(symbol);
        console.log(`Using mock price for ${symbol}: ${prices[symbol]}`);
      }
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    
    // If everything fails, return mock prices for all
    console.log('Falling back to all mock prices due to error');
    return symbols.reduce((acc, symbol) => {
      acc[symbol] = mockPrice(symbol);
      return acc;
    }, {});
  }
}
async function fetchBybitBalances(exchangeId) {
  if (!portfolios[exchangeId].connected) return;
  
  loadingBalances[exchangeId] = true;
  errors[exchangeId] = null;
  
  try {
    const bybitClient = createBybitClient();
    
    if (!bybitClient) {
      throw new Error('Could not create Bybit client - no valid credentials');
    }

    // Get wallet balance with UNIFIED account type
    const balanceResponse = await bybitClient.get('/v5/account/wallet-balance', {
      accountType: 'UNIFIED'
    });

    // Update last sync time
    portfolios[exchangeId].lastSync = new Date().toISOString();

    // Process Bybit's response format
    if (balanceResponse && balanceResponse.list) {
      const balancesList = [];
      
      // Extract coins from each account in the list
      balanceResponse.list.forEach(account => {
        if (account.coin && account.coin.length > 0) {
          account.coin.forEach(coin => {
            balancesList.push({
              currency: coin.coin,
              balance: coin.walletBalance,
              // Bybit provides available balance separately
              free: coin.availableToWithdraw || coin.free || coin.walletBalance
            });
          });
        }
      });

      // Process these balances using your existing function
      processTokenBalances(exchangeId, balancesList);
    }
  } catch (err) {
    console.error('Error loading Bybit balances:', err);
    errors[exchangeId] = 'Failed to load balances: ' + (err.message || 'Unknown error');
  } finally {
    loadingBalances[exchangeId] = false;
  }
}
async function fetchHTXBalances(exchangeId) {
    if (!portfolios[exchangeId].connected) return;
    
    loadingBalances[exchangeId] = true;
    errors[exchangeId] = null;
    
    try {
        const htxClient = createHuobiClient(exchangeId);
        
        if (!htxClient) {
            throw new Error('Could not create HTX client - no valid credentials');
        }
        
        // 1. First get all accounts
        const accounts = await htxClient.get('/v1/account/accounts');
        if (accounts.status !== 'ok' || !accounts.data) {
            throw new Error(accounts['err-msg'] || 'Failed to fetch accounts');
        }
        
        // 2. Find spot account
        const spotAccount = accounts.data.find(acc => acc.type === 'spot');
        if (!spotAccount) {
            throw new Error('No spot account found');
        }
        
        // 3. Get account balance
        const balanceResponse = await htxClient.get(`/v1/account/accounts/${spotAccount.id}/balance`);
        if (balanceResponse.status !== 'ok' || !balanceResponse.data) {
            throw new Error(balanceResponse['err-msg'] || 'Failed to fetch balances');
        }
        
        // Update last sync time
        portfolios[exchangeId].lastSync = new Date().toISOString();
        
        // Process balance data
        if (balanceResponse.data.list) {
            const assets = [];
            
            // Calculate total balance and prepare assets list
            balanceResponse.data.list.forEach(item => {
                if (parseFloat(item.balance) > 0) {
                    assets.push({
                        currency: item.currency.toUpperCase(),
                        balance: parseFloat(item.balance),
                        type: item.type // 'trade' or 'frozen'
                    });
                }
            });
            
            // Get current prices (you'll need to implement this)
            const prices = await getCurrentPrices(assets.map(a => a.currency));
            
            // Calculate values and add to tokens
            assets.forEach(asset => {
                const price = prices[asset.currency] || 0;
                const value = asset.balance * price;
                
                // Add to tokens array (similar to your existing processTokenBalances)
                const existingIndex = tokens.findIndex(t => t.symbol === asset.currency);
                if (existingIndex >= 0) {
                    tokens[existingIndex].amount += asset.balance;
                    tokens[existingIndex].value += value;
                    tokens[existingIndex].exchanges[exchangeId] = {
                        amount: asset.balance,
                        value: value
                    };
                } else {
                    tokens.push({
                        symbol: asset.currency,
                        name: getCurrencyName(asset.currency),
                        amount: asset.balance,
                        price: price,
                        value: value,
                        exchanges: {
                            [exchangeId]: {
                                amount: asset.balance,
                                value: value
                            }
                        }
                    });
                }
                
                totalBalance += value;
            });
            
            // Force reactivity
            tokens = [...tokens];
        }
    } catch (err) {
        console.error('Error loading HTX balances:', err);
        errors[exchangeId] = 'Failed to load balances: ' + (err.message || 'Unknown error');
    } finally {
        loadingBalances[exchangeId] = false;
    }
}
  
  async function fetchMockBalances(exchangeId) {
    if (!portfolios[exchangeId].connected) return;
    
    loadingBalances[exchangeId] = true;
    errors[exchangeId] = null;
    
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update last sync time
      portfolios[exchangeId].lastSync = new Date().toISOString();
      
      // Mock data for demo
      const mockBalances = [
        { currency: 'BTC', balance: Math.random() * 0.5, price: 35000 + Math.random() * 5000 },
        { currency: 'ETH', balance: Math.random() * 5, price: 1800 + Math.random() * 400 },
        { currency: 'SOL', balance: Math.random() * 20, price: 40 + Math.random() * 20 },
        { currency: 'USDT', balance: 500 + Math.random() * 1000, price: 1 }
      ];
      
      processTokenBalances(exchangeId, mockBalances);
    } catch (err) {
      console.error(`Error loading ${exchangeId} balances:`, err);
      errors[exchangeId] = 'Failed to load balances.';
    } finally {
      loadingBalances[exchangeId] = false;
    }
  }
  
  function processTokenBalances(exchangeId, balancesList) {
  // Process tokens and add to the global list
  for (const item of balancesList) {
    // For HTX, the response format might be different
    const currency = item.currency || item.coin || '';
    // Some APIs return strings, others numbers - handle both
    const balance = parseFloat(item.balance || item.free || 0);
    // Mock price if not provided in the API response
    const price = parseFloat(item.price || 0) || mockPrice(currency);
    const value = balance * price;
    
    if (balance > 0) {
      // Add to total balance
      totalBalance += value;
      
      // Find existing token or add new one
      const existingTokenIndex = tokens.findIndex(t => 
        t.symbol.toLowerCase() === currency.toLowerCase());
      
      if (existingTokenIndex >= 0) {
        tokens[existingTokenIndex].amount += balance;
        tokens[existingTokenIndex].value += value;
        tokens[existingTokenIndex].exchanges[exchangeId] = {
          amount: balance,
          value: value
        };
      } else {
        tokens.push({
          symbol: currency.toUpperCase(),
          name: getCurrencyName(currency),
          amount: balance,
          price: price,
          value: value,
          exchanges: {
            [exchangeId]: {
              amount: balance,
              value: value
            }
          }
        });
      }
    }
  }
  
  // Force reactivity
  tokens = [...tokens];
}

// Helper function to mock prices for testing
function mockPrice(symbol) {
  const mockPrices = {
    'btc': 37500,
    'eth': 2100,
    'sol': 60,
    'ada': 0.45,
    'bnb': 320,
    'usdt': 1,
    'usdc': 1,
  };
  
  return mockPrices[symbol.toLowerCase()] || Math.random() * 100;
}
  
  function getCurrencyName(symbol) {
    const names = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'USDT': 'Tether',
      'BNB': 'Binance Coin',
      'ADA': 'Cardano',
      'XRP': 'Ripple',
      'DOT': 'Polkadot',
      'DOGE': 'Dogecoin',
      'AVAX': 'Avalanche'
    };
    
    return names[symbol] || symbol;
  }
  
  function openConnectionModal() {
    isConnectionModalOpen = true;
  }
  
  function closeConnectionModal() {
    isConnectionModalOpen = false;
  }
  
  async function handleExchangeConnect(event) {
    const connectionData = event.detail;
    
    // Update portfolios
    portfolios[connectionData.exchangeId] = {
      id: connectionData.exchangeId,
      name: getExchangeName(connectionData.exchangeId),
      exchangeId: connectionData.exchangeId,
      connected: true,
      authType: connectionData.authType,
      apiKey: connectionData.apiKey,
      lastSync: new Date().toISOString()
    };
    
    // Force svelte reactivity
    portfolios = { ...portfolios };
    
    // Fetch balances for the new connection
    await fetchBalances();
  }
  
  async function handleExchangeDisconnect(event) {
    const { exchangeId } = event.detail;
    
    // Remove from portfolios
    delete portfolios[exchangeId];
    
    // Force svelte reactivity
    portfolios = { ...portfolios };
    
    // Update tokens and balances
    await fetchBalances();
  }
  
  function handleDisconnect(exchangeId) {
    // Remove from localStorage
    localStorage.removeItem(`crypto_creds_${exchangeId}`);
    
    // Remove from portfolios
    delete portfolios[exchangeId];
    
    // Force svelte reactivity
    portfolios = { ...portfolios };
    
    // Update tokens and balances
    fetchBalances();
  }
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  
  function formatNumber(num, decimals = 8) {
    if (num === 0) return '0';
    
    // For very small numbers, use scientific notation
    if (Math.abs(num) < 0.00001) {
      return num.toExponential(decimals);
    }
    
    // For regular numbers, trim unnecessary zeros
    const formatted = num.toFixed(decimals);
    return formatted.replace(/\.?0+$/, '');
  }
</script>

<div class="dashboard">
  {#if isLoading}
  
    <div class="loading-state">
      <img src={prelogo1} alt="Logo" class="auth-logo" />

      <div class="loader"></div>
      <p>Loading your dashboard...</p>

    </div>
  {:else if !user}
    <div class="auth-prompt">
      <p>Please log in to view your dashboard</p>
    </div>
  {:else if Object.keys(portfolios).length === 0}
    <div class="empty-state">
      <h2>Welcome to Your Portfolio Dashboard</h2>
      <p>Connect your first exchange to start tracking your assets</p>
      <button class="connect-button" on:click={openConnectionModal}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Connect Exchange
      </button>
    </div>
  {:else}
    <div class="dashboard-header">
      <h1>Portfolio Dashboard</h1>
      <div class="actions">
        <button class="refresh-button" on:click={fetchBalances}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Refresh
        </button>
        <button class="connect-button" on:click={openConnectionModal}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Exchange
        </button>
      </div>
    </div>
    
    <div class="dashboard-grid">
      <section class="balance-overview">
        <h2>Total Balance</h2>
        <p class="balance-amount">{formatCurrency(totalBalance)}</p>

        <p class="balance-update">Last updated: {new Date().toLocaleString()}</p>
      </section>
      <section class="asset-allocation">
        <h2>Asset Allocation</h2>
        <PieChart {tokens} size={280} />

      </section>
      <section class="portfolios-section">
        <h2>Your Exchanges</h2>
        
        <div class="portfolios-grid">
          {#each Object.values(portfolios) as portfolio}
            <div class="portfolio-card">
              <div class="portfolio-header">
                <h3>{portfolio.name}</h3>
                <span class="auth-badge">{portfolio.authType.toUpperCase()}</span>
              </div>
              
              <div class="portfolio-body">
                {#if loadingBalances[portfolio.exchangeId]}
                  <div class="loading-indicator">
                    <div class="mini-loader"></div>
                    <span>Loading balances...</span>
                  </div>
                {:else if errors[portfolio.exchangeId]}
                  <div class="error-message">
                    {errors[portfolio.exchangeId]}
                  </div>
                {:else}
                  <div class="portfolio-stats">
                    <div class="stat">
                      <span class="stat-label">API Key</span>
                      <span class="stat-value">{portfolio.apiKey || '***'}</span>
                    </div>
                    <div class="stat">
                      <span class="stat-label">Last Synced</span>
                      <span class="stat-value">{new Date(portfolio.lastSync).toLocaleString()}</span>
                    </div>
                  </div>
                {/if}
              </div>
              
              <div class="portfolio-footer">
                <button class="disconnect-button" on:click={() => handleDisconnect(portfolio.exchangeId)}>
                  Disconnect
                </button>
              </div>
            </div>
          {/each}
        </div>
      </section>
      
      <section class="tokens-section">
        <h2>Your Assets ({tokens.length})</h2>
        
        {#if tokens.length === 0}
          <div class="no-tokens">
            <p>No assets found in your connected exchanges.</p>
          </div>
        {:else}
          <div class="token-list">
{#each tokens as token}
  <div class="token-card">
    <div class="token-header">
      <div class="token-info">
        <span class="token-icon">

        </span>
        <span class="token-symbol">          
          <img  class="token-logo"
          src={getTokenLogo(token.symbol)[0]} 
          alt={`${token.symbol} icon`}
          on:error={(e) => handleTokenLogoError(e, token.symbol)} 
        />
        {token.name}
      </span>
        <span class="token-name">{token.symbol}</span>
      </div>
      <div class="token-value">{formatCurrency(token.value)}</div>
    </div>
    
    <!-- Rest of your token card content -->
    <div class="token-details">
      <div class="token-detail">
        <span class="detail-label">Amount</span>
        <span class="detail-value">{formatNumber(token.amount)}</span>
      </div>
      <div class="token-detail">
        <span class="detail-label">Price</span>
        <span class="detail-value">{formatCurrency(token.price)}</span>
      </div>
    </div>
    
    <div class="token-exchanges">
      {#each Object.entries(token.exchanges) as [exchangeId, data]}
        <div class="token-exchange">
            <img class="exchange-logo"
              src={getExchangeInfo(exchangeId).logo} 
              alt={`${getExchangeName(exchangeId)} logo`}
              on:error={(e) => e.target.style.display = 'none'} 
            />
          <span class="exchange-name">{getExchangeName(exchangeId)}</span>
          <span class="exchange-amount">{formatNumber(data.amount)}</span>
        </div>
      {/each}
    </div>
  </div>
{/each}
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<ConnectExchangeModal 
  isOpen={isConnectionModalOpen} 
  on:close={closeConnectionModal}
  on:connect={handleExchangeConnect}
  on:disconnect={handleExchangeDisconnect}
/>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  
  .dashboard-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: #333;
  }
  
  .actions {
    display: flex;
    gap: 12px;
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  @media (min-width: 768px) {
    .dashboard-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .portfolios-section,
    .tokens-section {
      grid-column: 1 / -1;
    }
  }
  
  .loading-state,
  .auth-prompt,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 20px;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    min-height: 300px;
  }
  
  .loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  .mini-loader {
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .token-logo {
    opacity: 0.1;
    position: relative;
    width: 6rem;
  }
  .empty-state h2 {
    margin-top: 0;
    margin-bottom: 16px;
    border-bottom: none;
  }
  
  .empty-state p {
    margin-bottom: 24px;
    color: #666;
  }
  
  .connect-button, 
  .refresh-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .connect-button {
    background-color: #3498db;
    color: white;
    border: none;
  }
  
  .connect-button:hover {
    background-color: #2980b9;
  }
  
  .refresh-button {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }
  
  .refresh-button:hover {
    background-color: #e9e9e9;
  }
  
  section {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    font-size: 1.2rem;
  }
  
  .balance-overview {
    text-align: center;
  }
  
  .balance-amount {
    font-size: 3.5rem;
    font-weight: bold;
    color: #2ecc71;
    margin: 10px 0;
  }
  
  .balance-update {
    font-size: 0.875rem;
    color: #777;
    margin: 0;
  }
  
  .portfolios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  
  .portfolio-card {
    background-color: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .portfolio-header {
    padding: 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .portfolio-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  
  .auth-badge {
    font-size: 0.75rem;
    padding: 4px 8px;
    background-color: #e3f2fd;
    border-radius: 4px;
    color: #1976d2;
  }
  
  .portfolio-body {
    padding: 16px;
    min-height: 100px;
  }
  
  .portfolio-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: #777;
    margin-bottom: 4px;
  }
  
  .stat-value {
    font-size: 0.875rem;
    color: #333;
  }
  
  .portfolio-footer {
    padding: 12px 16px;
    border-top: 1px solid #eee;
    text-align: right;
  }
  
  .disconnect-button {
    padding: 6px 12px;
    background-color: transparent;
    color: #e74c3c;
    border: 1px solid #e74c3c;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .disconnect-button:hover {
    background-color: #fdeeee;
  }
  
  .loading-indicator {
    display: flex;
    align-items: center;
    color: #666;
    font-style: italic;
    font-size: 0.875rem;
  }
  
  .error-message {
    color: #e74c3c;
    font-size: 0.875rem;
    padding: 8px 12px;
    background-color: #fdeeee;
    border-left: 3px solid #e74c3c;
    border-radius: 4px;
  }
  
  .token-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  
  .token-card {
    background-color: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .token-header {
    padding: 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .token-info {
    display: flex;
    flex-direction: column;
  }
  
  .token-symbol {
    font-weight: bold;
    font-size: 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    height: 3rem;
    gap: 0.5rem;
  }
  
  .token-name {
    font-size: 1.25rem;
    display: flex;
    justify-content: flex-start;
    width: 100%;
    color: #666;
    margin-top: 4px;
    display: flex;

  }
  
  .token-value {
    font-weight: bold;
    color: #2ecc71;
    font-size: 1.25rem;
  }
  
  .token-details {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #eee;
    
  }
  
  .token-detail {
    display: flex;
    flex-direction: column;
  }
  
  .detail-label {
    font-size: 1rem;
    color: #777;
    margin-bottom: 4px;
  }
  
  .detail-value {
    font-size: 1rem;
    font-weight: 500;
  }
  
  .token-exchanges {
    padding: 12px 16px;
  }
  
  .token-exchange {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: left;
    padding: 8px 0;
    border-bottom: 1px solid #f5f5f5;
  }
  
  .token-exchange:last-child {
    border-bottom: none;
  }
  
  .exchange-name {
    font-size: 1rem;
    letter-spacing: 0.1rem;
    color: #797979;
    display: flex;
    margin-left: 1rem;
    justify-content: center;
    align-items: center;
    margin-right: auto;
    gap: 1rem;
  }


  .exchange-logo {
    font-size: 0.875rem;
    color: #333;
    width: 2rem;
    height: 2rem;
  }
  
  .exchange-amount {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
  }
  
  .no-tokens {
    padding: 32px 16px;
    text-align: center;
    color: #666;
    background-color: white;
    border-radius: 8px;
  }
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }
  
  section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    padding: 20px;
  }
  
  .asset-allocation {
    grid-column: 1 / -1;
  }
  
  @media (min-width: 768px) {
    .asset-allocation {
      grid-column: auto;
    }
  }
  
</style>