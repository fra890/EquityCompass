import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, VestingEvent, Grant } from '../types';
import { formatCurrency, formatNumber, formatPercent, getGrantStatus, generateVestingSchedule, getEffectiveRates } from './calculations';

export const generateClientPDF = (
  client: Client,
  upcomingEvents: VestingEvent[]
) => {
  const doc = new jsPDF();

  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];

  let yPosition = 20;

  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text('EQUITY COMPENSATION REPORT', 105, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(16);
  doc.setTextColor(...secondaryColor);
  doc.text(client.name, 105, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: 'center' });

  yPosition += 15;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Client Profile', 14, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Tax Bracket: ${client.taxBracket}%`, 14, yPosition);
  doc.text(`State: ${client.state}`, 80, yPosition);
  doc.text(`Filing Status: ${client.filingStatus}`, 130, yPosition);

  yPosition += 10;

  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Active Grants Summary', 14, yPosition);

  yPosition += 5;

  const grantData = client.grants.map(grant => {
    const status = getGrantStatus(grant, client.plannedExercises);
    const currentValue = grant.totalShares * grant.currentPrice;
    const unvestedValue = status.unvested * grant.currentPrice;

    return [
      grant.type,
      grant.ticker,
      grant.companyName,
      formatNumber(grant.totalShares),
      formatCurrency(grant.currentPrice),
      grant.strikePrice ? formatCurrency(grant.strikePrice) : 'N/A',
      new Date(grant.grantDate).toLocaleDateString(),
      formatCurrency(currentValue),
      formatNumber(status.unvested),
      formatCurrency(unvestedValue)
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Type', 'Ticker', 'Company', 'Total Shares', 'Current Price', 'Strike', 'Grant Date', 'Total Value', 'Unvested', 'Unvested Value']],
    body: grantData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 18 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 20 },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 25, halign: 'right' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  const totalValue = client.grants.reduce((sum, g) => sum + (g.totalShares * g.currentPrice), 0);
  const totalUnvested = client.grants.reduce((sum, g) => {
    const status = getGrantStatus(g, client.plannedExercises);
    return sum + (status.unvested * g.currentPrice);
  }, 0);

  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text(`Total Portfolio Value: ${formatCurrency(totalValue)}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Total Unvested Value: ${formatCurrency(totalUnvested)}`, 14, yPosition);

  yPosition += 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Upcoming Vesting Events (Next 12 Months)', 14, yPosition);

  yPosition += 5;

  const upcomingData = upcomingEvents.slice(0, 20).map(event => [
    new Date(event.date).toLocaleDateString(),
    event.ticker,
    event.grantType,
    formatNumber(event.shares),
    formatCurrency(event.priceAtVest),
    formatCurrency(event.grossValue),
    formatCurrency(event.withholdingAmount),
    formatCurrency(event.netValue),
    formatCurrency(event.taxGap)
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Date', 'Ticker', 'Type', 'Shares', 'Price', 'Gross', 'Withholding', 'Net', 'Tax Gap']],
    body: upcomingData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 15 },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  const totalGross = upcomingEvents.reduce((sum, e) => sum + e.grossValue, 0);
  const totalWithholding = upcomingEvents.reduce((sum, e) => sum + e.withholdingAmount, 0);
  const totalTaxGap = upcomingEvents.reduce((sum, e) => sum + e.taxGap, 0);
  const totalNet = upcomingEvents.reduce((sum, e) => sum + e.netValue, 0);

  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('12-Month Projections:', 14, yPosition);
  yPosition += 6;
  doc.setFontSize(10);
  doc.text(`Total Gross Income: ${formatCurrency(totalGross)}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Total Withholding: ${formatCurrency(totalWithholding)}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Estimated Tax Gap: ${formatCurrency(totalTaxGap)}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Net After Withholding: ${formatCurrency(totalNet)}`, 14, yPosition);

  yPosition += 10;

  if (client.plannedExercises && client.plannedExercises.length > 0) {
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Planned ISO Exercises', 14, yPosition);

    yPosition += 5;

    const exerciseData = client.plannedExercises.map(ex => [
      new Date(ex.exerciseDate).toLocaleDateString(),
      ex.grantTicker,
      formatNumber(ex.shares),
      formatCurrency(ex.exercisePrice),
      formatCurrency(ex.fmvAtExercise),
      formatCurrency(ex.amtExposure),
      formatCurrency(ex.estimatedCost)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Exercise Date', 'Ticker', 'Shares', 'Strike', 'FMV', 'AMT Exposure', 'Cost']],
      body: exerciseData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' }
      }
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('EquityCompass - Confidential', 14, 290);
  }

  const filename = `${client.name.replace(/\s+/g, '_')}_Equity_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

interface ISOComparisonData {
  clientName: string;
  grantTicker: string;
  strikePrice: number;
  currentPrice: number;
  sharesToExercise: number;
  taxBracket: number;
  state: string;
  disqualified: {
    netProfit: number;
    totalTax: number;
    fedAmount: number;
    stateAmount: number;
    niitAmount: number;
    effectiveRate: number;
  };
  qualified: {
    netProfit: number;
    totalTax: number;
    fedAmount: number;
    stateAmount: number;
    niitAmount: number;
    effectiveRate: number;
  };
  taxSavings: number;
  amtRoom: number;
  currentSpread: number;
  isAmtDanger: boolean;
  estimatedAmt: number;
}

export const generateISOComparisonPDF = (data: ISOComparisonData) => {
  const doc = new jsPDF();

  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];
  const successColor: [number, number, number] = [16, 185, 129];
  const warningColor: [number, number, number] = [245, 158, 11];

  let yPosition = 20;

  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text('ISO EXERCISE ANALYSIS', 105, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(16);
  doc.setTextColor(...secondaryColor);
  doc.text(data.clientName, 105, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: 'center' });

  yPosition += 15;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Exercise Details', 14, yPosition);

  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Parameter', 'Value']],
    body: [
      ['Stock Ticker', data.grantTicker],
      ['Shares to Exercise', formatNumber(data.sharesToExercise)],
      ['Strike Price', formatCurrency(data.strikePrice)],
      ['Current FMV', formatCurrency(data.currentPrice)],
      ['Spread per Share', formatCurrency(data.currentPrice - data.strikePrice)],
      ['Total Spread', formatCurrency(data.currentSpread)],
      ['Exercise Cost', formatCurrency(data.sharesToExercise * data.strikePrice)],
      ['Tax Bracket', `${data.taxBracket}%`],
      ['State', data.state],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFillColor(...(data.taxSavings > 0 ? successColor : warningColor));
  doc.roundedRect(14, yPosition, 182, 30, 3, 3, 'F');

  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX SAVINGS BY HOLDING', 105, yPosition + 10, { align: 'center' });
  doc.setFontSize(24);
  doc.text(formatCurrency(data.taxSavings), 105, yPosition + 24, { align: 'center' });

  yPosition += 40;

  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Side-by-Side Tax Comparison', 14, yPosition);

  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [['', 'Sell Immediately\n(Disqualified)', 'Hold 1+ Year\n(Qualified)']],
    body: [
      ['Sale Proceeds', formatCurrency(data.sharesToExercise * data.currentPrice), formatCurrency(data.sharesToExercise * data.currentPrice)],
      ['Exercise Cost', formatCurrency(data.sharesToExercise * data.strikePrice), formatCurrency(data.sharesToExercise * data.strikePrice)],
      ['Taxable Gain', formatCurrency(data.currentSpread), formatCurrency(data.currentSpread)],
      ['', '', ''],
      ['Federal Tax', formatCurrency(data.disqualified.fedAmount), formatCurrency(data.qualified.fedAmount)],
      ['State Tax', formatCurrency(data.disqualified.stateAmount), formatCurrency(data.qualified.stateAmount)],
      ['NIIT (3.8%)', formatCurrency(data.disqualified.niitAmount), formatCurrency(data.qualified.niitAmount)],
      ['Total Tax', formatCurrency(data.disqualified.totalTax), formatCurrency(data.qualified.totalTax)],
      ['Effective Rate', `${(data.disqualified.effectiveRate * 100).toFixed(1)}%`, `${(data.qualified.effectiveRate * 100).toFixed(1)}%`],
      ['', '', ''],
      ['NET PROCEEDS', formatCurrency(data.disqualified.netProfit), formatCurrency(data.qualified.netProfit)],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 60, halign: 'right' },
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === 10 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize = 11;
      }
      if (hookData.row.index === 7 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 25, right: 25 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('AMT Analysis', 14, yPosition);

  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`AMT Safe Harbor Room: ${formatCurrency(data.amtRoom)}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Your Exercise Spread: ${formatCurrency(data.currentSpread)}`, 14, yPosition);
  yPosition += 6;

  if (data.isAmtDanger) {
    doc.setTextColor(...warningColor);
    doc.text(`WARNING: Exceeds safe harbor by ${formatCurrency(data.currentSpread - data.amtRoom)}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Estimated AMT Liability: ${formatCurrency(data.estimatedAmt)}`, 14, yPosition);
  } else {
    doc.setTextColor(...successColor);
    doc.text('Within AMT safe harbor - no AMT expected.', 14, yPosition);
  }

  yPosition += 15;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Understanding the Comparison', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const explanations = [
    'DISQUALIFIED DISPOSITION: Selling immediately (or within holding period) results in the spread',
    'being taxed as ordinary income at your marginal tax rate.',
    '',
    'QUALIFIED DISPOSITION: Holding shares for 1+ year from exercise AND 2+ years from grant date',
    'qualifies the entire gain for long-term capital gains rates (0%, 15%, or 20%).',
    '',
    'AMT CONSIDERATION: When you exercise and hold ISOs, the spread is an AMT preference item.',
    'Exercising up to your AMT safe harbor is effectively tax-free for the current year.',
  ];

  explanations.forEach(line => {
    doc.text(line, 14, yPosition);
    yPosition += 5;
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('EquityCompass - Confidential', 14, 290);
  }

  const filename = `${data.clientName.replace(/\s+/g, '_')}_ISO_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

const addPageFooter = (doc: jsPDF, advisorName?: string) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text(advisorName || 'EquityCompass - Confidential', 14, 290);
  }
};

const addReportHeader = (doc: jsPDF, title: string, clientName: string, subtitle?: string): number => {
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];

  let yPosition = 20;

  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text(title, 105, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(16);
  doc.setTextColor(...secondaryColor);
  doc.text(clientName, 105, yPosition, { align: 'center' });

  if (subtitle) {
    yPosition += 7;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 105, yPosition, { align: 'center' });
  }

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: 'center' });

  return yPosition + 15;
};

