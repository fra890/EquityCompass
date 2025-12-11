import { StockPriceResponse } from "../types";

export const fetchStockPrice = async (ticker: string): Promise<StockPriceResponse> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-stock-price?ticker=${ticker}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Stock price API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      price: data.price,
      currency: data.currency || 'USD'
    };

  } catch (error) {
    console.error("Error fetching stock price:", error);
    throw error;
  }
};

export interface HistoricalPriceResponse {
  price: number;
  date: string;
  requestedDate: string;
  currency: string;
}

export const fetchHistoricalStockPrice = async (
  ticker: string,
  date: string
): Promise<HistoricalPriceResponse> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-stock-price?ticker=${ticker}&date=${date}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Stock price API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      price: data.price,
      date: data.date,
      requestedDate: data.requestedDate || date,
      currency: data.currency || 'USD',
    };

  } catch (error) {
    console.error("Error fetching historical stock price:", error);
    throw error;
  }
};

export const fetchHistoricalPricesForVestDates = async (
  ticker: string,
  vestDates: string[]
): Promise<Map<string, number>> => {
  const priceMap = new Map<string, number>();

  if (!ticker || vestDates.length === 0) {
    return priceMap;
  }

  const batchSize = 5;
  for (let i = 0; i < vestDates.length; i += batchSize) {
    const batch = vestDates.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(date => fetchHistoricalStockPrice(ticker, date))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        priceMap.set(batch[index], result.value.price);
      } else {
        console.warn(`Failed to fetch price for ${ticker} on ${batch[index]}:`, result.reason);
      }
    });

    if (i + batchSize < vestDates.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return priceMap;
};