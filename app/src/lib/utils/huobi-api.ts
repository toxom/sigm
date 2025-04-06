// huobi-api.ts - API client for Huobi
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { decryptData } from './crypto';

interface HuobiCredentials {
  apiKey: string;
  secretKey: string;
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
  private credentials: HuobiCredentials;

  constructor(encryptedApiKey: string, encryptedSecretKey: string, useAwsEndpoint = false) {
    this.baseUrl = useAwsEndpoint ? 'https://api-aws.huobi.pro' : 'https://api.huobi.pro';
    this.credentials = {
      apiKey: decryptData(encryptedApiKey),
      secretKey: decryptData(encryptedSecretKey)
    };
  }

  private createSignature(method: string, endpoint: string, params: Record<string, string>): string {
    const timestamp = new Date().toISOString().replace(/\..+/, '');
    
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, string>);

    // Add required parameters for authentication
    const signParams = {
      ...sortedParams,
      AccessKeyId: this.credentials.apiKey,
      SignatureMethod: 'HmacSHA256',
      SignatureVersion: '2',
      Timestamp: timestamp
    };

    // Create parameter string
    const paramString = Object.keys(signParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(signParams[key])}`)
      .join('&');

    // Create signature base string
    const signatureBaseString = `${method}\n${new URL(this.baseUrl).host}\n${endpoint}\n${paramString}`;
    
    // Create signature
    const signature = CryptoJS.HmacSHA256(signatureBaseString, this.credentials.secretKey).toString(CryptoJS.enc.Base64);
    
    return signature;
  }

  /**
   * Gets deposit addresses for a specific cryptocurrency
   */
  async getDepositAddresses(currency: string): Promise<DepositAddress[]> {
    const endpoint = '/v2/account/deposit/address';
    const method = 'GET';
    const params: Record<string, string> = { currency };
    
    const signature = this.createSignature(method, endpoint, params);
    
    // Add signature to parameters
    const requestParams = {
      ...params,
      AccessKeyId: this.credentials.apiKey,
      SignatureMethod: 'HmacSHA256',
      SignatureVersion: '2',
      Timestamp: new Date().toISOString().replace(/\..+/, ''),
      Signature: signature
    };

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: requestParams
      });

      if (response.data.code === 200) {
        return response.data.data;
      } else {
        throw new Error(`API Error: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Huobi API request failed:', error);
      throw error;
    }
  }
}
