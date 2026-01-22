export type GrantType = 'RSU' | 'ISO' | 'ESPP' | 'NSO';

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

export interface StockSale {
  id: string;
  grantId: string;
  saleDate: string;
  sharesSold: number;
  salePrice: number;
  totalProceeds: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface CustomVestingDate {
  date: string;
  shares: number;
}

export interface Grant {
  id: string;
  type: GrantType;
  ticker: string;
  companyName: string;
  currentPrice: number;
  grantPrice?: number;
  strikePrice?: number;
  grantDate: string;
  totalShares: number;
  vestingSchedule: 'standard_4y_1y_cliff' | 'standard_4y_quarterly' | 'immediate' | 'custom';
  customVestingDates?: CustomVestingDate[];
  withholdingRate?: number;

  customHeldShares?: number;
  averageCostBasis?: number;

  externalGrantId?: string;

  esppDiscountPercent?: number;
  esppPurchasePrice?: number;
  esppOfferingStartDate?: string;
  esppOfferingEndDate?: string;
  esppFmvAtOfferingStart?: number;
  esppFmvAtPurchase?: number;

  planNotes?: string;
  sales: StockSale[];
  vestingPrices: VestingPrice[];

  lastUpdated: string;
}

export interface VestingPrice {
  id: string;
  grantId: string;
  vestDate: string;
  priceAtVest: number;
  sharesVested: number;
  source: 'api' | 'manual' | 'document';
}

export interface AdvisorProfile {
  id: string;
  userId: string;
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
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
  grantId: string;
  grantType: GrantType;
  ticker: string;
  companyName: string;
  externalGrantId?: string;
  date: string;
  shares: number;
  priceAtVest: number;
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