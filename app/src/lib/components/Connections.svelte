<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import ApiKeyForm from './ApiKeyForm.svelte';
    
    export let isOpen = false;
    
    const dispatch = createEventDispatcher();
    let selectedExchange = null;
    
    const exchanges = [
    { 
      id: 'binance', 
      name: 'Binance', 
      logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.svg?v=026', 
      description: 'Connect your Binance account using API keys'
    },
    { 
      id: 'bybit', 
      name: 'Bybit', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Bybit_Logo.svg',
      description: 'Connect your Bybit account using API keys'
    },
    { 
      id: 'huobi', 
      name: 'Huobi/HTX', 
      logo: 'https://cryptologos.cc/logos/huobi-token-ht-logo.svg?v=026',
      description: 'Connect your Huobi/HTX account using API keys'
    },
    { 
      id: 'coinbase', 
      name: 'Coinbase', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Coinbase.svg',
      description: 'Connect your Coinbase account using API keys'
    },
    { 
      id: 'kucoin', 
      name: 'Kucoin', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/KUCOIN.svg',
      description: 'Connect your Kucoin account using API keys'
    }
  ];
    
    function closeModal() {
      selectedExchange = null;
      dispatch('close');
    }
    
    function handleExchangeSelect(exchange) {
      selectedExchange = exchange;
    }
    
    function handleApiFormClose() {
      selectedExchange = null;
    }
    
    function handleConnect(event) {
      dispatch('connect', event.detail);
      closeModal();
    }
  </script>
  
  {#if isOpen}
    <div class="modal-overlay" on:click|self={closeModal}>
      {#if !selectedExchange}
        <div class="modal-container">
          <div class="modal-header">
            <h2>Connect Exchange</h2>
            <button class="close-button" on:click={closeModal}>×</button>
          </div>
          
          <div class="modal-body">
            <p class="modal-description">
              Connect to your preferred exchanges to track your portfolio balances and tokens.
            </p>
            
            <div class="exchanges-list">
              {#each exchanges as exchange}
                <button 
                  class="exchange-button" 
                  on:click={() => handleExchangeSelect(exchange)}
                >
                  <div class="exchange-logo">
                    <!-- Fallback to text if image doesn't load -->
                    <!-- <div class="logo-fallback">{exchange.name.charAt(0)}</div> -->
                    <img 
                      src={exchange.logo} 
                      alt={`${exchange.name} logo`} 
                      on:error={(e) => e.target.style.display = 'none'} 
                    />
                  </div>
                  <div class="exchange-info">
                    <span class="exchange-name">{exchange.name}</span>
                    <span class="exchange-description">{exchange.description}</span>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <ApiKeyForm 
          exchangeId={selectedExchange.id} 
          exchangeName={selectedExchange.name}
          on:close={handleApiFormClose}
          on:connect={handleConnect} 
        />
      {/if}
    </div>
  {/if}
  
  <style>
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .modal-container {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      padding-bottom: 0;
      border-bottom: none;
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }
    
    .close-button:hover {
      color: #333;
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .modal-description {
      margin-bottom: 20px;
      color: #666;
    }
    
    .exchanges-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .exchange-button {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 1px solid #eee;
      border-radius: 8px;
      background-color: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    
    .exchange-button:hover {
      border-color: #3498db;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .exchange-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      margin-right: 16px;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .exchange-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }
    
    .logo-fallback {
      position: absolute;
      font-size: 18px;
      font-weight: bold;
      color: #3498db;
    }
    
    .exchange-info {
      display: flex;
      flex-direction: column;
    }
    
    .exchange-name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .exchange-description {
      font-size: 0.875rem;
      color: #666;
    }
  </style>