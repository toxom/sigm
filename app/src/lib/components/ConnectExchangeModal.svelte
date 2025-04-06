<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import ApiKeyForm from './ApiKeyForm.svelte';
  import { EXCHANGES } from '$lib/utils/exchanges';

  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  let selectedExchange = null;
  let connectedExchanges = {};
  
  // Check for connected exchanges on mount
  onMount(() => {
    checkConnectedExchanges();
  });
  
  function checkConnectedExchanges() {
    // Initialize empty object
    connectedExchanges = {};
    
    // Check localStorage for each exchange
    EXCHANGES.forEach(exchange => {
      const storedCreds = localStorage.getItem(`crypto_creds_${exchange.id}`);
      if (storedCreds) {
        try {
          const credentials = JSON.parse(storedCreds);
          connectedExchanges[exchange.id] = {
            connected: true,
            apiKey: credentials.apiKey ? '***' + credentials.apiKey.substring(3) : '***',
            authType: credentials.authType || 'hmac'
          };
        } catch (err) {
          console.error(`Error parsing stored credentials for ${exchange.id}:`, err);
        }
      }
    });
  }
  
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
    // Update connected exchanges list
    checkConnectedExchanges();
    
    // Notify parent component
    dispatch('connect', event.detail);
    closeModal();
  }
  
  function handleDisconnect(exchangeId) {
    // Remove from localStorage
    localStorage.removeItem(`crypto_creds_${exchangeId}`);
    
    // Update connected exchanges list
    checkConnectedExchanges();
    
    // Notify parent component
    dispatch('disconnect', { exchangeId });
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
            {#each EXCHANGES as exchange}
              <div 
                class="exchange-button {connectedExchanges[exchange.id] ? 'connected' : ''}"
              >
                <div class="exchange-logo">
                  <img 
                    src={exchange.logo} 
                    alt={`${exchange.name} logo`} 
                    on:error={(e) => e.target.style.display = 'none'} 
                  />
                </div>
                <div class="exchange-info">
                  <span class="exchange-name">{exchange.name}</span>
                  {#if connectedExchanges[exchange.id]}
                    <span class="exchange-status connected">
                      Connected • {connectedExchanges[exchange.id].authType.toUpperCase()}
                    </span>
                  {:else}
                    <span class="exchange-description">{exchange.description}</span>
                  {/if}
                </div>
                
                <div class="exchange-actions">
                  {#if connectedExchanges[exchange.id]}
                    <div class="button-group">
                      <button 
                        class="reconnect-button"
                        on:click|stopPropagation={() => handleExchangeSelect(exchange)}
                      >
                        Reconnect
                      </button>
                      <button 
                        class="disconnect-button"
                        on:click|stopPropagation={() => handleDisconnect(exchange.id)}
                      >
                        Disconnect
                      </button>
                    </div>
                  {:else}
                    <button 
                      class="connect-button" 
                      on:click|stopPropagation={() => handleExchangeSelect(exchange)}
                    >
                      Connect
                    </button>
                  {/if}
                </div>
              </div>
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
    text-align: left;
    transition: all 0.2s ease;
  }
  
  .exchange-button:hover {
    border-color: #3498db;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .exchange-button.connected {
    border-color: #2ecc71;
    background-color: rgba(46, 204, 113, 0.05);
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
    flex-shrink: 0;
  }
  
  .exchange-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .exchange-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
  
  .exchange-name {
    font-weight: bold;
    margin-bottom: 4px;
  }
  
  .exchange-description {
    font-size: 0.875rem;
    color: #666;
  }
  
  .exchange-status {
    font-size: 0.875rem;
  }
  
  .exchange-status.connected {
    color: #2ecc71;
  }
  
  .exchange-actions {
    margin-left: auto;
    flex-shrink: 0;
  }
  
  .connect-button,
  .reconnect-button,
  .disconnect-button {
    padding: 8px 12px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    font-size: 0.875rem;
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
  
  .button-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .reconnect-button {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }
  
  .reconnect-button:hover {
    background-color: #e9e9e9;
  }
  
  .disconnect-button {
    background-color: #fff;
    color: #e74c3c;
    border: 1px solid #e74c3c;
  }
  
  .disconnect-button:hover {
    background-color: #fdeeee;
  }
</style>