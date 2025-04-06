<script lang="ts">
    import { onMount } from 'svelte';
    import { pb, currentUser, ensureAuthenticated } from '$lib/pocketbase';
    import Connections from '$lib/components/Connections.svelte';
    
    let isLoading = true;
    let balance = 0;
    let tokens = [];
    let user = null;
    let portfolios = [];
    let isConnectionModalOpen = false;
    
    onMount(async () => {
      try {
        // Check if user is authenticated
        const isAuthenticated = await ensureAuthenticated();
        
        // Subscribe to the currentUser store
        const unsubscribe = currentUser.subscribe(value => {
          user = value;
        });
        
        // Fetch user data if authenticated
        if (isAuthenticated && user) {
          await fetchUserData();
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
    
    async function fetchUserData() {
      try {
        // In a real implementation, this would fetch from PocketBase
        // For now, we'll use sample data
        
        // Mock empty portfolios for initial implementation
        portfolios = [];
        
        // Only populate balance and tokens if we have portfolios
        if (portfolios.length > 0) {
          balance = 1250.75;
          tokens = [
            { id: 1, name: 'Token A', amount: 25 },
            { id: 2, name: 'Token B', amount: 50 },
            { id: 3, name: 'Token C', amount: 10 }
          ];
        } else {
          balance = 0;
          tokens = [];
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
    
    function openConnectionModal() {
      isConnectionModalOpen = true;
    }
    
    function closeConnectionModal() {
      isConnectionModalOpen = false;
    }
    
    async function handleExchangeSelect(event) {
      const { exchangeId } = event.detail;
      
      // Here you would show a form to collect API keys and connect to the exchange
      // For this demo, we'll just add a mock portfolio
      
      // Mock adding a new portfolio
      portfolios = [...portfolios, {
        id: Date.now().toString(),
        name: exchangeId === 'binance' ? 'Binance' : 'Bybit',
        exchangeId,
        connected: true,
        lastSync: new Date().toISOString()
      }];
      
      // After adding a portfolio, fetch user data again to update balances
      await fetchUserData();
    }
  </script>
  
  <div class="dashboard">
    {#if isLoading}
      <div class="loading-state">
        <p>Loading your dashboard...</p>
      </div>
    {:else if !user}
      <div class="auth-prompt">
        <p>Please log in to view your dashboard</p>
      </div>
    {:else if portfolios.length === 0}
      <div class="empty-state">
        <h2>Welcome to Your Portfolio Dashboard</h2>
        <p>Connect your first exchange to start tracking your assets</p>
        <button class="connect-button" on:click={openConnectionModal}>
          Connect Exchange
        </button>
      </div>
    {:else}
      <section class="portfolios-section">
        <div class="section-header">
          <h2>Your Portfolios</h2>
          <button class="add-button" on:click={openConnectionModal}>
            Add Exchange
          </button>
        </div>
        
        <ul class="portfolios-list">
          {#each portfolios as portfolio}
            <li class="portfolio-item">
              <div class="portfolio-name">{portfolio.name}</div>
              <div class="portfolio-status">
                {#if portfolio.connected}
                  <span class="status-connected">Connected</span>
                {:else}
                  <span class="status-disconnected">Disconnected</span>
                {/if}
              </div>
              <div class="portfolio-last-sync">
                Last sync: {new Date(portfolio.lastSync).toLocaleString()}
              </div>
            </li>
          {/each}
        </ul>
      </section>
      
      <section class="balance-section">
        <h2>Your Balance</h2>
        <p class="balance-amount">${balance.toFixed(2)}</p>
      </section>
      
      <section class="tokens-section">
        <h2>Your Tokens</h2>
        {#if tokens.length === 0}
          <p>No tokens found in your connected portfolios.</p>
        {:else}
          <ul class="token-list">
            {#each tokens as token}
              <li class="token-item">
                <span class="token-name">{token.name}</span>
                <span class="token-amount">{token.amount}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </div>
  
  <Connections 
    isOpen={isConnectionModalOpen} 
    on:close={closeConnectionModal}
    on:select={handleExchangeSelect}
  />
  
  <style>
    .dashboard {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    
    @media (min-width: 768px) {
      .dashboard {
        grid-template-columns: 1fr 1fr;
      }
      
      .portfolios-section {
        grid-column: 1 / -1;
      }
    }
    
    .loading-state,
    .auth-prompt,
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .empty-state h2 {
      margin-bottom: 16px;
      border-bottom: none;
    }
    
    .empty-state p {
      margin-bottom: 24px;
      color: #666;
    }
    
    .connect-button, 
    .add-button {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .connect-button:hover,
    .add-button:hover {
      background-color: #2980b9;
    }
    
    .add-button {
      padding: 6px 12px;
      font-size: 0.875rem;
    }
    
    section {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h2 {
      margin: 0;
      padding: 0;
      border-bottom: none;
    }
    
    h2 {
      margin-top: 0;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .balance-amount {
      font-size: 32px;
      font-weight: bold;
      color: #2ecc71;
    }
    
    .portfolios-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .portfolio-item {
      display: flex;
      flex-direction: column;
      padding: 16px;
      border: 1px solid #eee;
      border-radius: 8px;
      margin-bottom: 12px;
      background-color: white;
    }
    
    @media (min-width: 640px) {
      .portfolio-item {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    
    .portfolio-name {
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    @media (min-width: 640px) {
      .portfolio-name {
        margin-bottom: 0;
      }
    }
    
    .portfolio-status {
      margin-bottom: 8px;
    }
    
    @media (min-width: 640px) {
      .portfolio-status {
        margin-bottom: 0;
      }
    }
    
    .status-connected {
      background-color: #2ecc71;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    
    .status-disconnected {
      background-color: #e74c3c;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    
    .portfolio-last-sync {
      font-size: 0.75rem;
      color: #777;
    }
    
    .token-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .token-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .token-item:last-child {
      border-bottom: none;
    }
    
    .token-name {
      font-weight: bold;
    }
    
    .token-amount {
      background-color: #3498db;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
    }
  </style>