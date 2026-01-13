import React, { useState, useMemo } from 'react';
import { Client, Grant } from '../types';
import { formatCurrency, formatPercent, formatNumber, getGrantStatus } from '../utils/calculations';
import { AlertTriangle, Shield, PieChart, Target, AlertCircle } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ConcentrationRiskDashboardProps {
  client: Client;
  grants: Grant[];
}

interface StockConcentration {
  ticker: string;
  companyName: string;
  totalValue: number;
  percentage: number;
  shares: number;
  grantTypes: string[];
}

const RISK_THRESHOLDS = {
  low: 10,
  moderate: 25,
  high: 50,
  extreme: 75
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

export const ConcentrationRiskDashboard: React.FC<ConcentrationRiskDashboardProps> = ({ client, grants }) => {
  const [estimatedNetWorth, setEstimatedNetWorth] = useState<number>(1000000);
  const [otherInvestments, setOtherInvestments] = useState<number>(500000);

  const analysis = useMemo(() => {
    const stockMap = new Map<string, StockConcentration>();

    for (const grant of grants) {
      const status = getGrantStatus(grant, client.plannedExercises || []);
      let grantValue = 0;
      let shares = 0;

      if (grant.type === 'ISO' || grant.type === 'NSO') {
        const spread = Math.max(0, grant.currentPrice - (grant.strikePrice || 0));
        grantValue = spread * status.available;
        shares = status.available;
      } else {
        shares = grant.customHeldShares ?? status.vestedTotal;
        grantValue = shares * grant.currentPrice;
      }

      const existing = stockMap.get(grant.ticker);
      if (existing) {
        existing.totalValue += grantValue;
        existing.shares += shares;
        if (!existing.grantTypes.includes(grant.type)) {
          existing.grantTypes.push(grant.type);
        }
      } else {
        stockMap.set(grant.ticker, {
          ticker: grant.ticker,
          companyName: grant.companyName,
          totalValue: grantValue,
          percentage: 0,
          shares,
          grantTypes: [grant.type]
        });
      }
    }

    const totalEquityValue = Array.from(stockMap.values()).reduce((sum, s) => sum + s.totalValue, 0);
    const totalPortfolio = totalEquityValue + otherInvestments;

    const concentrations = Array.from(stockMap.values())
      .map(s => ({
        ...s,
        percentage: totalPortfolio > 0 ? (s.totalValue / totalPortfolio) * 100 : 0,
        percentOfEquity: totalEquityValue > 0 ? (s.totalValue / totalEquityValue) * 100 : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const maxConcentration = Math.max(...concentrations.map(c => c.percentage), 0);
    const equityPercentOfNetWorth = estimatedNetWorth > 0 ? (totalEquityValue / estimatedNetWorth) * 100 : 0;

    let riskLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
    if (maxConcentration >= RISK_THRESHOLDS.extreme) riskLevel = 'extreme';
    else if (maxConcentration >= RISK_THRESHOLDS.high) riskLevel = 'high';
    else if (maxConcentration >= RISK_THRESHOLDS.moderate) riskLevel = 'moderate';

    return {
      concentrations,
      totalEquityValue,
      totalPortfolio,
      maxConcentration,
      equityPercentOfNetWorth,
      riskLevel,
      largestPosition: concentrations[0] || null
    };
  }, [grants, client, otherInvestments, estimatedNetWorth]);

  const pieData = analysis.concentrations.map((c) => ({
    name: c.ticker,
    value: c.totalValue,
    percentage: c.percentage
  }));

  if (otherInvestments > 0) {
    pieData.push({
      name: 'Other Investments',
      value: otherInvestments,
      percentage: analysis.totalPortfolio > 0 ? (otherInvestments / analysis.totalPortfolio) * 100 : 0
    });
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'emerald';
      case 'moderate': return 'amber';
      case 'high': return 'orange';
      case 'extreme': return 'red';
      default: return 'slate';
    }
  };

  const riskColor = getRiskColor(analysis.riskLevel);

  const gaugeAngle = Math.min(180, (analysis.maxConcentration / 100) * 180);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <PieChart size={20} />
          Concentration Risk Dashboard
        </h3>
        <p className="text-sm text-slate-300 mt-1">Equity compensation as percentage of total portfolio</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Estimated Net Worth</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                value={estimatedNetWorth}
                onChange={(e) => setEstimatedNetWorth(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tidemark-blue outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Other Investments</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                value={otherInvestments}
                onChange={(e) => setOtherInvestments(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tidemark-blue outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">401k, IRA, brokerage, etc.</p>
          </div>
        </div>

        <div className={`bg-gradient-to-br from-${riskColor}-50 to-${riskColor}-100 rounded-xl p-6 border border-${riskColor}-200`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {analysis.riskLevel === 'low' && <Shield size={32} className="text-emerald-600" />}
              {analysis.riskLevel === 'moderate' && <AlertCircle size={32} className="text-amber-600" />}
              {analysis.riskLevel === 'high' && <AlertTriangle size={32} className="text-orange-600" />}
              {analysis.riskLevel === 'extreme' && <AlertTriangle size={32} className="text-red-600" />}
              <div>
                <h4 className={`text-lg font-bold text-${riskColor}-800 uppercase`}>
                  {analysis.riskLevel} Concentration Risk
                </h4>
                <p className={`text-sm text-${riskColor}-600`}>
                  {analysis.largestPosition
                    ? `${analysis.largestPosition.ticker} represents ${formatPercent(analysis.maxConcentration / 100)} of portfolio`
                    : 'No positions detected'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className={`text-4xl font-bold text-${riskColor}-700`}>
                {formatPercent(analysis.maxConcentration / 100)}
              </div>
              <div className="text-xs text-slate-500">Max Single Stock</div>
            </div>
          </div>

          <div className="relative h-32 flex items-center justify-center">
            <svg viewBox="0 0 200 100" className="w-64 h-32">
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke={
                  analysis.riskLevel === 'low' ? '#10b981' :
                  analysis.riskLevel === 'moderate' ? '#f59e0b' :
                  analysis.riskLevel === 'high' ? '#f97316' : '#ef4444'
                }
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${gaugeAngle * 1.6} 1000`}
              />
              <text x="100" y="85" textAnchor="middle" className="text-2xl font-bold fill-slate-800">
                {formatPercent(analysis.maxConcentration / 100)}
              </text>
            </svg>
          </div>

          <div className="flex justify-between text-xs text-slate-500 mt-2 px-4">
            <span>0% (Diversified)</span>
            <span>50% (High Risk)</span>
            <span>100% (All-In)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">Portfolio Composition</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${formatPercent(percentage / 100)}`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">Position Summary</h4>
            <div className="space-y-3">
              {analysis.concentrations.slice(0, 5).map((c, i) => (
                <div key={c.ticker} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  ></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-800">{c.ticker}</span>
                      <span className="font-bold text-slate-700">{formatPercent(c.percentage / 100)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{formatNumber(c.shares)} shares</span>
                      <span>{formatCurrency(c.totalValue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-xs font-bold text-blue-700 uppercase mb-1">Total Equity Comp Value</div>
            <div className="text-2xl font-bold text-blue-800">{formatCurrency(analysis.totalEquityValue)}</div>
            <div className="text-xs text-blue-600 mt-1">{formatPercent(analysis.equityPercentOfNetWorth / 100)} of net worth</div>
          </div>
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Portfolio</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(analysis.totalPortfolio)}</div>
            <div className="text-xs text-slate-600 mt-1">Equity + Other Investments</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-700 uppercase mb-1">Diversification Target</div>
            <div className="text-2xl font-bold text-amber-800">
              {formatCurrency(Math.max(0, analysis.totalEquityValue - (analysis.totalPortfolio * 0.10)))}
            </div>
            <div className="text-xs text-amber-600 mt-1">Amount to diversify to reach 10%</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-600">Stock</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600">Company</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Shares</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Value</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">% Portfolio</th>
                <th className="px-4 py-3 text-center font-bold text-slate-600">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.concentrations.map((c) => {
                let positionRisk: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
                if (c.percentage >= RISK_THRESHOLDS.extreme) positionRisk = 'extreme';
                else if (c.percentage >= RISK_THRESHOLDS.high) positionRisk = 'high';
                else if (c.percentage >= RISK_THRESHOLDS.moderate) positionRisk = 'moderate';

                return (
                  <tr key={c.ticker} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-tidemark-navy">{c.ticker}</td>
                    <td className="px-4 py-3 text-slate-600">{c.companyName}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatNumber(c.shares)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.totalValue)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatPercent(c.percentage / 100)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                        positionRisk === 'low' ? 'bg-emerald-100 text-emerald-700' :
                        positionRisk === 'moderate' ? 'bg-amber-100 text-amber-700' :
                        positionRisk === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {positionRisk.charAt(0).toUpperCase() + positionRisk.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Target size={18} />
            Diversification Guidelines
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="font-medium text-emerald-700">Low Risk (&lt;10%)</span>
              </div>
              <p className="text-slate-600 ml-5">Well-diversified position</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="font-medium text-amber-700">Moderate Risk (10-25%)</span>
              </div>
              <p className="text-slate-600 ml-5">Consider reducing exposure over time</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="font-medium text-orange-700">High Risk (25-50%)</span>
              </div>
              <p className="text-slate-600 ml-5">Significant single-stock risk</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-medium text-red-700">Extreme Risk (&gt;50%)</span>
              </div>
              <p className="text-slate-600 ml-5">Portfolio highly dependent on one stock</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
