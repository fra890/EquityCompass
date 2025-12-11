import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import { Grant, GrantType } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000;

export interface ParseLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  step: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractedGrantData extends Partial<Grant> {
  cliffMonths?: number;
  vestingMonths?: number;
  externalGrantId?: string;
  esppDiscountPercent?: number;
  esppPurchasePrice?: number;
  esppOfferingStartDate?: string;
  esppOfferingEndDate?: string;
  esppFmvAtOfferingStart?: number;
  esppFmvAtPurchase?: number;
}

export interface ParseResult {
  grants: ExtractedGrantData[];
  logs: ParseLogEntry[];
  warnings: string[];
}

const createLog = (
  level: ParseLogEntry['level'],
  step: string,
  message: string,
  metadata?: Record<string, unknown>
): ParseLogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  step,
  message,
  metadata,
});

export const parseDocument = async (file: File): Promise<ParseResult> => {
  const logs: ParseLogEntry[] = [];
  const warnings: string[] = [];

  const fileMetadata = {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: new Date(file.lastModified).toISOString(),
  };

  logs.push(createLog('info', 'init', 'Starting document parse', fileMetadata));

  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  let extractedText = '';

  const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');
  const isExcel = fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  fileType === 'application/vnd.ms-excel' ||
                  fileName.endsWith('.xlsx') ||
                  fileName.endsWith('.xls') ||
                  fileName.endsWith('.csv');

  logs.push(createLog('info', 'file-detection', `Detected file type`, { isPdf, isExcel, mimeType: fileType }));

  try {
    if (isPdf) {
      logs.push(createLog('info', 'pdf-parse', 'Starting PDF extraction'));
      extractedText = await parsePDF(file, logs);
    } else if (isExcel) {
      logs.push(createLog('info', 'excel-parse', 'Starting Excel extraction'));
      extractedText = await parseExcel(file, logs);
    } else {
      const errorMsg = `Unsupported file type: ${fileType || 'unknown'}. Expected PDF or Excel.`;
      logs.push(createLog('error', 'file-detection', errorMsg, { fileType, fileName }));
      throw new Error(errorMsg);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      const warnMsg = 'Extracted text is very short or empty - file may be corrupted or contain only images';
      logs.push(createLog('warn', 'text-extraction', warnMsg, { textLength: extractedText?.length || 0 }));
      warnings.push(warnMsg);
    }

    logs.push(createLog('info', 'text-extraction', 'Text extraction complete', {
      textLength: extractedText.length,
      preview: extractedText.substring(0, 500),
      fullText: extractedText, // Include full text for debugging
    }));

    const grants = await extractGrantData(extractedText, logs, warnings);

    logs.push(createLog('info', 'complete', `Parse complete: found ${grants.length} grants`, {
      grantCount: grants.length,
      grantTypes: grants.map(g => g.type),
    }));

    return { grants, logs, warnings };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logs.push(createLog('error', 'parse-error', errorMessage, {
      stack: errorStack,
      fileMetadata,
    }));

    console.error('[DocumentParser] Parse failed:', {
      error: errorMessage,
      stack: errorStack,
      file: fileMetadata,
      logs,
    });

    throw new Error(`Failed to parse document: ${errorMessage}`);
  }
};

const parsePDF = async (file: File, logs: ParseLogEntry[]): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    logs.push(createLog('info', 'pdf-parse', 'ArrayBuffer created', { byteLength: arrayBuffer.byteLength }));

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    const pdf = await loadingTask.promise;
    logs.push(createLog('info', 'pdf-parse', 'PDF document loaded', { numPages: pdf.numPages }));

    let text = '';
    let emptyPages = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();

        if (pageText.length === 0) {
          emptyPages++;
          logs.push(createLog('warn', 'pdf-parse', `Page ${i} has no extractable text (may be scanned/image)`));
        }

        text += pageText + '\n';
      } catch (pageError) {
        logs.push(createLog('error', 'pdf-parse', `Failed to extract page ${i}`, {
          error: pageError instanceof Error ? pageError.message : 'Unknown',
        }));
      }
    }

    if (emptyPages === pdf.numPages) {
      logs.push(createLog('warn', 'pdf-parse', 'All pages appear to be images/scanned - OCR may be needed'));
    }

    return text;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown PDF error';

    if (errorMsg.includes('Invalid PDF') || errorMsg.includes('not recognized')) {
      logs.push(createLog('error', 'pdf-parse', 'PDF file appears to be corrupted or invalid', { originalError: errorMsg }));
      throw new Error('The PDF file could not be read. It may be corrupted, password-protected, or in an unsupported format.');
    }

    logs.push(createLog('error', 'pdf-parse', 'PDF parsing failed', { error: errorMsg }));
    throw error;
  }
};

