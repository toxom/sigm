import axios from 'axios';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import CryptoJS from 'crypto-js';

ed.etc.sha512Sync = sha512;

interface BybitCredentials {
  apiKey: string;
  privateKey?: string; // For ED25519
  apiSecret?: string;  // For HMAC
  authType: 'ed25519' | 'hmac';
}

interface BybitBalance {
  coin: string;
  transferBalance: string;
  walletBalance: string;
  bonus: string;
}

interface BybitCoinInfo {
  coin: string;
  walletBalance: string;
  availableToWithdraw?: string;
  free?: string;
  [key: string]: any;
}

interface BybitWalletResponse {
  coin: BybitCoinInfo[];
  [key: string]: any;
}

interface BybitBalanceResponse {
  memberId: string;
  accountType: string;
  balance: BybitBalance[];
}

interface FormattedBalanceData {
  currency: string;
  balance: string;
  available: string;
  type: string;
}

export class BybitApiClient {
  private baseUrl: string;
  private credentials: BybitCredentials | null = null;

  constructor(useTestnet = false) {
    this.baseUrl = useTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  }
  
  /**
   * Initialize client with credentials from localStorage
   * @param exchangeId The exchange identifier (should be 'bybit')
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
  setCredentials(credentials: BybitCredentials): void {
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

  /**
   * Gets the current timestamp in milliseconds
   */
  private getTimestamp(): number {
    return Date.now();
  }

  /**
   * Creates a signature for Bybit API requests
   * Bybit uses a different signing approach than HTX
   */
  private async createSignature(timestamp: number, path: string, method: string, params: any = {}, body: any = {}): Promise<string> {
    if (!this.credentials) {
        throw new Error('No credentials loaded');
    }
    
    // For GET requests, use sorted query parameters
    let paramsString = '';
    if (method === 'GET' && Object.keys(params).length > 0) {
        paramsString = Object.keys(params)
            .sort()
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
    }
    
    // For POST requests, use the JSON stringified body
    let bodyString = '';
    if (method === 'POST' && Object.keys(body).length > 0) {
        bodyString = JSON.stringify(body);
    }
    
    // Bybit V5 signature format
    const signaturePayload = `${timestamp}${this.credentials.apiKey}5000${paramsString}${bodyString}`;
    console.log('DEBUG: Bybit signature payload:', signaturePayload);
    
    let signature: string;
    if (this.credentials.authType === 'ed25519') {
      // ED25519 signing
      const privateKeyBytes = hexToBytes(this.credentials.privateKey!);
      const messageBytes = new TextEncoder().encode(signaturePayload);
      const signatureBytes = await ed.sign(messageBytes, privateKeyBytes);
      signature = bytesToHex(signatureBytes);
    } else {
      // HMAC signing
      const hmacSignature = CryptoJS.HmacSHA256(signaturePayload, this.credentials.apiSecret!);
      signature = hmacSignature.toString(CryptoJS.enc.Hex);
    }
    
    console.log('DEBUG: Generated Bybit signature:', signature);
    return signature;
  }
  
  /**
   * Makes a GET request to Bybit API
   */
  async get(path: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.hasValidCredentials()) {
      console.error("DEBUG: Invalid or missing credentials for API call");
      throw new Error('Invalid or missing credentials');
    }
    
    const timestamp = this.getTimestamp();
    console.log(`DEBUG: Using timestamp: ${timestamp}`);
    
    console.log(`DEBUG: Creating signature for GET ${path} with params:`, params);
    const signature = await this.createSignature(timestamp, path, 'GET', params);
    
