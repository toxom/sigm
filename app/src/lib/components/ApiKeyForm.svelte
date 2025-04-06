<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let exchangeId: string;
    export let exchangeName: string;
    
    const dispatch = createEventDispatcher();
    
    let apiKey = '';
    let apiSecret = '';
    let isSubmitting = false;
    let error = '';
    
    // Additional field for Huobi/HTX
    let addressTag = '';
    
    // Exchange-specific field visibility
    $: showAddressTag = exchangeId === 'huobi';
    
    function closeForm() {
      dispatch('close');
    }
    
    function getExchangeInstructions() {
      if (exchangeId === 'huobi') {
        return `To create API keys on Huobi/HTX:
1. Log in to your Huobi/HTX account
2. Navigate to Account → API Management
3. Create a new API key with 'Read-Only' permissions
4. Save both the Access Key and Secret Key`;
      }
      
      return `Enter your API Key and Secret from ${exchangeName} to connect your account.
Your keys are stored securely and used only to fetch your portfolio data.`;
    }
    
    async function handleSubmit() {
      if (!apiKey || !apiSecret) {
        error = 'Both API Key and Secret are required';
        return;
      }
      
      isSubmitting = true;
      error = '';
      
      try {
        // Here you would make a request to your backend to save the API credentials
        // and establish a connection with the exchange
        
        // Simulating API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const connectionData = {
          exchangeId,
          apiKey: '***' + apiKey.substring(3), // Don't send full key back to UI
          connected: true,
          // Include additional Huobi-specific data if needed
          ...(exchangeId === 'huobi' && addressTag ? { addressTag } : {})
        };
        
        dispatch('connect', connectionData);
      } catch (err) {
        error = 'Failed to connect. Please check your API credentials.';
        console.error('Connection error:', err);
      } finally {
        isSubmitting = false;
      }
    }
  </script>
  
  <div class="form-container">
    <div class="form-header">
      <h2>Connect to {exchangeName}</h2>
      <button class="close-button" on:click={closeForm}>×</button>
    </div>
    
    <div class="form-body">
      <p class="instructions">
        {getExchangeInstructions()}
      </p>
      
      <div class="security-note">
        <strong>Important:</strong> For security, create API keys with "Read-Only" permissions.
        Never share API keys with withdrawal permissions.
      </div>
      
      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="apiKey">
            {exchangeId === 'huobi' ? 'Access Key' : 'API Key'}
          </label>
          <input 
            type="text" 
            id="apiKey" 
            bind:value={apiKey} 
            placeholder={exchangeId === 'huobi' ? 'Enter your Access Key' : 'Enter your API Key'}
            disabled={isSubmitting}
          />
        </div>
        
        <div class="form-group">
          <label for="apiSecret">
            {exchangeId === 'huobi' ? 'Secret Key' : 'API Secret'}
          </label>
          <input 
            type="password" 
            id="apiSecret" 
            bind:value={apiSecret} 
            placeholder={exchangeId === 'huobi' ? 'Enter your Secret Key' : 'Enter your API Secret'}
            disabled={isSubmitting}
          />
        </div>
        
        {#if showAddressTag}
          <div class="form-group">
            <label for="addressTag">Address Tag (Optional)</label>
            <input 
              type="text" 
              id="addressTag" 
              bind:value={addressTag} 
              placeholder="Enter address tag if applicable"
              disabled={isSubmitting}
            />
            <small class="helper-text">
              Only required for specific deposit addresses that need a tag/memo
            </small>
          </div>
        {/if}
        
        <div class="form-actions">
          <button 
            type="button" 
            class="cancel-button" 
            on:click={closeForm}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="submit-button" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  </div>
  
  <style>
    .form-container {
      background-color: white;
      border-radius: 8px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
    }
    
    .form-header h2 {
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
    
    .form-body {
      padding: 20px;
    }
    
    .instructions {
      margin-bottom: 16px;
      color: #666;
      white-space: pre-line;
    }
    
    .security-note {
      background-color: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 0.875rem;
    }
    
    .error-message {
      background-color: #ffebee;
      border-left: 4px solid #f44336;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: #c62828;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    input:focus {
      border-color: #3498db;
      outline: none;
    }
    
    .helper-text {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: #666;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    
    .cancel-button, 
    .submit-button {
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .cancel-button {
      background-color: #f5f5f5;
      color: #333;
      border: 1px solid #ddd;
    }
    
    .cancel-button:hover {
      background-color: #e9e9e9;
    }
    
    .submit-button {
      background-color: #3498db;
      color: white;
      border: none;
    }
    
    .submit-button:hover {
      background-color: #2980b9;
    }
    
    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  </style>