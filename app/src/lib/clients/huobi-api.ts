import axios from 'axios';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import CryptoJS from 'crypto-js'; // Import CryptoJS library

ed.etc.sha512Sync = sha512;

interface HuobiCredentials {
  apiKey: string;
  privateKey?: string; // For ED25519
  apiSecret?: string;  // For HMAC
  authType: 'ed25519' | 'hmac';
}

interface DepositAddress {
  userId: number;
  currency: string;
  address: string;
  addressTag: string;
  chain: string;
}

export class HuobiApiClient {
  private baseUrl: string;
  private credentials: HuobiCredentials | null = null;

  constructor(useAwsEndpoint = false) {
    this.baseUrl = useAwsEndpoint ? 'https://api-aws.huobi.pro' : 'https://api.huobi.pro';
  }
  
  /**
   * Initialize client with credentials from localStorage
   * @param exchangeId The exchange identifier (e.g., 'huobi' or 'htx')
   * @returns True if credentials were found and loaded successfully
   */
  loadCredentialsFromStorage(exchangeId: string): boolean {
    console.log(`DEBUG: Loading credentials from storage for ${exchangeId}`);
    const savedCredentials = localStorage.getItem(`crypto_creds_${exchangeId}`);
    
    if (!savedCredentials) {
      console.error(`DEBUG: No credentials found in localStorage for ${exchangeId}`);
      return false;
    }
    
    try {
      const credentials = JSON.parse(savedCredentials);
      console.log(`DEBUG: Found credentials:`, {
        hasApiKey: !!credentials.apiKey,
        authType: credentials.authType,
        hasPrivateKey: !!credentials.privateKey,
        hasApiSecret: !!credentials.apiSecret
      });
      
      if (credentials.authType === 'ed25519') {
        if (!credentials.apiKey || !credentials.privateKey) {
          console.error(`DEBUG: Missing required fields for ED25519 auth`);
          return false;
        }
        this.credentials = {
          apiKey: credentials.apiKey,
          privateKey: credentials.privateKey,
          authType: 'ed25519'
        };
        console.log(`DEBUG: Successfully loaded ED25519 credentials`);
      } else {
        if (!credentials.apiKey || !credentials.apiSecret) {
          console.error(`DEBUG: Missing required fields for HMAC auth`);
          return false;
        }
        this.credentials = {
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          authType: 'hmac'
        };
        console.log(`DEBUG: Successfully loaded HMAC credentials`);
      }
      
      return true;
    } catch (error) {
      console.error('DEBUG: Error parsing credentials from localStorage:', error);
      return false;
    }
  }
  
  /**
   * Set credentials directly (used when not loading from storage)
   */
  setCredentials(credentials: HuobiCredentials): void {
    this.credentials = credentials;
  }
  
  /**
   * Check if credentials are loaded and valid
   */
  hasValidCredentials(): boolean {
    if (!this.credentials) {
      return false;
    }
    
    if (this.credentials.authType === 'ed25519') {
      return !!this.credentials.apiKey && !!this.credentials.privateKey;
    } else {
      return !!this.credentials.apiKey && !!this.credentials.apiSecret;
    }
  }

  private formatTimestamp(): string {
    // Get current time in UTC
    const now = new Date();
    
    // Format to ISO 8601 without milliseconds (YYYY-MM-DDThh:mm:ss)
    const isoDate = now.toISOString().split('.')[0];
    
    console.log(`DEBUG: Raw ISO timestamp: ${isoDate}`);
    return isoDate;
}
  /**
   * Create signature base string with proper parameter encoding
   */
  private createSignatureBaseString(method: string, host: string, path: string, params: Record<string, string>): string {
    // Build the parameter string with proper URL encoding of each key and value
    const paramString = Object.keys(params)
      .sort() // Huobi requires parameters to be sorted alphabetically
      .map(key => {
        // Ensure both key and value are properly URL encoded
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(params[key]);
        return `${encodedKey}=${encodedValue}`;
      })
      .join('&');
    
    // Create signature base string
    const signatureBaseString = `${method.toUpperCase()}\n${host.toLowerCase()}\n${path}\n${paramString}`;
    
    console.log('DEBUG: Signature base string:', signatureBaseString);
    return signatureBaseString;
  }
  
