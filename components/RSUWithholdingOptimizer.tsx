import React, { useState, useMemo } from 'react';
import { Client, Grant } from '../types';
import { formatCurrency, formatPercent, getEffectiveRates, generateVestingSchedule } from '../utils/calculations';
import { AlertTriangle, DollarSign, Calculator, CheckCircle, XCircle, Percent, Sliders } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RSUWithholdingOptimizerProps {
  client: Client;
  grants: Grant[];
}

interface WithholdingAnalysis {
  grantId: string;
  ticker: string;
  totalVestingValue: number;
  electedWithholding: number;
  electedRate: number;
  actualTaxLiability: number;
  actualRate: number;
  gap: number;
  gapPercent: number;
  isUnderpaid: boolean;
  recommendedSupplemental: number;
  quarterlyPayment: number;
}

export const RSUWithholdingOptimizer: React.FC<RSUWithholdingOptimizerProps> = ({ client, grants }) => {
  const rsuGrants = grants.filter(g => g.type === 'RSU');
  const [customWithholdingRate, setCustomWithholdingRate] = useState<number>(22);

  const analysis = useMemo(() => {
    if (rsuGrants.length === 0) return { grants: [], totals: null };

    const { stateRate } = getEffectiveRates(client);
    const fedRate = client.taxBracket / 100;
    const niitRate = 0.038;
    const actualTaxRate = fedRate + stateRate + niitRate;

    const currentYear = new Date().getFullYear();
    const grantAnalyses: WithholdingAnalysis[] = [];

    let totalVestingValue = 0;
    let totalWithholding = 0;
    let totalActualTax = 0;

    for (const grant of rsuGrants) {
      const schedule = generateVestingSchedule(grant, client);
      const thisYearEvents = schedule.filter(e => {
        const eventYear = new Date(e.date).getFullYear();
        return eventYear === currentYear;
      });

      const grantVestingValue = thisYearEvents.reduce((sum, e) => sum + e.grossValue, 0);
      const electedRate = (grant.withholdingRate ?? customWithholdingRate) / 100;
      const withholdingAmount = grantVestingValue * electedRate;
      const actualTax = grantVestingValue * actualTaxRate;
      const gap = actualTax - withholdingAmount;

      totalVestingValue += grantVestingValue;
      totalWithholding += withholdingAmount;
      totalActualTax += actualTax;

      if (grantVestingValue > 0) {
        grantAnalyses.push({
          grantId: grant.id,
          ticker: grant.ticker,
          totalVestingValue: grantVestingValue,
          electedWithholding: withholdingAmount,
          electedRate: electedRate * 100,
          actualTaxLiability: actualTax,
          actualRate: actualTaxRate * 100,
          gap,
          gapPercent: grantVestingValue > 0 ? (gap / grantVestingValue) * 100 : 0,
          isUnderpaid: gap > 0,
          recommendedSupplemental: Math.max(0, gap),
          quarterlyPayment: Math.max(0, gap / 4)
        });
      }
    }

    const totalGap = totalActualTax - totalWithholding;

    return {
      grants: grantAnalyses,
      totals: {
        totalVestingValue,
        totalWithholding,
        totalActualTax,
        totalGap,
        effectiveWithholdingRate: totalVestingValue > 0 ? (totalWithholding / totalVestingValue) * 100 : 0,
        effectiveTaxRate: totalVestingValue > 0 ? (totalActualTax / totalVestingValue) * 100 : 0,
        quarterlyPayment: Math.max(0, totalGap / 4)
      }
    };
  }, [rsuGrants, client, customWithholdingRate]);

  if (rsuGrants.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <Calculator size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-slate-500 font-medium">No RSU grants found</p>
        <p className="text-slate-400 text-sm mt-1">Add RSU grants to analyze withholding</p>
      </div>
    );
  }

  if (!analysis.totals) return null;

  const gapChartData = analysis.grants.map(g => ({
    name: g.ticker,
    'Withheld': g.electedWithholding,
    'Additional Needed': Math.max(0, g.gap)
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-600 to-orange-500">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle size={20} />
          RSU Tax Withholding Optimizer
        </h3>
        <p className="text-sm text-red-100 mt-1">Flat withholding is often insufficient for high earners</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-slate-500" />
              <label className="text-sm font-bold text-slate-700">Elected Withholding Rate</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={customWithholdingRate}
                onChange={(e) => setCustomWithholdingRate(parseInt(e.target.value))}
                className="w-40 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tidemark-blue"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={customWithholdingRate}
                  onChange={(e) => setCustomWithholdingRate(Math.min(50, Math.max(10, parseInt(e.target.value) || 22)))}
                  className="w-16 px-2 py-1.5 text-center font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                />
                <span className="text-slate-500 font-medium">%</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 sm:ml-auto">
              {customWithholdingRate === 22 ? (
                <span>Standard supplemental rate</span>
              ) : customWithholdingRate < 22 ? (
                <span className="text-amber-600">Below standard rate</span>
              ) : (
                <span className="text-emerald-600">Higher withholding elected</span>
              )}
            </div>
          </div>
        </div>
        {analysis.totals.totalGap > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500 rounded-xl">
                <XCircle size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-red-800">Withholding Gap Detected</h4>
                <p className="text-sm text-red-700 mt-1">
                  Your RSU vesting will be under-withheld by <strong>{formatCurrency(analysis.totals.totalGap)}</strong> this year.
                  Consider making quarterly estimated payments to avoid penalties.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/80 rounded-lg p-3 border border-red-100">
                    <div className="text-xs font-bold text-slate-500 uppercase">RSU Income</div>
                    <div className="text-xl font-bold text-slate-800">{formatCurrency(analysis.totals.totalVestingValue)}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 border border-red-100">
                    <div className="text-xs font-bold text-slate-500 uppercase">Will Be Withheld</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(analysis.totals.totalWithholding)}</div>
                    <div className="text-xs text-slate-500">{formatPercent(analysis.totals.effectiveWithholdingRate / 100)}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 border border-red-100">
                    <div className="text-xs font-bold text-slate-500 uppercase">Actual Tax Owed</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(analysis.totals.totalActualTax)}</div>
                    <div className="text-xs text-slate-500">{formatPercent(analysis.totals.effectiveTaxRate / 100)}</div>
                  </div>
                  <div className="bg-red-100 rounded-lg p-3 border border-red-200">
                    <div className="text-xs font-bold text-red-800 uppercase">Gap to Cover</div>
                    <div className="text-xl font-bold text-red-700">{formatCurrency(analysis.totals.totalGap)}</div>
                    <div className="text-xs text-red-600">Quarterly: {formatCurrency(analysis.totals.quarterlyPayment)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {analysis.totals.totalGap <= 0 && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl">
                <CheckCircle size={28} className="text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-800">Withholding Adequate</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Your current withholding elections appear sufficient to cover your RSU tax liability.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Percent size={18} />
              Rate Comparison
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Elected Withholding Rate</span>
                  <span className="font-bold text-blue-600">{customWithholdingRate}%</span>
                </div>
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${customWithholdingRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Your Actual Tax Rate</span>
                  <span className="font-bold text-red-600">{formatPercent(analysis.totals.effectiveTaxRate / 100)}</span>
                </div>
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, analysis.totals.effectiveTaxRate)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Rate Difference</span>
                  <span className={`text-lg font-bold ${analysis.totals.effectiveTaxRate > customWithholdingRate ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {analysis.totals.effectiveTaxRate > customWithholdingRate ? '+' : ''}{formatPercent((analysis.totals.effectiveTaxRate - customWithholdingRate) / 100)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {analysis.totals.effectiveTaxRate > customWithholdingRate
                    ? `You're paying ${formatPercent((analysis.totals.effectiveTaxRate - customWithholdingRate) / 100)} more than your elected withholding covers`
                    : `Your elected withholding covers your tax liability`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">Withholding Gap by Grant</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="Withheld" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Additional Needed" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-600">Grant</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Vesting Value</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Elected Rate</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Withheld</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Actual Tax</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Gap</th>
                <th className="px-4 py-3 text-center font-bold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.grants.map((g) => (
                <tr key={g.grantId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-tidemark-navy">{g.ticker}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(g.totalVestingValue)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(g.electedRate / 100)}</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-600">{formatCurrency(g.electedWithholding)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(g.actualTaxLiability)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${g.isUnderpaid ? 'text-red-600' : 'text-emerald-600'}`}>
                    {g.isUnderpaid ? '+' : ''}{formatCurrency(g.gap)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {g.isUnderpaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        <XCircle size={12} /> Under
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        <CheckCircle size={12} /> OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <DollarSign size={18} />
            Recommended Actions
          </h4>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Increase withholding election to {formatPercent(Math.ceil(analysis.totals.effectiveTaxRate) / 100)} if your employer allows</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Make quarterly estimated payments of <strong>{formatCurrency(analysis.totals.quarterlyPayment)}</strong> (IRS Form 1040-ES)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Adjust W-4 to withhold additional federal tax from salary</span>
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>About Supplemental Withholding:</strong> The IRS allows employers to withhold a flat rate (commonly 22%) on supplemental wages including RSUs up to $1M.
          Some employers allow higher elections (e.g., 37%). High earners in states like California face combined marginal rates of 50%+.
          Any gap must be paid via estimated taxes or year-end filing.
        </div>
      </div>
    </div>
  );
};