const parseExcel = async (file: File, logs: ParseLogEntry[]): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    logs.push(createLog('info', 'excel-parse', 'ArrayBuffer created', { byteLength: arrayBuffer.byteLength }));

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: true,
      raw: false,
    });

    logs.push(createLog('info', 'excel-parse', 'Workbook loaded', {
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
    }));

    let text = '';
    let totalRows = 0;

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const sheet = workbook.Sheets[sheetName];

      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const rowCount = range.e.r - range.s.r + 1;
      const colCount = range.e.c - range.s.c + 1;

      logs.push(createLog('info', 'excel-parse', `Processing sheet: ${sheetName}`, {
        sheetIndex,
        rowCount,
        colCount,
      }));

      const sheetData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false, // Changed from rawNumbers: false to convert dates properly
        dateNF: 'yyyy-mm-dd',
      }) as any[][];

      totalRows += sheetData.length;

      text += `--- Sheet: ${sheetName} ---\n`;
      sheetData.forEach((row, rowIndex) => {
        const cleanRow = row.map((cell, colIndex) => {
          if (cell === null || cell === undefined) return '';

          // Check if the raw cell is a date
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const rawCell = sheet[cellAddress];

          if (rawCell && rawCell.t === 'd' && rawCell.v instanceof Date) {
            // Format date as YYYY-MM-DD
            const date = rawCell.v;
            return date.toISOString().split('T')[0];
          }

          // Try to parse dates from strings
          if (typeof cell === 'string' && cell.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
            try {
              const parsed = new Date(cell);
              if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
              }
            } catch {}
          }

          if (cell instanceof Date) {
            return cell.toISOString().split('T')[0];
          }

          return String(cell).trim();
        });
        text += cleanRow.join(' | ') + '\n';
      });
      text += '\n';
    });

    logs.push(createLog('info', 'excel-parse', 'Excel extraction complete', { totalRows }));

    return text;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown Excel error';

    if (errorMsg.includes('File is password') || errorMsg.includes('Encrypted')) {
      logs.push(createLog('error', 'excel-parse', 'Excel file is password protected'));
      throw new Error('The Excel file is password protected and cannot be read.');
    }

    if (errorMsg.includes('not a valid') || errorMsg.includes('Corrupted')) {
      logs.push(createLog('error', 'excel-parse', 'Excel file appears corrupted', { originalError: errorMsg }));
      throw new Error('The Excel file could not be read. It may be corrupted or in an unsupported format.');
    }

    logs.push(createLog('error', 'excel-parse', 'Excel parsing failed', { error: errorMsg }));
    throw error;
  }
};