export const generateVestingOverviewPDF = (client: Client, upcomingEvents: VestingEvent[]) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];

  let yPosition = addReportHeader(doc, 'VESTING OVERVIEW REPORT', client.name);

  const totalValue = client.grants.reduce((sum, g) => sum + (g.totalShares * g.currentPrice), 0);
  const totalUnvested = client.grants.reduce((sum, g) => {
    const status = getGrantStatus(g, client.plannedExercises);
    return sum + (status.unvested * g.currentPrice);
  }, 0);

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Portfolio Summary', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Portfolio Value', formatCurrency(totalValue)],
      ['Unvested Value', formatCurrency(totalUnvested)],
      ['Number of Grants', client.grants.length.toString()],
      ['Tax Bracket', `${client.taxBracket}%`],
      ['Filing Status', client.filingStatus === 'married_joint' ? 'Married Filing Jointly' : 'Single'],
      ['State', client.state],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Active Grants', 14, yPosition);
  yPosition += 5;

  const grantData = client.grants.map(grant => {
    const status = getGrantStatus(grant, client.plannedExercises);
    return [
      grant.type,
      grant.ticker,
      grant.companyName,
      formatNumber(grant.totalShares),
      formatNumber(status.unvested),
      formatCurrency(grant.currentPrice),
      formatCurrency(grant.totalShares * grant.currentPrice),
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Type', 'Ticker', 'Company', 'Total', 'Unvested', 'Price', 'Value']],
    body: grantData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Upcoming Vesting Events (Next 12 Months)', 14, yPosition);
  yPosition += 5;

  const upcomingData = upcomingEvents.slice(0, 15).map(event => [
    new Date(event.date).toLocaleDateString(),
    event.ticker,
    event.grantType,
    formatNumber(event.shares),
    formatCurrency(event.priceAtVest),
    formatCurrency(event.grossValue),
    formatCurrency(event.taxGap),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Date', 'Ticker', 'Type', 'Shares', 'Price', 'Gross Value', 'Tax Gap']],
    body: upcomingData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
  });

  addPageFooter(doc);

  const filename = `${client.name.replace(/\s+/g, '_')}_Vesting_Overview_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateRSUDetailsPDF = (client: Client, grants: Grant[]) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];

  const rsuGrants = grants.filter(g => g.type === 'RSU');

  let yPosition = addReportHeader(doc, 'RSU DETAILS REPORT', client.name);

  const totalValue = rsuGrants.reduce((sum, g) => sum + (g.totalShares * g.currentPrice), 0);
  const totalShares = rsuGrants.reduce((sum, g) => sum + g.totalShares, 0);
  const { stateRate } = getEffectiveRates(client);
  const effectiveTaxRate = (client.taxBracket / 100) + stateRate + 0.038;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('RSU Portfolio Summary', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total RSU Grants', rsuGrants.length.toString()],
      ['Total Shares', formatNumber(totalShares)],
      ['Total Value', formatCurrency(totalValue)],
      ['Effective Tax Rate', formatPercent(effectiveTaxRate)],
      ['Estimated Tax Liability', formatCurrency(totalValue * effectiveTaxRate)],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  for (const grant of rsuGrants) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    const status = getGrantStatus(grant, client.plannedExercises);
    const schedule = generateVestingSchedule(grant, client);
    const currentYear = new Date().getFullYear();
    const thisYearEvents = schedule.filter(e => new Date(e.date).getFullYear() === currentYear && !e.isPast);

    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text(`${grant.ticker} - ${grant.companyName}`, 14, yPosition);
    yPosition += 8;

    const grantDetails = [
      ['Grant Date', new Date(grant.grantDate).toLocaleDateString()],
      ['Total Shares', formatNumber(grant.totalShares)],
      ['Vested Shares', formatNumber(status.vestedTotal)],
      ['Unvested Shares', formatNumber(status.unvested)],
      ['Current Price', formatCurrency(grant.currentPrice)],
      ['Current Value', formatCurrency(grant.totalShares * grant.currentPrice)],
      ['Withholding Rate', `${grant.withholdingRate || 22}%`],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: grantDetails,
      theme: 'plain',
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold', textColor: [100, 100, 100] },
        1: { cellWidth: 45 },
      },
      margin: { left: 20 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;

    if (thisYearEvents.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(...secondaryColor);
      doc.text('Remaining Vests This Year:', 20, yPosition);
      yPosition += 5;

      const vestData = thisYearEvents.slice(0, 4).map(e => [
        new Date(e.date).toLocaleDateString(),
        formatNumber(e.shares),
        formatCurrency(e.grossValue),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Shares', 'Value']],
        body: vestData,
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 20, right: 100 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    } else {
      yPosition += 10;
    }
  }

  addPageFooter(doc);

  const filename = `${client.name.replace(/\s+/g, '_')}_RSU_Details_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateESPPReportPDF = (client: Client, grants: Grant[]) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];
  const successColor: [number, number, number] = [16, 185, 129];

  const esppGrants = grants.filter(g => g.type === 'ESPP');

  let yPosition = addReportHeader(doc, 'ESPP TRACKER REPORT', client.name);

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('ESPP Holdings Summary', 14, yPosition);
  yPosition += 8;

  const totalShares = esppGrants.reduce((sum, g) => sum + g.totalShares, 0);
  const totalValue = esppGrants.reduce((sum, g) => sum + (g.totalShares * g.currentPrice), 0);
  const totalCostBasis = esppGrants.reduce((sum, g) => sum + (g.totalShares * (g.esppPurchasePrice || g.grantPrice || 0)), 0);

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total ESPP Lots', esppGrants.length.toString()],
      ['Total Shares', formatNumber(totalShares)],
      ['Total Cost Basis', formatCurrency(totalCostBasis)],
      ['Current Value', formatCurrency(totalValue)],
      ['Unrealized Gain', formatCurrency(totalValue - totalCostBasis)],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('ESPP Lots & Qualification Status', 14, yPosition);
  yPosition += 5;

  const lotData = esppGrants.map(grant => {
    const purchaseDate = new Date(grant.grantDate);
    const qualifyingDate = new Date(purchaseDate);
    qualifyingDate.setFullYear(qualifyingDate.getFullYear() + 2);
    const isQualified = new Date() >= qualifyingDate;

    return [
      grant.ticker,
      new Date(grant.grantDate).toLocaleDateString(),
      formatNumber(grant.totalShares),
      formatCurrency(grant.esppPurchasePrice || grant.grantPrice || 0),
      formatCurrency(grant.currentPrice),
      qualifyingDate.toLocaleDateString(),
      isQualified ? 'Qualified' : 'Disqualifying',
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Ticker', 'Purchase', 'Shares', 'Cost', 'Price', 'Qualifies', 'Status']],
    body: lotData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    didParseCell: (hookData) => {
      if (hookData.column.index === 6 && hookData.section === 'body') {
        const value = hookData.cell.raw as string;
        if (value === 'Qualified') {
          hookData.cell.styles.textColor = successColor;
          hookData.cell.styles.fontStyle = 'bold';
        } else {
          hookData.cell.styles.textColor = [245, 158, 11];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition < 240) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('ESPP Qualification Rules:', 14, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    const rules = [
      '- Qualifying disposition: Hold shares 2+ years from offering start AND 1+ year from purchase',
      '- Disqualifying disposition: Entire discount taxed as ordinary income',
      '- Qualifying disposition: Only actual discount at purchase taxed as ordinary income',
    ];
    rules.forEach(rule => {
      doc.text(rule, 14, yPosition);
      yPosition += 5;
    });
  }

  addPageFooter(doc);

  const filename = `${client.name.replace(/\s+/g, '_')}_ESPP_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateISOPlanningPDF = (client: Client, grants: Grant[]) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];
  const warningColor: [number, number, number] = [245, 158, 11];

  const isoGrants = grants.filter(g => g.type === 'ISO');

  let yPosition = addReportHeader(doc, 'ISO PLANNING REPORT', client.name);

  const amtExemption = client.filingStatus === 'married_joint' ? 133300 : 85700;
  const amtRoom = client.customAmtSafeHarbor || amtExemption;
  const plannedSpread = client.plannedExercises.reduce((sum, ex) => sum + ex.amtExposure, 0);

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('AMT Planning Summary', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Filing Status', client.filingStatus === 'married_joint' ? 'Married Filing Jointly' : 'Single'],
      ['AMT Safe Harbor', formatCurrency(amtRoom)],
      ['Planned Exercise Spread', formatCurrency(plannedSpread)],
      ['Remaining Capacity', formatCurrency(Math.max(0, amtRoom - plannedSpread))],
      ['ISO Grants', isoGrants.length.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (isoGrants.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text('ISO Grants Overview', 14, yPosition);
    yPosition += 5;

    const grantData = isoGrants.map(grant => {
      const status = getGrantStatus(grant, client.plannedExercises);
      const spread = (grant.currentPrice - (grant.strikePrice || 0)) * status.available;
      return [
        grant.ticker,
        grant.companyName,
        formatNumber(status.available),
        formatCurrency(grant.strikePrice || 0),
        formatCurrency(grant.currentPrice),
        formatCurrency(spread),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Ticker', 'Company', 'Exercisable', 'Strike', 'FMV', 'Spread']],
      body: grantData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  if (client.plannedExercises.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text('Planned Exercises', 14, yPosition);
    yPosition += 5;

    const exerciseData = client.plannedExercises.map(ex => [
      new Date(ex.exerciseDate).toLocaleDateString(),
      ex.grantTicker,
      formatNumber(ex.shares),
      formatCurrency(ex.exercisePrice),
      formatCurrency(ex.fmvAtExercise),
      formatCurrency(ex.amtExposure),
      formatCurrency(ex.estimatedCost),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Ticker', 'Shares', 'Strike', 'FMV', 'AMT Spread', 'Cost']],
      body: exerciseData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  if (plannedSpread > amtRoom && yPosition < 250) {
    doc.setFillColor(...warningColor);
    doc.roundedRect(14, yPosition, 182, 20, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('WARNING: Planned exercises exceed AMT safe harbor', 105, yPosition + 8, { align: 'center' });
    doc.text(`Excess spread: ${formatCurrency(plannedSpread - amtRoom)}`, 105, yPosition + 15, { align: 'center' });
  }

  addPageFooter(doc);

  const filename = `${client.name.replace(/\s+/g, '_')}_ISO_Planning_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateTaxPlanningPDF = (client: Client, grants: Grant[], withholdingRate: number = 22) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];

  let yPosition = addReportHeader(doc, 'TAX PLANNING REPORT', client.name);

  const { stateRate } = getEffectiveRates(client);
  const fedRate = client.taxBracket / 100;
  const niitRate = 0.038;
  const effectiveTaxRate = fedRate + stateRate + niitRate;

  const currentYear = new Date().getFullYear();
  let totalVestingValue = 0;
  let totalWithholding = 0;

  const rsuGrants = grants.filter(g => g.type === 'RSU');
  for (const grant of rsuGrants) {
    const schedule = generateVestingSchedule(grant, client);
    const thisYearEvents = schedule.filter(e => new Date(e.date).getFullYear() === currentYear);
    const grantValue = thisYearEvents.reduce((sum, e) => sum + e.grossValue, 0);
    totalVestingValue += grantValue;
    totalWithholding += grantValue * (withholdingRate / 100);
  }

  const totalTaxLiability = totalVestingValue * effectiveTaxRate;
  const taxGap = totalTaxLiability - totalWithholding;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Tax Rate Summary', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Component', 'Rate']],
    body: [
      ['Federal Ordinary Income', formatPercent(fedRate)],
      ['State Tax (' + client.state + ')', formatPercent(stateRate)],
      ['NIIT (Net Investment Income)', formatPercent(niitRate)],
      ['Combined Effective Rate', formatPercent(effectiveTaxRate)],
      ['Elected Withholding Rate', formatPercent(withholdingRate / 100)],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text(`${currentYear} RSU Tax Projection`, 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Amount']],
    body: [
      ['Total RSU Vesting Value', formatCurrency(totalVestingValue)],
      ['Withholding at ' + withholdingRate + '%', formatCurrency(totalWithholding)],
      ['Estimated Tax Liability', formatCurrency(totalTaxLiability)],
      ['Tax Gap (Shortfall)', formatCurrency(Math.max(0, taxGap))],
      ['Quarterly Payment Needed', formatCurrency(Math.max(0, taxGap / 4))],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
    didParseCell: (hookData) => {
      if (hookData.row.index === 3 && hookData.section === 'body') {
        hookData.cell.styles.textColor = taxGap > 0 ? [220, 38, 38] : [16, 185, 129];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  const totalEquityValue = grants.reduce((sum, g) => sum + (g.totalShares * g.currentPrice), 0);
  const concentrationByTicker: Record<string, number> = {};
  grants.forEach(g => {
    const value = g.totalShares * g.currentPrice;
    concentrationByTicker[g.ticker] = (concentrationByTicker[g.ticker] || 0) + value;
  });

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Concentration Risk', 14, yPosition);
  yPosition += 8;

  const concentrationData = Object.entries(concentrationByTicker)
    .sort((a, b) => b[1] - a[1])
    .map(([ticker, value]) => [
      ticker,
      formatCurrency(value),
      formatPercent(value / totalEquityValue),
    ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Ticker', 'Value', 'Concentration']],
    body: concentrationData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition < 250) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Recommendations:', 14, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    const recommendations = [];
    if (taxGap > 0) {
      recommendations.push(`- Consider quarterly estimated payments of ${formatCurrency(taxGap / 4)}`);
      recommendations.push('- Or increase W-4 withholding from salary');
      if (withholdingRate < effectiveTaxRate * 100) {
        recommendations.push(`- Consider electing higher RSU withholding rate (${Math.ceil(effectiveTaxRate * 100)}%+)`);
      }
    }
    const maxConcentration = Math.max(...Object.values(concentrationByTicker)) / totalEquityValue;
    if (maxConcentration > 0.5) {
      recommendations.push('- Consider diversification: single stock exceeds 50% of equity');
    }
    if (recommendations.length === 0) {
      recommendations.push('- Your withholding appears adequate for projected income');
    }
    recommendations.forEach(rec => {
      doc.text(rec, 14, yPosition);
      yPosition += 5;
    });
  }

  addPageFooter(doc);

  const filename = `${client.name.replace(/\s+/g, '_')}_Tax_Planning_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const generateHistoryReportPDF = (client: Client, grants: Grant[]) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [0, 102, 204];
  const secondaryColor: [number, number, number] = [51, 65, 85];

  let yPosition = addReportHeader(doc, 'HISTORY & TRENDS REPORT', client.name);

  const allSales = grants.flatMap(g => g.sales.map(s => ({ ...s, ticker: g.ticker, grantType: g.type })));
  allSales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  const totalSaleProceeds = allSales.reduce((sum, s) => sum + s.totalProceeds, 0);
  const totalSharesSold = allSales.reduce((sum, s) => sum + s.sharesSold, 0);

  doc.setFontSize(12);
  doc.setTextColor(...secondaryColor);
  doc.text('Sales History Summary', 14, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Sales Transactions', allSales.length.toString()],
      ['Total Shares Sold', formatNumber(totalSharesSold)],
      ['Total Proceeds', formatCurrency(totalSaleProceeds)],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (allSales.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text('Recent Sales', 14, yPosition);
    yPosition += 5;

    const salesData = allSales.slice(0, 15).map(sale => [
      new Date(sale.saleDate).toLocaleDateString(),
      sale.ticker,
      formatNumber(sale.sharesSold),
      formatCurrency(sale.salePrice),
      formatCurrency(sale.totalProceeds),
      sale.reason,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Ticker', 'Shares', 'Price', 'Proceeds', 'Reason']],
      body: salesData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  const currentYear = new Date().getFullYear();
  const yearlyData: Record<number, { vested: number; sold: number; value: number }> = {};

  grants.forEach(grant => {
    const schedule = generateVestingSchedule(grant, client);
    schedule.forEach(event => {
      const year = new Date(event.date).getFullYear();
      if (year <= currentYear && event.isPast) {
        if (!yearlyData[year]) yearlyData[year] = { vested: 0, sold: 0, value: 0 };
        yearlyData[year].vested += event.shares;
        yearlyData[year].value += event.grossValue;
      }
    });

    grant.sales.forEach(sale => {
      const year = new Date(sale.saleDate).getFullYear();
      if (!yearlyData[year]) yearlyData[year] = { vested: 0, sold: 0, value: 0 };
      yearlyData[year].sold += sale.sharesSold;
    });
  });

  if (Object.keys(yearlyData).length > 0 && yPosition < 200) {
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text('Year-over-Year Activity', 14, yPosition);
    yPosition += 5;

    const yearData = Object.entries(yearlyData)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .slice(0, 5)
      .map(([year, data]) => [
        year,
        formatNumber(data.vested),
        formatCurrency(data.value),
        formatNumber(data.sold),
      ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Year', 'Shares Vested', 'Vest Value', 'Shares Sold']],
      body: yearData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 40, right: 40 },
    });
  }

  addPageFooter(doc);

  const filename = `${client.name.replace(/\s+/g, '_')}_History_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
