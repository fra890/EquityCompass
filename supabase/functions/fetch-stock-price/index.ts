import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get("ticker");
    const dateParam = url.searchParams.get("date");

    if (!ticker) {
      return new Response(
        JSON.stringify({ error: "Ticker symbol is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const upperTicker = ticker.toUpperCase();

    if (dateParam) {
      const targetDate = new Date(dateParam);
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 5);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 5);

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${upperTicker}?period1=${period1}&period2=${period2}&interval=1d`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
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

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      const targetTime = targetDate.getTime() / 1000;
      let closestIndex = 0;
      let closestDiff = Math.abs(timestamps[0] - targetTime);

      for (let i = 1; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - targetTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }

      const historicalPrice = closes[closestIndex];
      const actualDate = new Date(timestamps[closestIndex] * 1000).toISOString().split('T')[0];

      if (!historicalPrice) {
        throw new Error("Could not find historical price data");
      }

      return new Response(
        JSON.stringify({
          price: parseFloat(historicalPrice.toFixed(2)),
          date: actualDate,
          requestedDate: dateParam,
          currency: result.meta?.currency || "USD",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${upperTicker}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
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

    return new Response(
      JSON.stringify({
        price: parseFloat(price.toFixed(2)),
        currency: meta?.currency || "USD",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching stock price:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch stock price",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});