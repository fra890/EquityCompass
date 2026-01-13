import React, { useState, useMemo } from 'react';
import { Client, Grant } from '../types';
import { formatCurrency, formatNumber, formatPercent, calculateAMTRoom, getGrantStatus, getEffectiveRates } from '../utils/calculations';
import { Calendar, TrendingUp, ChevronRight, AlertTriangle, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MultiYearExerciseStrategyProps {
  client: Client;
  grants: Grant[];
}

interface YearPlan {
  year: number;
  amtRoom: number;
  plannedShares: number;
  plannedSpread: number;
  amtUsed: number;
  amtRemaining: number;
  exerciseCost: number;
  potentialTaxSavings: number;
}

export const MultiYearExerciseStrategy: React.FC<MultiYearExerciseStrategyProps> = ({ client, grants }) => {
  const isoGrants = grants.filter(g => g.type === 'ISO');
  const [selectedGrantId, setSelectedGrantId] = useState<string>(isoGrants[0]?.id || '');
  const [years, setYears] = useState<number>(3);

  const selectedGrant = isoGrants.find(g => g.id === selectedGrantId);
  const grantStatus = selectedGrant ? getGrantStatus(selectedGrant, client.plannedExercises || []) : null;

  const currentYear = new Date().getFullYear();
  const amtStats = useMemo(() => calculateAMTRoom(client), [client]);

  const spreadPerShare = selectedGrant ? Math.max(0, selectedGrant.currentPrice - (selectedGrant.strikePrice || 0)) : 0;
  const maxSafeSharesPerYear = spreadPerShare > 0 ? Math.floor(amtStats.room / spreadPerShare) : 0;

  const strategy = useMemo(() => {
    if (!selectedGrant || !grantStatus) return { yearPlans: [], totalSavings: 0, singleYearTax: 0, remainingShares: 0, maxTaxSavings: 0 };

    const availableShares = grantStatus.available;
    const { stateRate } = getEffectiveRates(client);
    const ordinaryRate = (client.taxBracket / 100) + stateRate;
    const ltcgRate = 0.20 + stateRate + 0.038;

    const totalSpread = availableShares * spreadPerShare;
    const singleYearOrdinaryTax = totalSpread * ordinaryRate;
    const qualifiedTax = totalSpread * ltcgRate;
    const maxTaxSavings = singleYearOrdinaryTax - qualifiedTax;

    const yearPlans: YearPlan[] = [];
    let remainingShares = availableShares;

    for (let i = 0; i < years && remainingShares > 0; i++) {
      const year = currentYear + i;
      const yearAmtRoom = amtStats.room;
      const sharesToExercise = Math.min(remainingShares, maxSafeSharesPerYear);
      const yearSpread = sharesToExercise * spreadPerShare;
      const exerciseCost = sharesToExercise * (selectedGrant.strikePrice || 0);

      const ordinaryTaxOnShares = yearSpread * ordinaryRate;
      const ltcgTaxOnShares = yearSpread * ltcgRate;
      const taxSavings = ordinaryTaxOnShares - ltcgTaxOnShares;

      yearPlans.push({
        year,
        amtRoom: yearAmtRoom,
        plannedShares: sharesToExercise,
        plannedSpread: yearSpread,
        amtUsed: yearSpread,
        amtRemaining: Math.max(0, yearAmtRoom - yearSpread),
        exerciseCost,
        potentialTaxSavings: taxSavings
      });

      remainingShares -= sharesToExercise;
    }

    const totalSavingsFromStrategy = yearPlans.reduce((sum, yp) => sum + yp.potentialTaxSavings, 0);

    return {
      yearPlans,
      totalSavings: totalSavingsFromStrategy,
      singleYearTax: singleYearOrdinaryTax,
      remainingShares,
      maxTaxSavings
    };
  }, [selectedGrant, grantStatus, client, years, amtStats.room, spreadPerShare, maxSafeSharesPerYear, currentYear]);

  if (isoGrants.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <Layers size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-slate-500 font-medium">No ISO grants found</p>
        <p className="text-slate-400 text-sm mt-1">Add ISO grants to use multi-year planning</p>
      </div>
    );
  }

  if (!selectedGrant || !grantStatus) return null;

  const chartData = strategy.yearPlans.map(yp => ({
    year: yp.year.toString(),
    'AMT Room': yp.amtRoom,
    'Planned Spread': yp.plannedSpread,
    'Remaining': yp.amtRemaining
  }));

  const timelineData = strategy.yearPlans.map((yp, i) => ({
    ...yp,
    isFirst: i === 0,
    isLast: i === strategy.yearPlans.length - 1
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-tidemark-navy to-tidemark-blue">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={20} />
          Multi-Year Exercise Strategy
        </h3>
        <p className="text-sm text-blue-200 mt-1">Optimize AMT by spreading exercises across tax years</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select ISO Grant</label>
            <select
              value={selectedGrantId}
              onChange={(e) => setSelectedGrantId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tidemark-blue outline-none"
            >
              {isoGrants.map(g => (
                <option key={g.id} value={g.id}>
                  {g.ticker} - {formatNumber(g.totalShares)} shares @ {formatCurrency(g.strikePrice || 0)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Planning Horizon</label>
            <select
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tidemark-blue outline-none"
            >
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
              <option value={4}>4 Years</option>
              <option value={5}>5 Years</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Available Shares</div>
            <div className="text-2xl font-bold text-slate-800">{formatNumber(grantStatus.available)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Current Spread/Share</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(spreadPerShare)}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-1">AMT-Safe Shares/Year</div>
            <div className="text-2xl font-bold text-emerald-700">{formatNumber(maxSafeSharesPerYear)}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-700 uppercase mb-1">Total Tax Savings</div>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(strategy.totalSavings)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white">
          <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" />
            Visual Exercise Timeline
          </h4>

          <div className="relative">
            <div className="absolute top-6 left-0 right-0 h-1 bg-slate-700 rounded-full"></div>

            <div className="relative flex justify-between">
              {timelineData.map((yp) => (
                <div key={yp.year} className="flex flex-col items-center relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                    yp.plannedShares > 0
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-400'
                  }`}>
                    {yp.year.toString().slice(-2)}
                  </div>

                  <div className="mt-4 text-center">
                    <div className="text-sm font-bold text-white">{formatNumber(yp.plannedShares)} shares</div>
                    <div className="text-xs text-slate-400">{formatCurrency(yp.plannedSpread)} spread</div>
                    <div className="text-xs text-emerald-400 mt-1">+{formatCurrency(yp.potentialTaxSavings)} saved</div>
                  </div>

                  {!yp.isLast && (
                    <div className="absolute top-5 left-full w-full flex items-center justify-center">
                      <ChevronRight size={20} className="text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {strategy.remainingShares > 0 && (
            <div className="mt-6 bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
              <AlertTriangle size={16} className="inline mr-2" />
              <strong>{formatNumber(strategy.remainingShares)} shares</strong> remain after {years} years. Consider extending your planning horizon.
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-4">AMT Utilization by Year</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="year" tick={{ fontSize: 12 }} width={50} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="Planned Spread" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Remaining" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-600">Year</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Shares</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Spread</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Exercise Cost</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">AMT Used</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Tax Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {strategy.yearPlans.map((yp) => (
                <tr key={yp.year} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-tidemark-navy">{yp.year}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatNumber(yp.plannedShares)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(yp.plannedSpread)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(yp.exerciseCost)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, (yp.amtUsed / yp.amtRoom) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatPercent(yp.amtUsed / yp.amtRoom)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">+{formatCurrency(yp.potentialTaxSavings)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{formatNumber(strategy.yearPlans.reduce((s, yp) => s + yp.plannedShares, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(strategy.yearPlans.reduce((s, yp) => s + yp.plannedSpread, 0))}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(strategy.yearPlans.reduce((s, yp) => s + yp.exerciseCost, 0))}</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-emerald-600">+{formatCurrency(strategy.totalSavings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Strategy Recommendation:</strong> By spreading your {formatNumber(grantStatus.available)} available ISO shares across {years} tax years,
          you can exercise up to <strong>{formatNumber(maxSafeSharesPerYear)} shares per year</strong> without triggering AMT.
          This preserves <strong>{formatCurrency(strategy.totalSavings)}</strong> in tax savings compared to exercising all shares in a single year.
        </div>
      </div>
    </div>
  );
};
