import { StockPriceResponse } from "../types";

export const fetchStockPrice = async (ticker: string): Promise<StockPriceResponse> => {
  try {
    const upperTicker = ticker.toUpperCase();

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${upperTicker}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error("Invalid ticker or no data available");
    }

    const meta = result.meta;
    const price = meta?.regularMarketPrice || meta?.previousClose;

    if (!price) {
      throw new Error("Could not find price data");
    }

    return {
      price: parseFloat(price.toFixed(2)),
      currency: meta?.currency || 'USD'
    };

  } catch (error) {
    console.error("Error fetching stock price:", error);
    throw error;
  }
};