import React, { useState, useMemo } from 'react';
import { Client, Grant } from '../types';
import { formatCurrency, formatPercent, getEffectiveRates, calculateISOScenarios } from '../utils/calculations';
import { TrendingDown, AlertTriangle, Shield, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';

interface BreakevenAnalysisProps {
  client: Client;
  grant: Grant;
  sharesToExercise: number;
}

interface ScenarioPoint {
  priceDecline: number;
  stockPrice: number;
  sellNowNet: number;
  holdNet: number;
  difference: number;
  label: string;
}

export const BreakevenAnalysis: React.FC<BreakevenAnalysisProps> = ({ client, grant, sharesToExercise }) => {
  const [showDetails, setShowDetails] = useState(false);

  const currentPrice = grant.currentPrice;
  const strikePrice = grant.strikePrice || 0;
  const spread = currentPrice - strikePrice;

  const { stateRate, fedLtcgRate } = getEffectiveRates(client);
  const ordinaryRate = (client.taxBracket / 100) + stateRate + 0.038;
  const ltcgRate = fedLtcgRate + stateRate + 0.038;

  const analysis = useMemo(() => {
    if (sharesToExercise <= 0 || spread <= 0) {
      return { breakevenPrice: 0, breakevenDecline: 0, scenarios: [], taxSavingsAtCurrent: 0 };
    }

    const sellNowScenario = calculateISOScenarios(
      sharesToExercise,
      strikePrice,
      currentPrice,
      currentPrice,
      client,
      false
    );

    const holdScenario = calculateISOScenarios(
      sharesToExercise,
      strikePrice,
      currentPrice,
      currentPrice,
      client,
      true
    );

    const taxSavingsAtCurrent = holdScenario.netProfit - sellNowScenario.netProfit;

    let breakevenPrice = strikePrice;
    const step = 0.5;

    for (let testPrice = currentPrice; testPrice >= strikePrice; testPrice -= step) {
      const sellNowNet = (currentPrice - strikePrice) * sharesToExercise * (1 - ordinaryRate);

      const futureSaleProceeds = testPrice * sharesToExercise;
      const exerciseCost = strikePrice * sharesToExercise;
      const capitalGain = Math.max(0, futureSaleProceeds - exerciseCost);
      const holdNet = capitalGain * (1 - ltcgRate);

      if (sellNowNet >= holdNet) {
        breakevenPrice = testPrice;
        break;
      }
    }

    const breakevenDecline = currentPrice > 0 ? ((currentPrice - breakevenPrice) / currentPrice) * 100 : 0;

    const scenarios: ScenarioPoint[] = [];
    const declineSteps = [0, 5, 10, 15, 20, 25, 30, 40, 50];

    for (const decline of declineSteps) {
      const futurePrice = currentPrice * (1 - decline / 100);
      if (futurePrice < strikePrice) continue;

      const sellNowNet = (currentPrice - strikePrice) * sharesToExercise * (1 - ordinaryRate);

      const futureSaleProceeds = futurePrice * sharesToExercise;
      const exerciseCost = strikePrice * sharesToExercise;
      const capitalGain = Math.max(0, futureSaleProceeds - exerciseCost);
      const holdNet = capitalGain * (1 - ltcgRate);

      scenarios.push({
        priceDecline: decline,
        stockPrice: futurePrice,
        sellNowNet,
        holdNet,
        difference: holdNet - sellNowNet,
        label: `-${decline}%`
      });
    }

    return { breakevenPrice, breakevenDecline, scenarios, taxSavingsAtCurrent };
  }, [sharesToExercise, currentPrice, strikePrice, client, ordinaryRate, ltcgRate, spread]);

  if (sharesToExercise <= 0 || spread <= 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
        <TrendingDown size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-slate-500">Enter shares to exercise to see breakeven analysis</p>
      </div>
    );
  }

  const chartData = analysis.scenarios.map(s => ({
    name: s.label,
    'Sell Now': Math.round(s.sellNowNet),
    'Hold & Sell Later': Math.round(s.holdNet),
    price: s.stockPrice
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-900">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingDown size={20} />
          Breakeven Analysis
        </h3>
        <p className="text-sm text-slate-400 mt-1">What stock price decline eliminates the tax benefit of holding?</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase">Tax Savings at Current Price</span>
            </div>
            <div className="text-3xl font-bold text-emerald-700">{formatCurrency(analysis.taxSavingsAtCurrent)}</div>
            <p className="text-xs text-emerald-600 mt-1">By holding for LTCG treatment</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-800 uppercase">Breakeven Price</span>
            </div>
            <div className="text-3xl font-bold text-amber-700">{formatCurrency(analysis.breakevenPrice)}</div>
            <p className="text-xs text-amber-600 mt-1">
              {formatPercent(analysis.breakevenDecline / 100)} decline from {formatCurrency(currentPrice)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-800 uppercase">Downside Buffer</span>
            </div>
            <div className="text-3xl font-bold text-blue-700">{formatPercent(analysis.breakevenDecline / 100)}</div>
            <p className="text-xs text-blue-600 mt-1">Stock can drop before selling now is better</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Net Proceeds by Scenario</h4>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-slate-600">Sell Now (Ordinary Income)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">Hold & Sell (LTCG)</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Stock Price Decline', position: 'insideBottom', offset: -5, fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <ReferenceLine
                  x={`-${Math.round(analysis.breakevenDecline)}%`}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: 'Breakeven', position: 'top', fontSize: 10, fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="Sell Now"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Hold & Sell Later"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-tidemark-blue hover:text-tidemark-navy transition-colors"
        >
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showDetails ? 'Hide' : 'Show'} Detailed Scenario Table
        </button>

        {showDetails && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600">Price Decline</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Future Price</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Sell Now Net</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Hold Net</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.scenarios.map((s, i) => (
                  <tr key={i} className={s.difference < 0 ? 'bg-red-50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3 font-medium">{s.label}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.stockPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">{formatCurrency(s.sellNowNet)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(s.holdNet)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${s.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {s.difference >= 0 ? '+' : ''}{formatCurrency(s.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Key Insight:</strong> The stock can decline up to <strong>{formatPercent(analysis.breakevenDecline / 100)}</strong> (to {formatCurrency(analysis.breakevenPrice)})
          before selling immediately becomes more profitable than holding for long-term capital gains treatment.
          This "downside buffer" represents your tax advantage cushion.
        </div>
      </div>
    </div>
  );
};
