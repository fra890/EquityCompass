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