  /**
   * Updated createSignature method to use the new signature base string creator
   */
  private async createSignature(method: string, host: string, path: string, params: Record<string, string>): Promise<string> {
    if (!this.credentials) {
      throw new Error('No credentials loaded');
    }
    
    // Create signature base string with proper encoding
    const signatureBaseString = this.createSignatureBaseString(method, host, path, params);
    
    let signature: string;
    if (this.credentials.authType === 'ed25519') {
      // ED25519 signing
      const privateKeyBytes = hexToBytes(this.credentials.privateKey!);
      const messageBytes = new TextEncoder().encode(signatureBaseString);
      const signatureBytes = await ed.sign(messageBytes, privateKeyBytes);
      signature = bytesToBase64(signatureBytes);
    } else {
      // HMAC signing
      const hmacSignature = CryptoJS.HmacSHA256(signatureBaseString, this.credentials.apiSecret!);
      signature = CryptoJS.enc.Base64.stringify(hmacSignature);
    }
    
    console.log('DEBUG: Generated signature:', signature);
    return signature;
  }
/**
 * Gets deposit addresses for a specific cryptocurrency
 */
async getDepositAddresses(currency: string): Promise<DepositAddress[]> {
  if (!this.hasValidCredentials()) {
    throw new Error('Invalid or missing credentials');
  }
  
  const host = new URL(this.baseUrl).host;
  const path = '/v2/account/deposit/address';
  const method = 'GET';
  
  // Use the standardized timestamp
  const timestamp = this.formatTimestamp();
  
  const params: Record<string, string> = { 
    currency,
    AccessKeyId: this.credentials!.apiKey,
    SignatureMethod: this.credentials!.authType === 'ed25519' ? 'Ed25519' : 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: timestamp
  };
  
  const signature = await this.createSignature(method, host, path, params);
  
  // Add signature to parameters
  const requestParams = {
    ...params,
    Signature: signature
  };

  try {
    const response = await axios.get(`${this.baseUrl}${path}`, {
      params: requestParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.code === 200) {
      return response.data.data;
    } else {
      throw new Error(`API Error: ${response.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('HTX API request failed:', error);
    throw error;
  }
}

/**
 * Executes a POST request to the HTX API
 */
async post(path: string, data: Record<string, any> = {}): Promise<any> {
  if (!this.hasValidCredentials()) {
    throw new Error('Invalid or missing credentials');
  }
  
  const host = new URL(this.baseUrl).host;
  const method = 'POST';
  
  // Use the standardized timestamp
  const timestamp = this.formatTimestamp();
  
  // Create auth params with the timestamp
  const authParams = {
    AccessKeyId: this.credentials!.apiKey,
    SignatureMethod: this.credentials!.authType === 'ed25519' ? 'Ed25519' : 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: timestamp
  };
  
  // Pass auth params for signature creation
  const signature = await this.createSignature(method, host, path, authParams);
  
  // Use the same params as were used for signature creation
  const requestParams = {
    ...authParams,
    Signature: signature
  };
  
  try {
    const response = await axios.post(`${this.baseUrl}${path}`, data, {
      params: requestParams,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('HTX API request failed:', error);
    throw error;
  }
}

/**
 * Executes a GET request to the HTX API
 */
async get(path: string, params: Record<string, string> = {}): Promise<any> {
  if (!this.hasValidCredentials()) {
    console.error("DEBUG: Invalid or missing credentials for API call");
    throw new Error('Invalid or missing credentials');
  }
  
  const host = new URL(this.baseUrl).host;
  const method = 'GET';
  
  // Use the standardized timestamp
  const timestamp = this.formatTimestamp();
  console.log(`DEBUG: Using timestamp: ${timestamp}`);
  
  const allParams: Record<string, string> = {
    ...params,
    AccessKeyId: this.credentials!.apiKey,
    SignatureMethod: this.credentials!.authType === 'ed25519' ? 'Ed25519' : 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: timestamp
  };
  
  console.log(`DEBUG: Creating signature for GET ${path} with params:`, allParams);
  const signature = await this.createSignature(method, host, path, allParams);
  
  // Add signature to the parameters
  const requestParams = {
    ...allParams,
    Signature: signature
  };
  
  console.log(`DEBUG: Making GET request to: ${this.baseUrl}${path}`);
  console.log(`DEBUG: Full request params:`, requestParams);
  
  try {
    const response = await axios.get(`${this.baseUrl}${path}`, {
      params: requestParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('DEBUG: HTX API request failed:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred');
    }
  }
}

  
  /**
   * Get account balances across all coins
   */
  async getBalances(): Promise<any> {
    console.log("DEBUG: Starting getBalances call");
    try {
      // First get account list (without balance)
      console.log("DEBUG: Fetching account list...");
      const accountsResponse = await this.get('/v1/account/accounts');
      console.log("DEBUG: Accounts API response:", JSON.stringify(accountsResponse));
      
      if (!accountsResponse || accountsResponse.status !== 'ok' || !accountsResponse.data || accountsResponse.data.length === 0) {
        console.error("DEBUG: No accounts found in API response:", accountsResponse);
        throw new Error(`API Error: ${accountsResponse['err-msg'] || 'Unknown error'}`);
      }
      
      // Find spot account
      console.log("DEBUG: Looking for spot account in:", accountsResponse.data);
      const spotAccount = accountsResponse.data.filter((account: any) => account.type === 'spot');
      
      if (!spotAccount) {
        console.error("DEBUG: No spot trading account found in accounts list");
        throw new Error("No spot trading account found");
      }
      
      console.log("DEBUG: Found spot account:", spotAccount);
      
      // Get balances for spot account using the correct endpoint
      console.log(`DEBUG: Fetching balances for account ID: ${spotAccount.id}`);
      const balancesResponse = await this.get(`/v1/account/accounts/${spotAccount.id}/balance`);
      console.log("DEBUG: Balances response:", JSON.stringify(balancesResponse));
      
      return balancesResponse;
    } catch (error) {
      console.error("DEBUG: Error in getBalances:", error);
      console.error("DEBUG: Error stack:", error instanceof Error ? error.stack : '');
      throw error;
    }
  }
}

// Helper functions for binary data conversion
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}



function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binString);
}

// Example usage
export function createHuobiClient(exchangeId: string = 'htx'): HuobiApiClient | null {
  const client = new HuobiApiClient();
  
  if (client.loadCredentialsFromStorage(exchangeId)) {
    return client;
  }
  
  return null;
}