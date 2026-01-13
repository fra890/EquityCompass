import React, { useMemo } from 'react';
import { Client, Grant } from '../types';
import { formatCurrency, formatPercent, getEffectiveRates, generateVestingSchedule, calculateAMTRoom } from '../utils/calculations';
import { Calendar, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface QuarterlyEstimatedTaxCalculatorProps {
  client: Client;
  grants: Grant[];
}

interface QuarterlyBreakdown {
  quarter: string;
  dueDate: string;
  vestingIncome: number;
  isoSpread: number;
  totalIncome: number;
  estimatedTax: number;
  withholdingCredit: number;
  paymentDue: number;
  isPast: boolean;
  events: { date: string; type: string; amount: number }[];
}

const QUARTERLY_DATES = [
  { quarter: 'Q1', due: 'April 15', months: [0, 1, 2] },
  { quarter: 'Q2', due: 'June 15', months: [3, 4, 5] },
  { quarter: 'Q3', due: 'September 15', months: [6, 7, 8] },
  { quarter: 'Q4', due: 'January 15 (next year)', months: [9, 10, 11] }
];

export const QuarterlyEstimatedTaxCalculator: React.FC<QuarterlyEstimatedTaxCalculatorProps> = ({ client, grants }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const { stateRate } = getEffectiveRates(client);
  const fedRate = client.taxBracket / 100;
  const niitRate = 0.038;
  const totalRate = fedRate + stateRate + niitRate;

  const amtStats = useMemo(() => calculateAMTRoom(client), [client]);

  const quarterlyData = useMemo(() => {
    const quarters: QuarterlyBreakdown[] = [];

    for (const q of QUARTERLY_DATES) {
      let vestingIncome = 0;
      let isoSpread = 0;
      let withholdingCredit = 0;
      const events: { date: string; type: string; amount: number }[] = [];

      for (const grant of grants) {
        const schedule = generateVestingSchedule(grant, client);
        const quarterEvents = schedule.filter(e => {
          const eventDate = new Date(e.date);
          const eventYear = eventDate.getFullYear();
          const eventMonth = eventDate.getMonth();
          return eventYear === currentYear && q.months.includes(eventMonth);
        });

        for (const event of quarterEvents) {
          if (grant.type === 'RSU') {
            vestingIncome += event.grossValue;
            withholdingCredit += event.withholdingAmount;
            events.push({
              date: event.date,
              type: 'RSU Vest',
              amount: event.grossValue
            });
          } else if (grant.type === 'ISO') {
            const spread = Math.max(0, event.priceAtVest - (grant.strikePrice || 0)) * event.shares;
            if (spread > 0) {
              events.push({
                date: event.date,
                type: 'ISO Vest (potential)',
                amount: spread
              });
            }
          } else if (grant.type === 'ESPP') {
            vestingIncome += event.grossValue;
            events.push({
              date: event.date,
              type: 'ESPP Purchase',
              amount: event.grossValue
            });
          }
        }
      }

      const plannedExercises = client.plannedExercises?.filter(ex => {
        const exDate = new Date(ex.exerciseDate);
        const exYear = exDate.getFullYear();
        const exMonth = exDate.getMonth();
        return exYear === currentYear && q.months.includes(exMonth) && ex.type === 'ISO';
      }) || [];

      for (const ex of plannedExercises) {
        isoSpread += ex.amtExposure;
        events.push({
          date: ex.exerciseDate,
          type: 'ISO Exercise',
          amount: ex.amtExposure
        });
      }

      const totalIncome = vestingIncome;
      const estimatedTax = totalIncome * totalRate;

      const amtTax = isoSpread > amtStats.room ? (isoSpread - amtStats.room) * 0.28 : 0;

      const paymentDue = Math.max(0, estimatedTax + amtTax - withholdingCredit);

      const isPast = q.months[2] < currentMonth;

      quarters.push({
        quarter: q.quarter,
        dueDate: q.due,
        vestingIncome,
        isoSpread,
        totalIncome,
        estimatedTax: estimatedTax + amtTax,
        withholdingCredit,
        paymentDue,
        isPast,
        events: events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      });
    }

    return quarters;
  }, [grants, client, currentYear, currentMonth, totalRate, amtStats.room]);

  const totals = useMemo(() => {
    return {
      totalIncome: quarterlyData.reduce((sum, q) => sum + q.totalIncome, 0),
      totalIsoSpread: quarterlyData.reduce((sum, q) => sum + q.isoSpread, 0),
      totalTax: quarterlyData.reduce((sum, q) => sum + q.estimatedTax, 0),
      totalWithholding: quarterlyData.reduce((sum, q) => sum + q.withholdingCredit, 0),
      totalPayments: quarterlyData.reduce((sum, q) => sum + q.paymentDue, 0),
      upcomingPayments: quarterlyData.filter(q => !q.isPast).reduce((sum, q) => sum + q.paymentDue, 0)
    };
  }, [quarterlyData]);

  const chartData = quarterlyData.map(q => ({
    quarter: q.quarter,
    'RSU/ESPP Income': q.vestingIncome,
    'ISO Spread': q.isoSpread,
    'Payment Due': q.paymentDue
  }));

  const nextQuarter = quarterlyData.find(q => !q.isPast);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={20} />
          Quarterly Estimated Tax Calculator
        </h3>
        <p className="text-sm text-blue-200 mt-1">Calculate quarterly payments to avoid underpayment penalties</p>
      </div>

      <div className="p-6 space-y-6">
        {nextQuarter && nextQuarter.paymentDue > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500 rounded-xl">
                <Clock size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-amber-800">Next Payment Due</h4>
                <p className="text-sm text-amber-700 mt-1">
                  <strong>{nextQuarter.quarter} {currentYear}</strong> payment of <strong>{formatCurrency(nextQuarter.paymentDue)}</strong> is due by <strong>{nextQuarter.dueDate}</strong>
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white/80 rounded-lg p-3 border border-amber-100">
                    <div className="text-xs font-bold text-slate-500 uppercase">Vesting Income</div>
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(nextQuarter.vestingIncome)}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 border border-amber-100">
                    <div className="text-xs font-bold text-slate-500 uppercase">Est. Tax</div>
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(nextQuarter.estimatedTax)}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 border border-amber-100">
                    <div className="text-xs font-bold text-slate-500 uppercase">Withholding</div>
                    <div className="text-lg font-bold text-blue-600">-{formatCurrency(nextQuarter.withholdingCredit)}</div>
                  </div>
                  <div className="bg-amber-100 rounded-lg p-3 border border-amber-200">
                    <div className="text-xs font-bold text-amber-800 uppercase">Payment Due</div>
                    <div className="text-lg font-bold text-amber-700">{formatCurrency(nextQuarter.paymentDue)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {nextQuarter && nextQuarter.paymentDue <= 0 && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl">
                <CheckCircle size={28} className="text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-800">No Payment Due for {nextQuarter.quarter}</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Your withholding appears sufficient to cover the estimated tax for this quarter.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total {currentYear} Income</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalIncome)}</div>
            <div className="text-xs text-slate-500 mt-1">From equity compensation</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Tax Liability</div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalTax)}</div>
            <div className="text-xs text-slate-500 mt-1">At {formatPercent(totalRate)} effective rate</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-xs font-bold text-blue-700 uppercase mb-1">Total Withholding</div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totals.totalWithholding)}</div>
            <div className="text-xs text-blue-600 mt-1">Automatically withheld</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-700 uppercase mb-1">Remaining Payments</div>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(totals.upcomingPayments)}</div>
            <div className="text-xs text-amber-600 mt-1">Due via estimated payments</div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-4">Quarterly Payment Schedule</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="RSU/ESPP Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ISO Spread" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Payment Due" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-600">Quarter</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600">Due Date</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Vesting Income</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">ISO Spread</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Est. Tax</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Withholding</th>
                <th className="px-4 py-3 text-right font-bold text-slate-600">Payment Due</th>
                <th className="px-4 py-3 text-center font-bold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quarterlyData.map((q) => (
                <tr key={q.quarter} className={`hover:bg-slate-50 ${q.isPast ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-bold text-tidemark-navy">{q.quarter} {currentYear}</td>
                  <td className="px-4 py-3 text-slate-600">{q.dueDate}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(q.vestingIncome)}</td>
                  <td className="px-4 py-3 text-right font-mono text-purple-600">{formatCurrency(q.isoSpread)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(q.estimatedTax)}</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-600">-{formatCurrency(q.withholdingCredit)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${q.paymentDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(q.paymentDue)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {q.isPast ? (
                      <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                        Past
                      </span>
                    ) : q.paymentDue > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        Covered
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totals.totalIncome)}</td>
                <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(totals.totalIsoSpread)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totals.totalTax)}</td>
                <td className="px-4 py-3 text-right text-blue-600">-{formatCurrency(totals.totalWithholding)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(totals.totalPayments)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <FileText size={18} />
              Payment Methods
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span><strong>IRS Direct Pay:</strong> Pay online at irs.gov/payments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span><strong>Form 1040-ES:</strong> Mail a check with payment voucher</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span><strong>EFTPS:</strong> Electronic Federal Tax Payment System</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} />
              Penalty Avoidance
            </h4>
            <p className="text-sm text-amber-800">
              To avoid underpayment penalties, you must pay at least <strong>90%</strong> of your current year tax
              or <strong>100%</strong> of your prior year tax (110% if AGI &gt; $150k) through withholding and estimated payments.
            </p>
          </div>
        </div>

        {quarterlyData.some(q => q.events.length > 0) && (
          <details className="group">
            <summary className="bg-slate-100 rounded-xl p-4 cursor-pointer hover:bg-slate-200 transition-colors flex items-center justify-between">
              <span className="font-bold text-tidemark-navy">View Detailed Events Timeline</span>
              <span className="text-xs text-slate-500 group-open:hidden">Click to expand</span>
            </summary>
            <div className="bg-slate-50 rounded-b-xl p-4 -mt-2 border border-slate-200 border-t-0">
              {quarterlyData.map(q => (
                q.events.length > 0 && (
                  <div key={q.quarter} className="mb-4 last:mb-0">
                    <h5 className="font-bold text-slate-700 mb-2">{q.quarter} {currentYear}</h5>
                    <div className="space-y-1">
                      {q.events.map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 px-2 bg-white rounded border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{new Date(e.date).toLocaleDateString()}</span>
                            <span className="font-medium text-slate-700">{e.type}</span>
                          </div>
                          <span className="font-mono text-slate-600">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
