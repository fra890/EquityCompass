import React, { useMemo } from 'react';
import { Client, Grant } from '../types';
import { formatCurrency, formatNumber, getEffectiveRates, addMonths } from '../utils/calculations';
import { CheckCircle, Clock, AlertTriangle, Gift, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ESPPQualificationTrackerProps {
  client: Client;
  grants: Grant[];
}

interface ESPPPosition {
  grantId: string;
  companyName: string;
  ticker: string;
  purchaseDate: string;
  offeringStartDate: string;
  shares: number;
  purchasePrice: number;
  fmvAtPurchase: number;
  fmvAtOfferingStart: number;
  currentPrice: number;
  discountPercent: number;
  qualifyingDate: string;
  isQualified: boolean;
  daysRemaining: number;
  progressPercent: number;
  disqualifiedTax: number;
  qualifiedTax: number;
  taxSavings: number;
  ordinaryIncome: {
    disqualified: number;
    qualified: number;
  };
  capitalGain: {
    disqualified: number;
    qualified: number;
  };
  totalGain: number;
}

export const ESPPQualificationTracker: React.FC<ESPPQualificationTrackerProps> = ({ client, grants }) => {
  const esppGrants = grants.filter(g => g.type === 'ESPP');

  const { stateRate, fedLtcgRate } = getEffectiveRates(client);
  const ordinaryRate = (client.taxBracket / 100) + stateRate;
  const ltcgRate = fedLtcgRate + stateRate + 0.038;

  const positions = useMemo(() => {
    const result: ESPPPosition[] = [];

    for (const grant of esppGrants) {
      const purchaseDate = new Date(grant.grantDate);
      const offeringStartDate = grant.esppOfferingStartDate
        ? new Date(grant.esppOfferingStartDate)
        : addMonths(purchaseDate, -6);

      const twoYearsFromOffering = new Date(offeringStartDate);
      twoYearsFromOffering.setFullYear(offeringStartDate.getFullYear() + 2);

      const oneYearFromPurchase = new Date(purchaseDate);
      oneYearFromPurchase.setFullYear(purchaseDate.getFullYear() + 1);

      const qualifyingDate = twoYearsFromOffering > oneYearFromPurchase ? twoYearsFromOffering : oneYearFromPurchase;

      const now = new Date();
      const isQualified = now >= qualifyingDate;
      const daysRemaining = isQualified ? 0 : Math.ceil((qualifyingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const totalHoldingDays = (qualifyingDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysPassed = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      const progressPercent = Math.min(100, Math.max(0, (daysPassed / totalHoldingDays) * 100));

      const shares = grant.totalShares;
      const purchasePrice = grant.esppPurchasePrice || grant.grantPrice || 0;
      const fmvAtPurchase = grant.esppFmvAtPurchase || grant.currentPrice;
      const fmvAtOfferingStart = grant.esppFmvAtOfferingStart || fmvAtPurchase;
      const currentPrice = grant.currentPrice;
      const discountPercent = grant.esppDiscountPercent || 15;

      const totalCost = shares * purchasePrice;
      const currentValue = shares * currentPrice;
      const totalGain = currentValue - totalCost;

      const discountAmount = Math.min(fmvAtPurchase, fmvAtOfferingStart) * (discountPercent / 100);
      const bargainElement = fmvAtPurchase - purchasePrice;

      let disqualOrdinary = bargainElement * shares;
      let disqualCapGain = Math.max(0, (currentPrice - fmvAtPurchase) * shares);
      let disqualTax = (disqualOrdinary * ordinaryRate) + (disqualCapGain * ltcgRate);

      let qualOrdinary = discountAmount * shares;
      let qualCapGain = Math.max(0, totalGain - qualOrdinary);
      let qualTax = (qualOrdinary * ordinaryRate) + (qualCapGain * ltcgRate);

      const taxSavings = disqualTax - qualTax;

      result.push({
        grantId: grant.id,
        companyName: grant.companyName,
        ticker: grant.ticker,
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        offeringStartDate: offeringStartDate.toISOString().split('T')[0],
        shares,
        purchasePrice,
        fmvAtPurchase,
        fmvAtOfferingStart,
        currentPrice,
        discountPercent,
        qualifyingDate: qualifyingDate.toISOString().split('T')[0],
        isQualified,
        daysRemaining,
        progressPercent,
        disqualifiedTax: disqualTax,
        qualifiedTax: qualTax,
        taxSavings,
        ordinaryIncome: {
          disqualified: disqualOrdinary,
          qualified: qualOrdinary
        },
        capitalGain: {
          disqualified: disqualCapGain,
          qualified: qualCapGain
        },
        totalGain
      });
    }

    return result.sort((a, b) => new Date(a.qualifyingDate).getTime() - new Date(b.qualifyingDate).getTime());
  }, [esppGrants, ordinaryRate, ltcgRate]);

  const totals = useMemo(() => {
    return {
      totalValue: positions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0),
      totalGain: positions.reduce((sum, p) => sum + p.totalGain, 0),
      totalSavings: positions.reduce((sum, p) => sum + p.taxSavings, 0),
      qualified: positions.filter(p => p.isQualified).length,
      pending: positions.filter(p => !p.isQualified).length
    };
  }, [positions]);

  if (esppGrants.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <Gift size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-slate-500 font-medium">No ESPP positions found</p>
        <p className="text-slate-400 text-sm mt-1">Add ESPP grants to track qualifying dispositions</p>
      </div>
    );
  }

  const chartData = positions.map(p => ({
    name: `${p.ticker} (${new Date(p.purchaseDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })})`,
    'Disqualified Tax': p.disqualifiedTax,
    'Qualified Tax': p.qualifiedTax,
    'Tax Savings': p.taxSavings
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-green-600">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Gift size={20} />
          ESPP Qualification Tracker
        </h3>
        <p className="text-sm text-emerald-100 mt-1">Track qualifying dispositions for favorable tax treatment</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total ESPP Value</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalValue)}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Total Gain</div>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totals.totalGain)}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-700 uppercase mb-1">Potential Tax Savings</div>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(totals.totalSavings)}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-xs font-bold text-blue-700 uppercase mb-1">Status</div>
            <div className="text-lg font-bold text-blue-700">
              {totals.qualified} Qualified / {totals.pending} Pending
            </div>
          </div>
        </div>

        {positions.some(p => !p.isQualified && p.daysRemaining <= 90) && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
            <div className="flex items-start gap-3">
              <Clock size={24} className="text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800">Upcoming Qualification Dates</h4>
                <div className="mt-2 space-y-2">
                  {positions.filter(p => !p.isQualified && p.daysRemaining <= 90).map(p => (
                    <div key={p.grantId} className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-amber-100">
                      <div>
                        <span className="font-bold text-slate-800">{p.ticker}</span>
                        <span className="text-slate-500 ml-2">({formatNumber(p.shares)} shares)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-700">{p.daysRemaining} days</div>
                        <div className="text-xs text-slate-500">{new Date(p.qualifyingDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {positions.map((p) => (
            <div key={p.grantId} className={`rounded-xl border overflow-hidden ${p.isQualified ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
              <div className={`px-5 py-3 flex items-center justify-between ${p.isQualified ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                  {p.isQualified ? (
                    <CheckCircle size={20} className="text-emerald-600" />
                  ) : (
                    <Clock size={20} className="text-amber-600" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800">{p.ticker}</span>
                    <span className="text-slate-500 ml-2">{p.companyName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.isQualified ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {p.isQualified ? 'Qualified' : `${p.daysRemaining} days remaining`}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">{formatNumber(p.shares)} shares</div>
                  <div className="text-xs text-slate-500">Purchased {new Date(p.purchaseDate).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="p-5">
                {!p.isQualified && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress to Qualification</span>
                      <span>Qualifies: {new Date(p.qualifyingDate).toLocaleDateString()}</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${p.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 font-bold uppercase">Purchase Price</div>
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(p.purchasePrice)}</div>
                    <div className="text-xs text-emerald-600">{p.discountPercent}% discount</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 font-bold uppercase">FMV at Purchase</div>
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(p.fmvAtPurchase)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 font-bold uppercase">Current Price</div>
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(p.currentPrice)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 font-bold uppercase">Total Gain</div>
                    <div className={`text-lg font-bold ${p.totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(p.totalGain)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <h5 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Sell Now (Disqualifying)
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Ordinary Income:</span>
                        <span className="font-mono">{formatCurrency(p.ordinaryIncome.disqualified)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Capital Gain:</span>
                        <span className="font-mono">{formatCurrency(p.capitalGain.disqualified)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-red-200">
                        <span className="font-bold text-red-800">Total Tax:</span>
                        <span className="font-bold text-red-700">{formatCurrency(p.disqualifiedTax)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <h5 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                      <CheckCircle size={16} />
                      {p.isQualified ? 'Sell Now (Qualified)' : 'Wait to Qualify'}
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Ordinary Income:</span>
                        <span className="font-mono">{formatCurrency(p.ordinaryIncome.qualified)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Capital Gain:</span>
                        <span className="font-mono">{formatCurrency(p.capitalGain.qualified)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-emerald-200">
                        <span className="font-bold text-emerald-800">Total Tax:</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(p.qualifiedTax)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {p.taxSavings > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg p-4 text-white text-center">
                    <div className="text-sm opacity-90">
                      {p.isQualified ? 'You save' : 'By waiting, you save'}
                    </div>
                    <div className="text-3xl font-bold">{formatCurrency(p.taxSavings)}</div>
                    <div className="text-sm opacity-90">in taxes with qualifying disposition</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {chartData.length > 1 && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">Tax Comparison by Position</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="Disqualified Tax" fill="#ef4444" />
                  <Bar dataKey="Qualified Tax" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
            <Target size={18} />
            ESPP Qualification Rules
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <div className="font-bold mb-1">Qualifying Disposition Requirements:</div>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Hold shares 2+ years from <strong>offering start date</strong></li>
                <li>Hold shares 1+ year from <strong>purchase date</strong></li>
                <li>Both conditions must be met</li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-1">Tax Treatment Difference:</div>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><strong>Qualifying:</strong> Ordinary income limited to actual discount received</li>
                <li><strong>Disqualifying:</strong> Full bargain element taxed as ordinary income</li>
                <li>Remaining gain taxed as capital gains in both cases</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
