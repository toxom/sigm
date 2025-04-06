<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let exchangeId: string;
  export let exchangeName: string;
  
  interface ExchangeCredentials {
    apiKey: string;
    authType: string;
    timestamp: number;
    privateKey?: string;
    apiSecret?: string;
    addressTag?: string;
  }
  const dispatch = createEventDispatcher();
  
  let apiKey = '';
  let apiSecret = '';
  let privateKey = '';
  let isSubmitting = false;
  let error = '';
  
  // Additional field for Huobi/HTX
  let addressTag = '';
  
  // Exchange-specific field visibility
  $: showAddressTag = exchangeId === 'huobi' || exchangeId === 'htx';
  $: isHTX = exchangeId === 'huobi' || exchangeId === 'htx';
  $: isBybit = exchangeId === 'bybit';
  $: supportsEd25519 = isHTX || isBybit;
  $: useEd25519 = supportsEd25519 ? false : false; // Default to HMAC for now, but can be toggled
  
  // Check localStorage on component mount
  onMount(() => {
    const savedCredentials = localStorage.getItem(`crypto_creds_${exchangeId}`);
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        // Pre-fill the form with saved credentials
        apiKey = credentials.apiKey || '';
        if (credentials.authType === 'ed25519') {
          useEd25519 = true;
          privateKey = credentials.privateKey || '';
        } else {
          apiSecret = credentials.apiSecret || '';
        }
        addressTag = credentials.addressTag || '';
        
        // If we have valid credentials, auto-connect
        if ((useEd25519 && apiKey && privateKey) || (!useEd25519 && apiKey && apiSecret)) {
          handleAutoConnect();
        }
      } catch (err) {
        console.error('Error parsing saved credentials:', err);
      }
    }
  });
  
  function closeForm() {
    dispatch('close');
  }
  
  function getExchangeInstructions() {
    if (isHTX) {
      if (useEd25519) {
        return `To create ED25519 API keys on HTX:
1. Generate ED25519 key pair locally using a tool like OpenSSL
2. Log in to your HTX account
3. Navigate to Account → API Management
4. Select "Create ED25519 API"
5. Enter your Public Key (not your Private Key) into HTX
6. Select "Read-Only" permissions and bind your IP for security
7. Save your Access Key ID

Then enter your Access Key ID and the Private Key you generated locally below.`;
      } else {
        return `To create API keys on HTX:
1. Log in to your HTX account
2. Navigate to Account → API Management
3. Create a new API key with 'Read-Only' permissions and bind your IP
4. Save both the Access Key and Secret Key`;
      }
    } else if (isBybit) {
      if (useEd25519) {
        return `To create ED25519 API keys on Bybit:
1. Generate ED25519 key pair locally using a tool like OpenSSL
2. Log in to your Bybit account
3. Navigate to Account → API Management
4. Select "Create ED25519 API"
5. Enter your Public Key (not your Private Key) into Bybit
6. Select "Read-Only" permissions and bind your IP for security
7. Save your Access Key ID

Then enter your Access Key ID and the Private Key you generated locally below.`;
      } else {
        return `To create API keys on Bybit:
1. Log in to your Bybit account
2. Navigate to Account → API Management
3. Create a new API key with 'Read-Only' permissions and bind your IP
4. Save both the Access Key and Secret Key`;
      }
    }
    
    return `Enter your API Key and Secret from ${exchangeName} to connect your account.
Your keys are stored securely in your browser and used only to fetch your portfolio data.`;
  }
  
  // Function to handle connections with saved credentials
  async function handleAutoConnect() {
    isSubmitting = true;
    error = '';
    
    try {
      // Simulate checking connection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const connectionData = {
        exchangeId,
        apiKey: '***' + apiKey.substring(3), // Don't send full key back to UI
        connected: true,
        ...(isHTX && addressTag ? { addressTag } : {}),
        authType: useEd25519 ? 'ed25519' : 'hmac'
      };
      
      dispatch('connect', connectionData);
    } catch (err) {
      // If auto-connect fails, let the user try manually
      isSubmitting = false;
      console.error('Auto-connect error:', err);
    }
  }
  
  async function handleSubmit() {
    if (useEd25519) {
      if (!apiKey || !privateKey) {
        error = 'Both Access Key and Private Key are required';
        return;
      }
    } else {
      if (!apiKey || !apiSecret) {
        error = 'Both API Key and Secret are required';
        return;
      }
    }
    
    isSubmitting = true;
    error = '';
    
    try {
      // Save credentials to localStorage with proper typing
      const credentialsToSave: ExchangeCredentials = {
        apiKey,
        authType: useEd25519 ? 'ed25519' : 'hmac',
        timestamp: Date.now()
      };
      
      // Add the appropriate secret based on auth type
      if (useEd25519) {
        credentialsToSave.privateKey = privateKey;
      } else {
        credentialsToSave.apiSecret = apiSecret;
      }
      
      // Add address tag if applicable
      if (showAddressTag && addressTag) {
        credentialsToSave.addressTag = addressTag;
      }
      
      // Save to localStorage
      localStorage.setItem(`crypto_creds_${exchangeId}`, JSON.stringify(credentialsToSave));
      
      // Simulate API connection verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const connectionData = {
        exchangeId,
        apiKey: '***' + apiKey.substring(3), // Don't send full key back to UI
        connected: true,
        ...(showAddressTag && addressTag ? { addressTag } : {}),
        authType: useEd25519 ? 'ed25519' : 'hmac'
      };
      
      dispatch('connect', connectionData);
    } catch (err) {
      error = 'Failed to connect. Please check your API credentials.';
      console.error('Connection error:', err);
      isSubmitting = false;
    }
  }
  
  function toggleAuthMethod() {
    useEd25519 = !useEd25519;
    // Reset fields when toggling
    if (useEd25519) {
      apiSecret = '';
    } else {
      privateKey = '';
    }
    // Clear saved credentials when switching auth methods
    localStorage.removeItem(`crypto_creds_${exchangeId}`);
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
      {#if isHTX || isBybit}
        Binding your IP address is strongly recommended.
      {/if}
      
      <p class="mt-2">Your keys are stored locally in your browser and never sent to our servers.</p>
    </div>
    
    {#if supportsEd25519}
      <div class="auth-toggle">
        <button 
          type="button" 
          class="toggle-button" 
          on:click={toggleAuthMethod}
          disabled={isSubmitting}
        >
          Switch to {useEd25519 ? 'HMAC' : 'ED25519'} authentication
        </button>
        
        {#if useEd25519}
          <div class="info-box">
            <p>ED25519 authentication is more secure than HMAC:</p>
            <ul>
              <li>Your private key never leaves your system</li>
              <li>{isHTX ? 'HTX' : 'Bybit'} only has your public key, which cannot be used to create signatures</li>
              <li>Better protection against key theft</li>
            </ul>
            <a href={isHTX ? "https://www.htx.com/support/articles/learn-how-to-get-a-public-key-via-ed25519" : "https://www.bybit.com/en/help-center/article/how-to-create-api-keys"} target="_blank" rel="noopener noreferrer">
              Learn how to generate ED25519 keys
            </a>
          </div>
        {/if}
      </div>
    {/if}
    
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="apiKey">Access Key</label>
        <input 
          type="text" 
          id="apiKey" 
          bind:value={apiKey} 
          placeholder="Enter your Access Key"
          disabled={isSubmitting}
        />
      </div>
      
      {#if useEd25519}
        <div class="form-group">
          <label for="privateKey">Your Private Key</label>
          <textarea 
            id="privateKey" 
            bind:value={privateKey} 
            placeholder="Enter your ED25519 Private Key (stored only in your browser)"
            disabled={isSubmitting}
            rows="3"
          ></textarea>
          <small class="helper-text">
            Your private key is stored in your browser and used to sign API requests locally.
            It never leaves your device or gets sent to {isHTX ? 'HTX' : 'Bybit'}.
          </small>
        </div>
      {:else}
        <div class="form-group">
          <label for="apiSecret">Secret Key</label>
          <input 
            type="password" 
            id="apiSecret" 
            bind:value={apiSecret} 
            placeholder="Enter your Secret Key"
            disabled={isSubmitting}
          />
          <small class="helper-text">
            Your secret key is stored in your browser and used only for API authentication.
          </small>
        </div>
      {/if}
      
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
  
  .mt-2 {
    margin-top: 8px;
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
  
  input, textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  input:focus, textarea:focus {
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
  .submit-button,
  .toggle-button {
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
  
  .auth-toggle {
    margin-bottom: 20px;
  }
  
  .toggle-button {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    padding: 8px 16px;
    font-weight: normal;
  }
  
  .toggle-button:hover {
    background-color: #e9e9e9;
  }
  
  .info-box {
    margin-top: 12px;
    background-color: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 12px 16px;
    font-size: 0.875rem;
  }
  
  .info-box ul {
    margin: 8px 0 8px 20px;
    padding: 0;
  }
  
  .info-box a {
    color: #1976d2;
    text-decoration: none;
  }
  
  .info-box a:hover {
    text-decoration: underline;
  }
  
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>