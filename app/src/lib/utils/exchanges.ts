// utils/exchanges.ts
export interface ExchangeInfo {
    id: string;
    name: string;
    logo: string;
    description: string;
  }
  
  export const EXCHANGES: ExchangeInfo[] = [
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
  
  export function getExchangeInfo(exchangeId: string): ExchangeInfo {
    const exchange = EXCHANGES.find(e => e.id === exchangeId);
    return exchange || {
      id: exchangeId,
      name: exchangeId.charAt(0).toUpperCase() + exchangeId.slice(1),
      logo: '', // Default or placeholder logo
      description: `Connect your ${exchangeId} account`
    };
  }