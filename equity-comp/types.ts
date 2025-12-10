export type GrantType = 'RSU' | 'ISO';

export interface PlannedExercise {
  id: string;
  grantId: string;
  grantTicker: string;
  shares: number;
  exerciseDate: string; // YYYY-MM-DD
  exercisePrice: number; // Strike
  fmvAtExercise: number;
  type: 'ISO'; 
  amtExposure: number;
  estimatedCost: number;
}

export interface Grant {
  id: string;
  type: GrantType;
  ticker: string; // Empty if private
  companyName: string;
  currentPrice: number; // FMV
  grantPrice?: number; // FMV at time of Grant (Historical)
  strikePrice?: number; // Only for ISO/Options
  grantDate: string; // ISO date string YYYY-MM-DD
  totalShares: number;
  vestingSchedule: 'standard_4y_1y_cliff' | 'standard_4y_quarterly'; 
  withholdingRate?: number; // User elected withholding % (e.g., 22 or 37)
  
  // New Fields for Manual Overrides
  customHeldShares?: number; // User override for "How many shares out of the grant holding"
  averageCostBasis?: number; // User override for cost basis of those held shares

  lastUpdated: string;
}

export interface Client {
  id: string;
  name: string;
  state: string; // e.g., 'CA', 'NY', 'TX'
  filingStatus: 'single' | 'married_joint'; // For AMT calcs
  taxBracket: number; // Federal Ordinary Income Bracket (e.g. 37)
  estimatedIncome?: number; // Optional: Annual income for accurate AMT headroom calc
  customStateTaxRate?: number; // Optional override for state tax %
  customLtcgTaxRate?: number; // Optional override for LTCG %
  customAmtSafeHarbor?: number; // Optional override for total AMT spread capacity
  grants: Grant[];
  plannedExercises: PlannedExercise[];
}

export interface VestingEvent {
  grantType: GrantType;
  date: string;
  shares: number;
  grossValue: number; 
  withholdingAmount: number; 
  electedWithholdingRate: number; 
  netShares: number;
  netValue: number; 
  sharesSoldToCover: number;
  taxGap: number;
  amtExposure: number; 
  taxBreakdown: {
    fed: number;
    state: number;
    niit: number;
    totalLiability: number;
  };
  isPast: boolean;
}

// Extends VestingEvent to include Client Context for the Central Hub
export interface AggregatedVestingEvent extends VestingEvent {
  clientId: string;
  clientName: string;
  grantTicker: string;
  companyName: string;
}

export interface TaxBreakdown {
  fedRate: number;
  fedAmount: number;
  niitRate: number;
  niitAmount: number;
  stateRate: number;
  stateAmount: number;
  totalTax: number;
}

export interface ISOScenario {
  name: string;
  description: string;
  exerciseDate: string;
  saleDate: string;
  shares: number;
  fmvAtExercise: number;
  salePrice: number;
  ordinaryIncome: number;
  capitalGain: number;
  amtPreference: number;
  taxes: TaxBreakdown;
  netProfit: number;
}

export interface StockPriceResponse {
  price: number;
  currency: string;
  sourceUrl?: string;
}