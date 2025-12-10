import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Grant } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface ExtractedGrantData extends Partial<Grant> {
  cliffMonths?: number;
  vestingMonths?: number;
}

export const parseDocument = async (file: File): Promise<ExtractedGrantData> => {
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

const extractGrantData = async (text: string): Promise<ExtractedGrantData> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are an expert in analyzing equity compensation documents. Extract the following information from the provided text and return it as a JSON object. If any field is not found, set it to null.

Fields to extract:
- grantType: "ISO", "NSO", "RSU", or "ESPP"
- shares: number of shares granted (numeric value only)
- strikePrice: strike/exercise price per share (numeric value only)
- grantDate: grant date (YYYY-MM-DD format)
- vestingStartDate: vesting start date (YYYY-MM-DD format)
- cliffMonths: cliff period in months (numeric value only)
- vestingMonths: total vesting period in months (numeric value only)
- companyName: name of the company issuing the grant
- ticker: stock ticker symbol if available

Return ONLY a valid JSON object with these exact field names. Do not include any markdown formatting or additional text.

Document text:
${text}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  let cleanedText = responseText.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/```\n?/g, '');
  }

  try {
    const parsedData = JSON.parse(cleanedText);

    return {
      type: parsedData.grantType || undefined,
      totalShares: parsedData.shares ? Number(parsedData.shares) : undefined,
      strikePrice: parsedData.strikePrice ? Number(parsedData.strikePrice) : undefined,
      grantDate: parsedData.grantDate || undefined,
      companyName: parsedData.companyName || undefined,
      ticker: parsedData.ticker || undefined,
      cliffMonths: parsedData.cliffMonths ? Number(parsedData.cliffMonths) : undefined,
      vestingMonths: parsedData.vestingMonths ? Number(parsedData.vestingMonths) : undefined,
    };
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse document data. Please check the document format.');
  }
};
