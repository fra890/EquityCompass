import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, isVerification, originalGrants } = await req.json();

    if (!text) {
      throw new Error("Missing required field: text");
    }

    let completion;

    if (isVerification) {
      // Verification pass
      const verificationPrompt = `
You are verifying equity grant data that was extracted from a document. Your job is to CHECK and CORRECT the extracted data.

ORIGINAL DOCUMENT TEXT:
${text}

EXTRACTED GRANTS:
${JSON.stringify(originalGrants, null, 2)}

VERIFICATION TASKS:
1. For EACH grant, verify these critical fields are ACCURATE:
   - grantDate: Is this the date the equity was AWARDED/GRANTED (not a vesting date)?
   - shares: Is this the TOTAL shares for the grant (sum of all vesting tranches if applicable)?
   - grantId: Is this correctly extracted?
   - companyName and ticker: Are these present and correct?
   - grantType: Is this correctly identified as ISO, NSO, RSU, or ESPP?
     * "Incentive Stock Option" = ISO (NOT NSO, NOT RSU)
     * "Non-Qualified Stock Option" = NSO
     * "Restricted Stock Unit" = RSU
   - cliffMonths: Calculate months from grant date to FIRST vest date (commonly 12)
   - vestingMonths: Calculate months from grant date to FINAL/LAST vest date (commonly 48)

2. MULTI-TAB DOCUMENTS:
   If the document has multiple tabs/sections (Unvested, Exercisable, Sellable, Vested):
   - ✅ Same Grant ID across tabs should be MERGED into ONE grant
   - ✅ Prioritize "Unvested" tab for share counts
   - ✅ Enrich with strike price, grant date from other tabs if missing
   - ❌ Do NOT create duplicate grants for same Grant ID in different tabs

3. Check for COMMON MISTAKES:
   - ❌ Grant date is actually a vest date (vest dates are typically 1-4 years AFTER grant date)
   - ❌ Shares count is from one vesting tranche instead of the TOTAL
   - ❌ Missing company name or ticker that IS present in the document
   - ❌ Duplicate grants that should be one grant with multiple vesting dates
   - ❌ Duplicate grants from same Grant ID appearing in multiple tabs
   - ❌ Missed grants that are in the document (especially in "Unvested" tab)
   - ❌ ISO misidentified as RSU or NSO (check for "Incentive" keyword)
   - ❌ cliffMonths not calculated (should be months to first vest)
   - ❌ vestingMonths calculated to first vest instead of last vest
   - ❌ Missing strike price for ISOs/NSOs that appears in other tabs

4. If you find ANY errors, return the CORRECTED grants array.

5. Count total unique grants in the original document and verify the count matches extracted grants.

Return JSON with this structure:
{
  "verified": true,
  "corrections": "Brief description of any corrections made, or 'No corrections needed'",
  "grantCount": <number of unique grants found>,
  "grants": [<corrected grants array>]
}

If the original extraction is perfect, return it unchanged with "corrections": "No corrections needed".
`;

      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert verification assistant. Your job is to carefully check extracted equity grant data for accuracy. Be thorough and precise.",
          },
          { role: "user", content: verificationPrompt },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });
    } else {
      // Initial extraction
      const extractionPrompt = `
You are an expert in analyzing equity compensation documents. This document may contain one or more equity grants.

STEP 1: FIRST, carefully count how many DISTINCT grants are in this document. Look for:
- Separate grant agreements or award letters
- Different Award IDs, Grant IDs, or Plan Numbers
- Different grant dates for the same equity type
- Different companies or tickers

MULTI-TAB DOCUMENTS: If this document has multiple tabs/sections (e.g., "Unvested", "Exercisable", "Sellable"):
- The SAME Grant ID appearing across multiple tabs is the SAME grant - count it ONCE
- Focus on "Unvested" tab for RSUs and future vesting
- Use Grant IDs to correlate and merge data across tabs

COUNT CAREFULLY. Write down the count before proceeding.

STEP 2: Extract ALL grants you counted. DO NOT skip any grants. If you counted 11 grants, you MUST return 11 grants.

STEP 3: For EACH grant, VERIFY:
- Grant Date: Double-check this is the AWARD/GRANT date, NOT a vesting date. Look for phrases like "Award Date", "Grant Date", "Date of Grant". Vesting dates are typically shown in tables LATER in the document.
- Total Shares: Double-check you summed ALL vesting tranches if this is a single grant with multiple vest dates. Look at the ENTIRE vesting schedule.
- Grant ID: Verify you captured the correct identifier.
- Grant Type: CRITICAL - Look for keywords:
  * ISO = "Incentive Stock Option", "ISO", "Incentive Option"
  * NSO = "Non-Qualified Stock Option", "NSO", "NQSO", "Non-Statutory"
  * RSU = "Restricted Stock Unit", "RSU"
  * ESPP = "Employee Stock Purchase Plan", "ESPP"
- Vesting Schedule Months: CALCULATE THE MONTHS CAREFULLY:
  * cliffMonths = months from GRANT DATE to FIRST VEST DATE (commonly 12 months)
  * vestingMonths = TOTAL months from GRANT DATE to FINAL VEST DATE (commonly 48 months)
  * Count the months between dates precisely

CRITICAL: ALWAYS look for and extract the company name and stock ticker symbol. These are often:
- In the header/footer of the document
- In logos or letterheads
- Near phrases like "stock option", "equity award", "grant agreement"
- In company addresses or legal names
Common examples: "Apple Inc." (ticker: AAPL), "Microsoft Corporation" (ticker: MSFT), "Alphabet Inc." (ticker: GOOGL)

For each grant, extract these fields (if available):
- companyName: CRITICAL - name of the company issuing the grant (look in headers, logos, legal text)
- ticker: CRITICAL - stock ticker symbol (usually 1-5 capital letters, often in parentheses after company name)
- grantId: External grant ID, award number, or plan ID (string, for tracking/deduplication)
- grantType: CRITICAL - Must be EXACTLY one of: "ISO", "NSO", "RSU", or "ESPP"
- shares: TOTAL number of shares in the grant (sum of all vesting tranches, numeric value only)
- strikePrice: strike/exercise price per share (numeric, for ISOs/NSOs only)
- grantDate: the date the grant was AWARDED (NOT vest dates) in YYYY-MM-DD format
- cliffMonths: CALCULATE months between grantDate and first vest date (numeric, commonly 12)
- vestingMonths: CALCULATE total months from grantDate to last vest date (numeric, commonly 48)

For ESPP grants specifically, also extract:
- esppDiscountPercent: discount percentage (typically 15)
- esppPurchasePrice: actual purchase price per share after discount
- esppOfferingStartDate: start of offering period (YYYY-MM-DD)
- esppOfferingEndDate: end of offering/purchase date (YYYY-MM-DD)
- esppFmvAtOfferingStart: FMV at start of offering period
- esppFmvAtPurchase: FMV at time of purchase

Return a JSON object with this structure:
{
  "grants": [...]
}

If any field is not found, omit it or set it to null. If only one grant is found, return an array with one item.

Document text:
${text}
`;

      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert in analyzing equity compensation documents. Return only valid JSON with a grants array.",
          },
          { role: "user", content: extractionPrompt },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });
    }

    const responseText = completion.choices[0].message.content || "{}";
    const parsedData = JSON.parse(responseText);

    return new Response(JSON.stringify(parsedData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in parse-document function:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
