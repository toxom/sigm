import type { RecordModel } from 'pocketbase'; 

export interface User {
  id: string;
  username?: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  created: string;
  updated: string;
  themePreference?: string;
  languagePreference?: string;
  residence?: string;
  timezone?: string;
  defaultCurrency?: string;
  tradingExperience?: string;
  riskTolerance?: string;
  notificationPreferences?: Record<string, boolean>;
  role: string;
  totpSecret?: string; 
  factorValidated?: boolean; 
  favoritePairs?: string[];
  favoriteTokens?: string[];

}


interface FinancialRecord {
    // Define the structure of a financial record
    date: Date;
    amount: number;
    description: string;
    type: 'income' | 'expense';
  }
  
  interface Preference {
    // Define the structure of a preference
    key: string;
    value: string | number | boolean;
  }
