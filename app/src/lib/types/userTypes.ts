import type { RecordModel } from 'pocketbase'; 

export interface User {
  id: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  username?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  residence?: string;
  themePreference?: string;
  languagePreference?: string;
  currencyPreference?: string;
  timezonePreference?: string;
  notificationsPreference?: string;
  factorValidated?: boolean; 
  kycValidated?: boolean; 
  created: string;
  updated: string;
  totpSecret?: string; 
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
