import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { Grant, GrantType } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

      text += `\n========== TAB: "${sheetName}" ==========\n`;
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
      text += `========== END TAB: "${sheetName}" ==========\n\n`;
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

const verifyExtractedGrants = async (
  originalText: string,
  extractedGrants: any[],
  logs: ParseLogEntry[]
): Promise<any[]> => {
  logs.push(createLog('info', 'verification', 'Verifying extracted grant data'));

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: originalText,
        isVerification: true,
        originalGrants: extractedGrants
      })
    });

    if (!response.ok) {
      throw new Error(`Edge Function returned ${response.status}: ${await response.text()}`);
    }

    const verificationResult = await response.json();

    logs.push(createLog('info', 'verification', 'Verification result received', {
      corrections: verificationResult.corrections,
      grantCount: verificationResult.grantCount,
      verified: verificationResult.verified
    }));

    if (verificationResult.corrections && verificationResult.corrections !== 'No corrections needed') {
      logs.push(createLog('warn', 'verification', `Corrections made: ${verificationResult.corrections}`));
    }

    return verificationResult.grants || extractedGrants;

  } catch (error) {
    logs.push(createLog('error', 'verification', 'Verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    return extractedGrants;
  }
};

const extractGrantData = async (
  text: string,
  logs: ParseLogEntry[],
  warnings: string[]
): Promise<ExtractedGrantData[]> => {
  logs.push(createLog('info', 'ai-extraction', 'Starting AI grant extraction'));

  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      logs.push(createLog('info', 'throttle', `Throttling: waiting ${Math.ceil(waitTime/1000)}s before making request`));
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();

    let parsedData;
    let lastError;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logs.push(createLog('info', 'ai-extraction', `Attempt ${attempt}/${maxRetries} to call Edge Function`));

        const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            isVerification: false
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Edge Function returned ${response.status}: ${errorText}`);
        }

        parsedData = await response.json();

        logs.push(createLog('info', 'ai-extraction', 'AI response received', {
          responseLength: JSON.stringify(parsedData).length,
          rawResponse: JSON.stringify(parsedData), // Include full AI response for debugging
        }));

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

    if (!parsedData) {
      throw lastError || new Error('Failed to get response from Edge Function after retries');
    }
    let grants = parsedData.grants || [];

    logs.push(createLog('info', 'ai-extraction', 'Parsed AI response', {
      grantCount: grants.length,
      grantsData: grants, // Log the actual grant objects
    }));

    if (grants.length === 0) {
      warnings.push('AI extraction found no grants in the document');
      logs.push(createLog('warn', 'ai-extraction', 'No grants found in document'));
    }

    // VERIFICATION PASS: Double-check the extracted data
    if (grants.length > 0) {
      logs.push(createLog('info', 'verification', 'Starting verification pass'));

      try {
        const verifiedGrants = await verifyExtractedGrants(text, grants, logs);
        grants = verifiedGrants;

        logs.push(createLog('info', 'verification', 'Verification complete', {
          originalCount: parsedData.grants?.length || 0,
          verifiedCount: grants.length
        }));
      } catch (verifyError) {
        logs.push(createLog('warn', 'verification', 'Verification failed, using original extraction', {
          error: verifyError instanceof Error ? verifyError.message : 'Unknown error'
        }));
      }
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

      // Enhanced validation warnings
      if (!extracted.grantDate) {
        warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): No grant date found - please verify manually`);
      }

      if (!extracted.totalShares || extracted.totalShares === 0) {
        warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): No shares found - please verify manually`);
      }

      if (extracted.grantDate) {
        const grantDate = new Date(extracted.grantDate);
        const today = new Date();
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(today.getFullYear() - 5);

        if (extracted.grantDate > today.toISOString().split('T')[0]) {
          warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Grant date is in the FUTURE (${extracted.grantDate}). This is likely a vesting date, not a grant date. Please correct this.`);
        }

        // Warn if grant is more than 10 years old (unusual but not impossible)
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(today.getFullYear() - 10);
        if (grantDate < tenYearsAgo) {
          warnings.push(`ℹ️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Grant date is more than 10 years old (${extracted.grantDate}). Verify this is correct.`);
        }
      }

      // Validate share counts are reasonable
      if (extracted.totalShares && extracted.totalShares > 1000000) {
        warnings.push(`ℹ️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Very large share count (${extracted.totalShares.toLocaleString()}). Verify this is the correct total.`);
      }

      if (extracted.totalShares && extracted.totalShares < 1) {
        warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Unusually small share count (${extracted.totalShares}). Verify this is correct.`);
      }

      // Check for missing company info
      if (!extracted.companyName && !extracted.ticker) {
        warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): No company name or ticker found. Check the document header/footer for this information.`);
      }

      // Validate grant type
      if (!extracted.type || !['ISO', 'NSO', 'RSU', 'ESPP'].includes(extracted.type)) {
        warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Invalid or missing grant type. Must be ISO, NSO, RSU, or ESPP.`);
      }

      // Validate months for options/RSUs
      if (extracted.type && ['ISO', 'NSO', 'RSU'].includes(extracted.type)) {
        if (!extracted.cliffMonths && !extracted.vestingMonths) {
          warnings.push(`ℹ️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): No vesting schedule months found. This may need to be added manually.`);
        }

        if (extracted.cliffMonths && (extracted.cliffMonths < 0 || extracted.cliffMonths > 48)) {
          warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Unusual cliff period (${extracted.cliffMonths} months). Common values are 12 or 0. Verify this is correct.`);
        }

        if (extracted.vestingMonths && (extracted.vestingMonths < 0 || extracted.vestingMonths > 120)) {
          warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Unusual vesting period (${extracted.vestingMonths} months). Common values are 48 or 16. Verify this is correct.`);
        }

        // Check if vestingMonths is less than cliffMonths (impossible)
        if (extracted.cliffMonths && extracted.vestingMonths && extracted.vestingMonths < extracted.cliffMonths) {
          warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Vesting months (${extracted.vestingMonths}) is LESS than cliff months (${extracted.cliffMonths}). This is impossible - vesting months should be the TOTAL period, not quarterly.`);
        }
      }

      // Validate strike price for options
      if (extracted.type && ['ISO', 'NSO'].includes(extracted.type) && !extracted.strikePrice) {
        warnings.push(`⚠️ Grant ${index + 1} (${extracted.externalGrantId || 'no ID'}): Stock option (${extracted.type}) is missing strike/exercise price. This is required for options.`);
      }

      return extracted;
    });

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logs.push(createLog('error', 'ai-extraction', 'AI extraction failed', {
      error: errorMsg,
      status: error?.status,
      type: error?.type
    }));

    // Provide specific error messages based on error type
    if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      throw new Error('Too many requests. Please wait 10-15 seconds before trying again.');
    } else if (error?.status === 401 || errorMsg.includes('401') || errorMsg.includes('authentication')) {
      throw new Error('Authentication failed. Please ensure you are logged in.');
    } else if (error?.status === 403 || errorMsg.includes('403')) {
      throw new Error('Access denied. Please check your permissions.');
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
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
