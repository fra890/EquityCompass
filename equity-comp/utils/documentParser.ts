import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import { Grant } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface ExtractedGrantData extends Partial<Grant> {
  cliffMonths?: number;
  vestingMonths?: number;
}

export const parseDocument = async (file: File): Promise<ExtractedGrantData[]> => {
  const fileType = file.type;
  let extractedText = '';

  if (fileType === 'application/pdf') {
    extractedText = await parsePDF(file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel') {
    extractedText = await parseExcel(file);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Excel file.');
  }

  return await extractGrantData(extractedText);
};

const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    text += pageText + '\n';
  }

  return text;
};

const parseExcel = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let text = '';

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    sheetData.forEach(row => {
      text += row.join(' | ') + '\n';
    });
  });

  return text;
};

const extractGrantData = async (text: string): Promise<ExtractedGrantData[]> => {
  const prompt = `
You are an expert in analyzing equity compensation documents. This document may contain one or more equity grants.
Extract ALL grants from the document and return them as a JSON object with a "grants" array.

For each grant, extract:
- grantType: "ISO", "NSO", "RSU", or "ESPP"
- shares: number of shares granted (numeric value only)
- strikePrice: strike/exercise price per share (numeric value only, primarily for ISOs/Options)
- grantDate: grant date (YYYY-MM-DD format)
- vestingStartDate: vesting start date (YYYY-MM-DD format)
- cliffMonths: cliff period in months (numeric value only)
- vestingMonths: total vesting period in months (numeric value only)
- companyName: name of the company issuing the grant
- ticker: stock ticker symbol if available

Return a JSON object with this structure:
{
  "grants": [
    {
      "grantType": "RSU",
      "shares": 210,
      "grantDate": "2017-04-10",
      "companyName": "Tesla",
      "ticker": "TSLA",
      "cliffMonths": 12,
      "vestingMonths": 48
    }
  ]
}

If any field is not found, omit it or set it to null. If only one grant is found, return an array with one item.

Document text:
${text}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert in analyzing equity compensation documents. Return only valid JSON with a grants array.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    response_format: { type: 'json_object' }
  });

  const responseText = completion.choices[0].message.content || '{"grants":[]}';

  try {
    const parsedData = JSON.parse(responseText);
    const grants = parsedData.grants || [];

    return grants.map((grant: any) => ({
      type: grant.grantType || undefined,
      totalShares: grant.shares ? Number(grant.shares) : undefined,
      strikePrice: grant.strikePrice ? Number(grant.strikePrice) : undefined,
      grantDate: grant.grantDate || undefined,
      companyName: grant.companyName || undefined,
      ticker: grant.ticker || undefined,
      cliffMonths: grant.cliffMonths ? Number(grant.cliffMonths) : undefined,
      vestingMonths: grant.vestingMonths ? Number(grant.vestingMonths) : undefined,
    }));
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw new Error('Failed to parse document data. Please check the document format.');
  }
};
