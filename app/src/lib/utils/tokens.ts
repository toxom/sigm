// lib/utils/tokens.ts

export interface TokenIconInfo {
    symbol: string;
    name?: string;
  }
  
  /**
   * Get token logo with multiple fallback sources
   * This function doesn't require predefined mappings and will try multiple
   * sources in sequence until one works
   */
  export function getTokenLogo(symbol: string): string[] {
    // Convert symbol to lowercase and trim for consistency
    const symbolLower = symbol.toLowerCase().trim();
    
    // Create an array of possible logo URLs from various sources
    return [
      // CryptoLogos.cc - specific format with hyphenated name
      `https://cryptologos.cc/logos/${symbolLower}-${symbolLower}-logo.svg?v=026`,
      // CryptoLogos.cc - alternative format some tokens use
      `https://cryptologos.cc/logos/${symbolLower}-logo.svg?v=026`,
      // CoinGecko style URL (doesn't work for all but useful as fallback)
      `https://assets.coingecko.com/coins/images/1/small/${symbolLower}.png`,
      // Coinicons API (if it exists)
      `https://coinicons-api.vercel.app/api/icon/${symbolLower}`,
      // GitHub crypto icons repository (if available)
      `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbolLower}.png`
    ];
  }
  
  /**
   * Generate an SVG as final fallback with the token initials
   */
  export function generateTokenSvg(symbol: string): string {
    // Convert symbol to uppercase for display
    const displaySymbol = symbol.toUpperCase();
    
    // Create a simple SVG with the first letter of the symbol as a fallback
    const firstChar = displaySymbol.charAt(0);
    const color = getColorForSymbol(symbol);
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='${color}' rx='100' ry='100'/%3E%3Ctext x='50%' y='50%' font-family='Arial, sans-serif' font-size='80' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'%3E${firstChar}%3C/text%3E%3C/svg%3E`;
  }
  
  /**
   * Generate a consistent color based on token symbol
   */
  function getColorForSymbol(symbol: string): string {
    // Popular cryptocurrency colors
    const knownColors: Record<string, string> = {
      'btc': '#F7931A', // Bitcoin
      'eth': '#627EEA', // Ethereum
      'usdt': '#26A17B', // Tether
      'xrp': '#23292F', // Ripple
      'sol': '#14F195', // Solana
      'ada': '#0033AD', // Cardano
      'doge': '#C3A634', // Dogecoin
      'dot': '#E6007A', // Polkadot
      'matic': '#8247E5', // Polygon
      'link': '#2A5ADA', // Chainlink
      'ltc': '#345D9D', // Litecoin
      'avax': '#E84142', // Avalanche
      'uni': '#FF007A', // Uniswap
      'bnb': '#F3BA2F'  // Binance Coin
    };
    
    const symbolLower = symbol.toLowerCase();
    
    // Return known color if available
    if (knownColors[symbolLower]) {
      return knownColors[symbolLower];
    }
    
    // Generate a color deterministically for unknown tokens
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  }