const extractGrantData = async (
  text: string,
  logs: ParseLogEntry[],
  warnings: string[]
): Promise<ExtractedGrantData[]> => {
  logs.push(createLog('info', 'ai-extraction', 'Starting AI grant extraction'));

  const prompt = `
You are an expert in analyzing equity compensation documents. This document may contain one or more equity grants.

STEP 1: FIRST, carefully count how many DISTINCT grants are in this document. Look for:
- Separate grant agreements or award letters
- Different Award IDs, Grant IDs, or Plan Numbers
- Different grant dates for the same equity type
- Different companies or tickers

STEP 2: Extract ALL grants you counted. DO NOT skip any grants. If you counted 11 grants, you MUST return 11 grants.

CRITICAL: ALWAYS look for and extract the company name and stock ticker symbol. These are often:
- In the header/footer of the document
- In logos or letterheads
- Near phrases like "stock option", "equity award", "grant agreement"
- In company addresses or legal names
Common examples: "Apple Inc." (ticker: AAPL), "Microsoft Corporation" (ticker: MSFT), "Alphabet Inc." (ticker: GOOGL)

IMPORTANT DISTINCTIONS:
- "grantDate" is the date the equity award was GRANTED/AWARDED to the employee (the original award date)
- "vestDate" or vesting schedule dates are when shares VEST (become available) - these are NOT the grant date
- If you see a table with multiple vesting dates and share amounts FOR THE SAME GRANT ID, these represent ONE grant with a vesting schedule
- The TOTAL shares is the sum of all shares in the vesting schedule, NOT each row
- If you see DIFFERENT Grant IDs or Award Numbers, these are SEPARATE grants even if they vest on similar dates

For documents with vesting schedules (tables showing Date | Shares | Price):
- Sum ALL the shares in the table to get "shares" (total shares granted) ONLY if they belong to the same grant ID
- If each row has a different grant ID or award number, treat each row as a SEPARATE grant
- The grant date is typically mentioned separately, NOT in the vesting table
- If only a vesting schedule is shown without a separate grant date, look for the earliest date mentioned in context BEFORE the vesting table, or note grantDate as null

For each grant, extract these fields (if available):
- companyName: CRITICAL - name of the company issuing the grant (look in headers, logos, legal text)
- ticker: CRITICAL - stock ticker symbol (usually 1-5 capital letters, often in parentheses after company name)
- grantId: External grant ID, award number, or plan ID (string, for tracking/deduplication)
- grantType: "ISO", "NSO", "RSU", or "ESPP"
- shares: TOTAL number of shares in the grant (sum of all vesting tranches, numeric value only)
- strikePrice: strike/exercise price per share (numeric, for ISOs/NSOs)
- grantDate: the date the grant was AWARDED (NOT vest dates) in YYYY-MM-DD format
- cliffMonths: cliff period in months (numeric value only)
- vestingMonths: total vesting period in months (numeric value only)

For ESPP grants specifically, also extract:
- esppDiscountPercent: discount percentage (typically 15)
- esppPurchasePrice: actual purchase price per share after discount
- esppOfferingStartDate: start of offering period (YYYY-MM-DD)
- esppOfferingEndDate: end of offering/purchase date (YYYY-MM-DD)
- esppFmvAtOfferingStart: FMV at start of offering period
- esppFmvAtPurchase: FMV at time of purchase

EXAMPLE 1 - Single Grant with Vesting Schedule:
If document shows:
"Acme Corporation (ACME)
Award ID: RSU-12345
Award Date: April 10, 2017
Vesting Schedule:
4/10/2018 - 53 shares
7/10/2018 - 53 shares
10/10/2018 - 53 shares
1/10/2019 - 52 shares"

Return:
{
  "grants": [{
    "companyName": "Acme Corporation",
    "ticker": "ACME",
    "grantId": "RSU-12345",
    "grantType": "RSU",
    "shares": 211,
    "grantDate": "2017-04-10",
    "cliffMonths": 12,
    "vestingMonths": 48
  }]
}

EXAMPLE 2 - Multiple Separate Grants:
If document shows:
"Grant ID: RSU-001, Date: 2020-01-15, Shares: 100
Grant ID: RSU-002, Date: 2020-06-15, Shares: 150
Grant ID: RSU-003, Date: 2021-01-15, Shares: 200"

Return:
{
  "grants": [
    {"grantId": "RSU-001", "grantType": "RSU", "shares": 100, "grantDate": "2020-01-15"},
    {"grantId": "RSU-002", "grantType": "RSU", "shares": 150, "grantDate": "2020-06-15"},
    {"grantId": "RSU-003", "grantType": "RSU", "shares": 200, "grantDate": "2021-01-15"}
  ]
}

Return a JSON object with this structure:
{
  "grants": [...]
}

If any field is not found, omit it or set it to null. If only one grant is found, return an array with one item.

Document text:
${text}
`;

  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      logs.push(createLog('info', 'throttle', `Throttling: waiting ${Math.ceil(waitTime/1000)}s before making request`));
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();

    let completion;
    let lastError;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logs.push(createLog('info', 'ai-extraction', `Attempt ${attempt}/${maxRetries} to call OpenAI API`));

        completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert in analyzing equity compensation documents. Return only valid JSON with a grants array.

CRITICAL RULES:
1. COMPLETENESS IS PARAMOUNT: Extract EVERY SINGLE grant in the document. Count them first, then extract all of them. Missing grants is unacceptable.
2. Company Name & Ticker: ALWAYS extract the company name and ticker symbol. Look in headers, footers, logos, letterheads, and throughout the document. This is MANDATORY.
3. Grant Date vs Vest Date: The grantDate is when the award was GIVEN, NOT when shares vest. Vesting dates are typically 1-4 years AFTER the grant date.
4. Total Shares: If you see a vesting schedule table FOR THE SAME GRANT ID, SUM all the shares to get the total. Do NOT return each row as a separate grant UNLESS each row has a different Grant ID.
5. One grant per award ID: Multiple vesting dates for the same award ID = ONE grant with multiple vesting tranches. Different award IDs = different grants.
6. Date format: Always use YYYY-MM-DD format for dates.
7. Be thorough in extracting grant IDs, award numbers, and ESPP-specific fields.
8. ACCURACY: Extract exact numbers and dates as they appear. Do not approximate or round.`,
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          response_format: { type: 'json_object' }
        });

        // Success - break out of retry loop
        break;

      } catch (apiError: any) {
        lastError = apiError;

        // Check if it's a rate limit error
        if (apiError?.status === 429 || apiError?.message?.includes('429')) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          logs.push(createLog('warn', 'ai-extraction', `Rate limit hit. Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}`, {
            status: apiError.status,
            message: apiError.message
          }));

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          // For other errors, don't retry
          throw apiError;
        }
      }
    }

    if (!completion) {
      throw lastError || new Error('Failed to get completion from OpenAI after retries');
    }

    const responseText = completion.choices[0].message.content || '{"grants":[]}';

    logs.push(createLog('info', 'ai-extraction', 'AI response received', {
      responseLength: responseText.length,
      tokensUsed: completion.usage?.total_tokens,
      rawResponse: responseText, // Include full AI response for debugging
    }));

    const parsedData = JSON.parse(responseText);
    const grants = parsedData.grants || [];

    logs.push(createLog('info', 'ai-extraction', 'Parsed AI response', {
      grantCount: grants.length,
      grantsData: grants, // Log the actual grant objects
    }));

    if (grants.length === 0) {
      warnings.push('AI extraction found no grants in the document');
      logs.push(createLog('warn', 'ai-extraction', 'No grants found in document'));
    }

    // Verification pass: Check if we might have missed grants
    const possibleGrantIndicators = [
      /grant\s*(?:id|number|#)[\s:]*[\w\-]+/gi,
      /award\s*(?:id|number|#)[\s:]*[\w\-]+/gi,
      /plan\s*(?:id|number|#)[\s:]*[\w\-]+/gi,
    ];

    let estimatedGrantCount = 0;
    possibleGrantIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        estimatedGrantCount = Math.max(estimatedGrantCount, matches.length);
      }
    });

    if (estimatedGrantCount > grants.length && estimatedGrantCount <= 20) {
      const warning = `Document appears to contain approximately ${estimatedGrantCount} grants, but only ${grants.length} were extracted. Please verify the document manually.`;
      warnings.push(warning);
      logs.push(createLog('warn', 'ai-extraction', warning, {
        estimatedCount: estimatedGrantCount,
        extractedCount: grants.length
      }));
    }

    return grants.map((grant: any, index: number) => {
      const extracted: ExtractedGrantData = {
        type: normalizeGrantType(grant.grantType),
        totalShares: grant.shares ? Number(grant.shares) : undefined,
        strikePrice: grant.strikePrice ? Number(grant.strikePrice) : undefined,
        grantDate: grant.grantDate || undefined,
        companyName: grant.companyName || undefined,
        ticker: grant.ticker || undefined,
        cliffMonths: grant.cliffMonths ? Number(grant.cliffMonths) : undefined,
        vestingMonths: grant.vestingMonths ? Number(grant.vestingMonths) : undefined,
        externalGrantId: grant.grantId || undefined,
        esppDiscountPercent: grant.esppDiscountPercent ? Number(grant.esppDiscountPercent) : undefined,
        esppPurchasePrice: grant.esppPurchasePrice ? Number(grant.esppPurchasePrice) : undefined,
        esppOfferingStartDate: grant.esppOfferingStartDate || undefined,
        esppOfferingEndDate: grant.esppOfferingEndDate || undefined,
        esppFmvAtOfferingStart: grant.esppFmvAtOfferingStart ? Number(grant.esppFmvAtOfferingStart) : undefined,
        esppFmvAtPurchase: grant.esppFmvAtPurchase ? Number(grant.esppFmvAtPurchase) : undefined,
      };

      logs.push(createLog('info', 'ai-extraction', `Extracted grant ${index + 1}`, {
        type: extracted.type,
        shares: extracted.totalShares,
        grantDate: extracted.grantDate,
        grantId: extracted.externalGrantId,
        strikePrice: extracted.strikePrice,
        company: extracted.companyName,
        ticker: extracted.ticker,
      }));

      // Validation warnings
      if (!extracted.grantDate) {
        warnings.push(`Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): No grant date found - please verify`);
      }

      if (!extracted.totalShares || extracted.totalShares === 0) {
        warnings.push(`Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): No shares found - please verify`);
      }

      if (extracted.grantDate && extracted.grantDate > new Date().toISOString().split('T')[0]) {
        warnings.push(`Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Grant date is in the future (${extracted.grantDate}) - this may be a vesting date instead of the grant date`);
      }

      return extracted;
    });

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown AI error';
    logs.push(createLog('error', 'ai-extraction', 'AI extraction failed', {
      error: errorMsg,
      status: error?.status,
      type: error?.type
    }));

    // Provide specific error messages based on error type
    if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      throw new Error('Too many requests. Please wait 10-15 seconds before trying again. (OpenAI enforces rate limits to prevent abuse)');
    } else if (error?.status === 401 || errorMsg.includes('401') || errorMsg.includes('authentication')) {
      throw new Error('OpenAI API authentication failed. Please check your API key in the .env file.');
    } else if (error?.status === 403 || errorMsg.includes('403')) {
      throw new Error('OpenAI API access denied. Your API key may not have access to GPT-4o. Check your API plan at platform.openai.com/account/billing');
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      throw new Error('Network error while contacting OpenAI API. Please check your internet connection and try again.');
    } else {
      throw new Error(`Failed to extract grant data: ${errorMsg}`);
    }
  }
};

const normalizeGrantType = (type: string | undefined): GrantType | undefined => {
  if (!type) return undefined;

  const normalized = type.toUpperCase().trim();

  switch (normalized) {
    case 'RSU':
    case 'RESTRICTED STOCK UNIT':
    case 'RESTRICTED STOCK UNITS':
      return 'RSU';
    case 'ISO':
    case 'INCENTIVE STOCK OPTION':
    case 'INCENTIVE STOCK OPTIONS':
      return 'ISO';
    case 'NSO':
    case 'NQSO':
    case 'NON-QUALIFIED STOCK OPTION':
    case 'NON QUALIFIED STOCK OPTION':
      return 'NSO';
    case 'ESPP':
    case 'EMPLOYEE STOCK PURCHASE PLAN':
      return 'ESPP';
    default:
      return 'RSU';
  }
};

export const logParseResult = (result: ParseResult): void => {
  console.group('[DocumentParser] Parse Result');
  console.log('Grants found:', result.grants.length);

  if (result.grants.length > 0) {
    console.group('📊 Extracted Grants');
    result.grants.forEach((grant, i) => {
      console.group(`Grant ${i + 1}: ${grant.companyName || 'Unknown'} (${grant.type || 'Unknown'})`);
      console.log('External ID:', grant.externalGrantId || 'None');
      console.log('Total Shares:', grant.totalShares || 'Missing');
      console.log('Grant Date:', grant.grantDate || 'Missing');
      console.log('Strike Price:', grant.strikePrice || 'N/A');
      console.log('Ticker:', grant.ticker || 'N/A');
      console.log('Vesting:', `${grant.cliffMonths || 0}mo cliff, ${grant.vestingMonths || 0}mo total`);
      if (grant.esppDiscountPercent) {
        console.log('ESPP Discount:', `${grant.esppDiscountPercent}%`);
        console.log('ESPP Purchase Price:', grant.esppPurchasePrice);
        console.log('ESPP Offering Start:', grant.esppOfferingStartDate);
        console.log('ESPP Offering End:', grant.esppOfferingEndDate);
      }
      console.groupEnd();
    });
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ Warnings');
    result.warnings.forEach(w => console.warn(w));
    console.groupEnd();
  }

  console.group('📋 Detailed Logs');
  console.table(result.logs.map(l => ({
    time: l.timestamp.split('T')[1]?.substring(0, 12),
    level: l.level,
    step: l.step,
    message: l.message,
  })));

  // Log extracted text
  const textLog = result.logs.find(l => l.step === 'text-extraction' && l.metadata?.fullText);
  if (textLog?.metadata?.fullText) {
    console.group('📄 Extracted Text from Document');
    console.log(textLog.metadata.fullText);
    console.groupEnd();
  }

  // Log AI response
  const aiLog = result.logs.find(l => l.step === 'ai-extraction' && l.metadata?.rawResponse);
  if (aiLog?.metadata?.rawResponse) {
    console.group('🤖 AI Raw Response');
    console.log(aiLog.metadata.rawResponse);
    console.groupEnd();
  }

  console.groupEnd();
  console.groupEnd();
};
