import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, VestingEvent } from '../types';
import { formatCurrency, formatNumber, getGrantStatus } from './calculations';

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