    try {
      console.log(`DEBUG: Making GET request to: ${this.baseUrl}${path}`);
      console.log(`DEBUG: Request params:`, params);
      
      const response = await axios.get(`${this.baseUrl}${path}`, {
        params: params,
        headers: {
          'X-BAPI-API-KEY': this.credentials!.apiKey,
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': '5000'
        }
      });
      
      console.log(`DEBUG: Bybit API response:`, response.data);
      
      // Bybit usually returns result in a nested 'result' object
      if (response.data.retCode === 0) {
        return response.data.result;
      } else {
        throw new Error(`Bybit API Error: ${response.data.retMsg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('DEBUG: Bybit API request failed:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unknown error occurred');
      }
    }
  }
  
  /**
   * Makes a POST request to Bybit API
   */
  async post(path: string, data: Record<string, any> = {}): Promise<any> {
    if (!this.hasValidCredentials()) {
      throw new Error('Invalid or missing credentials');
    }
    
    const timestamp = this.getTimestamp();
    
    // For POST requests, we include the JSON data in the signature
    const signature = await this.createSignature(timestamp, path, 'POST', {}, data);
    
    try {
      const response = await axios.post(`${this.baseUrl}${path}`, data, {
        headers: {
          'X-BAPI-API-KEY': this.credentials!.apiKey,
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.retCode === 0) {
        return response.data.result;
      } else {
        throw new Error(`Bybit API Error: ${response.data.retMsg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('DEBUG: Bybit API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Get wallet balance using V5 API
   */
  async getWalletBalance(accountType: string = 'UNIFIED'): Promise<any> {
    console.log(`DEBUG: Getting wallet balance for ${accountType}`);
    
    try {
      return this.get('/v5/account/wallet-balance', { accountType });
    } catch (err) {
      // Type guard for Error objects
      const error = err as Error;
      
      console.error(`Failed to get wallet balance for ${accountType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get Spot asset information
   */
  async getAssetInfo(coin?: string): Promise<any> {
    console.log("DEBUG: Getting asset info for coin:", coin || "all coins");
    try {
      const params: Record<string, string> = { accountType: 'UNIFIED' };
      if (coin) {
        params.coin = coin;
      }
      return this.get('/v5/asset/transfer/query-asset-info', params);
    } catch (err) {
      throw err;
    }
  }
  
  /**
   * Get account info to determine account type
   */
  async getAccountInfo(): Promise<any> {
    console.log("DEBUG: Getting account info to determine account type");
    return this.get('/v5/account/info', {});
  }
  
  /**
   * Get all coins balance across account types
   */
  async getAllCoinsBalance(accountType: string = 'UNIFIED', coin?: string): Promise<BybitBalanceResponse> {
    console.log(`DEBUG: Getting all coins balance for account type: ${accountType}, coin: ${coin || "all"}`);
    
    const params: Record<string, string> = { accountType }; // accountType is required
    if (coin) {
      params.coin = coin;
    }
    
    return this.get('/v5/asset/transfer/query-account-coins-balance', params);
  }
  
  /**
   * Wrapper to get balances in a similar format to the Huobi client
   * to make it easier to swap between clients
   */
  async getBalances(): Promise<any> {
    console.log("DEBUG: Starting getBalances call for Bybit");
    try {
      // Use UNIFIED account type as default since that's what Bybit now requires
      const accountType = 'UNIFIED';
      console.log(`DEBUG: Using account type: ${accountType}`);
      
      try {
        const balanceResponse = await this.getAllCoinsBalance(accountType);
        
        // Transform the response to a standardized format
        const formattedResponse = {
          status: 'ok',
          data: balanceResponse.balance.map((item: BybitBalance) => ({
            currency: item.coin,
            balance: item.walletBalance,
            available: item.transferBalance,
            type: 'spot'
          }))
        };
        
        return formattedResponse;
      } catch (err) {
        // If that fails, try wallet balance as a last resort
        console.log('Failed to get balance with UNIFIED account type, trying wallet balance');
        
        const walletBalance = await this.getWalletBalance('UNIFIED');
        
        // If wallet balance succeeded, return it in standardized format
        if (walletBalance && Array.isArray(walletBalance)) {
          const formattedData: FormattedBalanceData[] = [];
          
          walletBalance.forEach((account: BybitWalletResponse) => {
            if (account.coin && Array.isArray(account.coin)) {
              account.coin.forEach((coinInfo: BybitCoinInfo) => {
                formattedData.push({
                  currency: coinInfo.coin,
                  balance: coinInfo.walletBalance,
                  available: coinInfo.availableToWithdraw || coinInfo.free || coinInfo.walletBalance,
                  type: 'spot'
                });
              });
            }
          });
          
          return {
            status: 'ok',
            data: formattedData
          };
        }
        
        // If all else fails, return empty result
        return {
          status: 'ok',
          data: []
        };
      }
    } catch (err) {
      console.error("DEBUG: Error in getBalances:", err);
      
      // Return empty but valid response on error
      return {
        status: 'ok',
        data: []
      };
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binString);
}

// Factory function to create a Bybit client
export function createBybitClient(): BybitApiClient | null {
  const client = new BybitApiClient();
  
  if (client.loadCredentialsFromStorage('bybit')) {
    return client;
  }
  
  return null;
}