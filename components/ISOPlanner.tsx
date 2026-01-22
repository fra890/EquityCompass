import React, { useState, useEffect, useMemo } from 'react';
import { Client, Grant, PlannedExercise } from '../types';
import { calculateISOScenarios, formatCurrency, formatPercent, getGrantStatus, formatNumber, calculateAMTRoom, getEffectiveRates, generateVestingSchedule, getQuarterlyProjections, calculateISOQualification } from '../utils/calculations';
import { Info, CheckCircle, Save, TrendingUp, Lock, Unlock, AlertTriangle, Wallet, ArrowRight, DollarSign, CalendarClock, Zap, Target, PenLine, Calendar, Download } from 'lucide-react';
import { Button } from './Button';
import { generateISOComparisonPDF } from '../utils/pdfGenerator';
import { BreakevenAnalysis } from './BreakevenAnalysis';

interface ISOPlannerProps {
  client: Client;
  grants: Grant[];
  onSavePlan: (plan: PlannedExercise) => void;
}

type StrategyMode = 'buy_hold' | 'cashless';

export const ISOPlanner: React.FC<ISOPlannerProps> = ({ client, grants, onSavePlan }) => {
  const isoGrants = grants.filter(g => g.type === 'ISO');
  const [selectedGrantId, setSelectedGrantId] = useState<string>(isoGrants[0]?.id || '');
  const [sharesToExercise, setSharesToExercise] = useState<number>(0);
  const [futurePrice, setFuturePrice] = useState<number>(0);
  const [isSaved, setIsSaved] = useState(false);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>('buy_hold');

  const selectedGrant = isoGrants.find(g => g.id === selectedGrantId);

  // Stats for the specific selected grant
  const grantStatus = useMemo(() => {
     if (!selectedGrant) return null;
     return getGrantStatus(selectedGrant, client.plannedExercises || []);
  }, [selectedGrant, client.plannedExercises]);

  // Calculate 12-month projected ISO shares becoming exercisable
  const projected12MonthISO = useMemo(() => {
    return isoGrants.reduce((total, grant) => {
      const schedule = generateVestingSchedule(grant, client);
      const upcomingEvents = getQuarterlyProjections(schedule);
      const isoEvents = upcomingEvents.filter(e => e.grantType === 'ISO');
      return total + isoEvents.reduce((sum, e) => sum + e.shares, 0);
    }, 0);
  }, [isoGrants, client]);

  useEffect(() => {
    if (selectedGrant && grantStatus) {
        setFuturePrice(selectedGrant.currentPrice * 1.1);
        // Default to remaining available, capped at 1000 or full available
        const defaultShares = Math.min(1000, grantStatus.available);
        setSharesToExercise(defaultShares > 0 ? defaultShares : 0);
    }
  }, [selectedGrant?.id, grantStatus?.available]); 

  // AMT Optimization Logic
  const amtStats = useMemo(() => calculateAMTRoom(client), [client]);
  const currentSpread = selectedGrant ? (selectedGrant.currentPrice - (selectedGrant.strikePrice || 0)) * sharesToExercise : 0;
  const isAmtDanger = currentSpread > amtStats.room;

  // Max Safe Shares Calculation
  const spreadPerShare = selectedGrant ? Math.max(0, selectedGrant.currentPrice - (selectedGrant.strikePrice || 0)) : 0;
  const maxSafeShares = spreadPerShare > 0 ? Math.floor(amtStats.room / spreadPerShare) : 0;
  
  // Cap max safe shares at available shares
  const actionableMaxSafeShares = grantStatus ? Math.min(maxSafeShares, grantStatus.available) : 0;

  const handleSave = () => {
    if (!selectedGrant) return;
    if (sharesToExercise > (grantStatus?.available || 0)) {
        alert("You cannot exercise more shares than are currently available.");
        return;
    }

    // For cashless, the exercise price is effectively paid by sale, but we still record the event
    const plan: PlannedExercise = {
        id: crypto.randomUUID(),
        grantId: selectedGrant.id,
        grantTicker: selectedGrant.ticker,
        shares: sharesToExercise,
        exerciseDate: new Date().toISOString().split('T')[0],
        exercisePrice: selectedGrant.strikePrice || 0,
        fmvAtExercise: selectedGrant.currentPrice,
        type: 'ISO',
        // If cashless, AMT exposure is technically 0 because it's a disqualifying disposition in same year
        // But we track the spread for record keeping.
        amtExposure: strategyMode === 'buy_hold' ? (selectedGrant.currentPrice - (selectedGrant.strikePrice || 0)) * sharesToExercise : 0,
        estimatedCost: sharesToExercise * (selectedGrant.strikePrice || 0)
    };
    onSavePlan(plan);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (isoGrants.length === 0) {
    return (
        <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <h3 className="text-slate-500 font-medium">No ISO Grants found for this client.</h3>
            <p className="text-slate-400 text-sm mt-1">Add an ISO/Option grant to use the planning tools.</p>
        </div>
    );
  }

  if (!selectedGrant || !grantStatus) return null;

  // --- Calculations for Buy & Hold ---
  // Use the projected sale price for comparison
  const salePrice = futurePrice > 0 ? futurePrice : selectedGrant.currentPrice;

  // Disqualified scenario (sell immediately at projected price)
  const disqualifiedScenario = calculateISOScenarios(
      sharesToExercise,
      selectedGrant.strikePrice || 0,
      selectedGrant.currentPrice,
      salePrice,
      client,
      false
  );

  // Qualified scenario: same sale price to show pure tax difference
  const equalQualifiedScenario = calculateISOScenarios(
      sharesToExercise,
      selectedGrant.strikePrice || 0,
      selectedGrant.currentPrice,
      salePrice,
      client,
      true
  );

  // --- Calculations for Cashless ---
  const { stateRate } = getEffectiveRates(client);
  const totalProceeds = sharesToExercise * selectedGrant.currentPrice;
  const totalCost = sharesToExercise * (selectedGrant.strikePrice || 0);
  const grossProfit = totalProceeds - totalCost;
  // Cashless is always Ordinary Income (Disqualified)
  const estimatedTaxRate = (client.taxBracket / 100) + stateRate;
  const estimatedTaxes = grossProfit * estimatedTaxRate;
  const netCash = grossProfit - estimatedTaxes;

  const inputClass = "w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-tidemark-blue outline-none font-medium";

  return (
    <div className="space-y-6 animate-fade-in">
        {/* All ISO Grants Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-bold text-tidemark-navy flex items-center gap-2">
                    <Target size={20} />
                    All ISO Grants
                </h3>
                <p className="text-sm text-slate-500 mt-1">Detailed breakdown of all ISO/Option grants</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Grant Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Grant ID</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Shares</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Available</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Unvested</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Strike Price</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Current Price</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Spread</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {isoGrants.map((grant) => {
                            const status = getGrantStatus(grant, client.plannedExercises || []);
                            const spread = (grant.currentPrice - (grant.strikePrice || 0)) * status.available;
                            const totalSpread = (grant.currentPrice - (grant.strikePrice || 0)) * grant.totalShares;
                            const statusText = status.vestedTotal === status.total ? 'Fully Vested' :
                                status.vestedTotal > 0 ? 'Partially Vested' : 'Not Vested';
                            const today = new Date().toISOString().split('T')[0];
                            const qualification = calculateISOQualification(grant.grantDate, today);

                            return (
                                <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                                        {new Date(grant.grantDate).toLocaleDateString()}
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            {qualification.isQualified ? `Qualified since ${new Date(qualification.qualifyingDate).toLocaleDateString()}` : `Qualifies ${new Date(qualification.qualifyingDate).toLocaleDateString()}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-900">{grant.companyName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                        {grant.externalGrantId || grant.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-600">
                                        {formatNumber(grant.totalShares)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-tidemark-blue font-medium">
                                        {formatNumber(status.available)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-400">
                                        {formatNumber(status.unvested)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-600">
                                        {formatCurrency(grant.strikePrice || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-900 font-medium">
                                        {formatCurrency(grant.currentPrice || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-emerald-700">
                                        {formatCurrency(totalSpread)}
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                            Available: {formatCurrency(spread)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            statusText === 'Fully Vested' ? 'bg-emerald-50 text-emerald-700' :
                                            statusText === 'Partially Vested' ? 'bg-blue-50 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {statusText}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setSelectedGrantId(grant.id)}
                                            className="text-tidemark-blue hover:text-tidemark-navy transition-colors font-medium text-xs"
                                        >
                                            Plan Exercise
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            
            {/* Top Bar with Detailed Share Counts */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                <div>
                    <h3 className="text-lg font-bold text-tidemark-navy flex items-center gap-2">
                        ISO Exercise Modeler
                    </h3>
                    <p className="text-sm text-slate-500">Plan execution strategy for your options.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200 text-xs text-slate-500" title="Total shares granted but not yet vested">
                        <Lock size={14} className="text-slate-400" />
                        Unvested: <span className="font-bold text-slate-700">{formatNumber(grantStatus.unvested)}</span>
                    </div>
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-tidemark-blue/10 rounded-md border border-tidemark-blue/20 text-xs text-tidemark-navy" title="Shares vested and ready to exercise">
                        <Unlock size={14} className="text-tidemark-blue" />
                        Available: <span className="font-bold text-tidemark-blue text-sm">{formatNumber(grantStatus.available)}</span>
                    </div>
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-md border border-amber-200 text-xs text-amber-700" title="ISO shares becoming exercisable in the next 12 months">
                        <Calendar size={14} className="text-amber-600" />
                        12-Mo Projection: <span className="font-bold text-amber-700">{formatNumber(projected12MonthISO)}</span>
                    </div>
                </div>
            </div>

            {/* Strategy Toggle */}
            <div className="flex justify-center mb-8">
                <div className="bg-slate-100 p-1 rounded-lg flex">
                    <button
                        onClick={() => setStrategyMode('buy_hold')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${strategyMode === 'buy_hold' ? 'bg-white text-tidemark-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <TrendingUp size={16} />
                        Buy & Hold (Maximize Gains)
                    </button>
                    <button
                        onClick={() => setStrategyMode('cashless')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${strategyMode === 'cashless' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Wallet size={16} />
                        Cashless Exercise (Get Liquidity)
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Controls */}
                <div className="lg:col-span-1 space-y-5">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Grant</label>
                        <select 
                            value={selectedGrantId}
                            onChange={(e) => setSelectedGrantId(e.target.value)}
                            className={inputClass}
                        >
                            {isoGrants.map(g => (
                                <option key={g.id} value={g.id}>{g.ticker} - {formatCurrency(g.strikePrice || 0)} Strike</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Shares to Exercise</label>
                         <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                min="0"
                                max={grantStatus.available}
                                value={sharesToExercise}
                                onChange={(e) => setSharesToExercise(parseFloat(e.target.value))}
                                className={inputClass}
                            />
                            <button 
                                onClick={() => setSharesToExercise(grantStatus.available)}
                                className="text-xs font-bold text-tidemark-blue hover:text-tidemark-navy underline whitespace-nowrap"
                            >
                                Max
                            </button>
                         </div>
                         <div className="mt-3 pt-3 border-t border-slate-200">
                             <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-medium">Cost to Exercise:</span>
                                <span className="font-bold text-slate-800 text-lg">{formatCurrency(sharesToExercise * (selectedGrant.strikePrice || 0))}</span>
                             </div>
                             <p className="text-[10px] text-slate-400 text-right mt-0.5">Cash required to buy shares</p>
                         </div>
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Current FMV</label>
                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-bold">
                            {formatCurrency(selectedGrant.currentPrice)}
                        </div>
                    </div>
                    
                    {strategyMode === 'buy_hold' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Projected Sale Price</label>
                            <input 
                                type="number"
                                min="0"
                                value={futurePrice}
                                onChange={(e) => setFuturePrice(parseFloat(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                    )}

                    <Button onClick={handleSave} className={`w-full gap-2 ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} disabled={sharesToExercise <= 0 || sharesToExercise > grantStatus.available}>
                        {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
                        {isSaved ? 'Plan Saved' : 'Save Plan'}
                    </Button>
                </div>

                {/* Right Column: Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* MODE: BUY & HOLD */}
                    {strategyMode === 'buy_hold' && (
                        <div className="animate-fade-in space-y-6">

                            {/* Hero Tax Savings Banner */}
                            {(() => {
                                const equalTaxSavings = equalQualifiedScenario.netProfit - disqualifiedScenario.netProfit;

                                const handleExportPDF = () => {
                                    generateISOComparisonPDF({
                                        clientName: client.name,
                                        grantTicker: selectedGrant.ticker,
                                        strikePrice: selectedGrant.strikePrice || 0,
                                        currentPrice: selectedGrant.currentPrice,
                                        sharesToExercise,
                                        taxBracket: client.taxBracket,
                                        state: client.state,
                                        disqualified: {
                                            netProfit: disqualifiedScenario.netProfit,
                                            totalTax: disqualifiedScenario.taxes.totalTax,
                                            fedAmount: disqualifiedScenario.taxes.fedAmount,
                                            stateAmount: disqualifiedScenario.taxes.stateAmount,
                                            niitAmount: disqualifiedScenario.taxes.niitAmount,
                                            effectiveRate: disqualifiedScenario.taxes.totalTax / (disqualifiedScenario.netProfit + disqualifiedScenario.taxes.totalTax),
                                        },
                                        qualified: {
                                            netProfit: equalQualifiedScenario.netProfit,
                                            totalTax: equalQualifiedScenario.taxes.totalTax,
                                            fedAmount: equalQualifiedScenario.taxes.fedAmount,
                                            stateAmount: equalQualifiedScenario.taxes.stateAmount,
                                            niitAmount: equalQualifiedScenario.taxes.niitAmount,
                                            effectiveRate: equalQualifiedScenario.taxes.totalTax / (equalQualifiedScenario.netProfit + equalQualifiedScenario.taxes.totalTax),
                                        },
                                        taxSavings: equalTaxSavings,
                                        amtRoom: amtStats.room,
                                        currentSpread,
                                        isAmtDanger,
                                        estimatedAmt: isAmtDanger ? (currentSpread - amtStats.room) * 0.28 : 0,
                                    });
                                };

                                return (
                                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tax Benefit Analysis</h3>
                                                    <p className="text-xs text-slate-500 mt-1">Tax savings by holding for qualified disposition</p>
                                                </div>
                                                <button
                                                    onClick={handleExportPDF}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10"
                                                >
                                                    <Download size={16} />
                                                    Export Report
                                                </button>
                                            </div>

                                            <div className="text-center mb-8">
                                                <div className="text-sm text-slate-400 mb-2">By holding for 1+ year, you save</div>
                                                <div className={`text-6xl font-bold mb-2 ${equalTaxSavings > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {formatCurrency(equalTaxSavings)}
                                                </div>
                                                <div className="text-slate-400 text-sm">in taxes on this exercise</div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10">
                                                <div className="text-center">
                                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sell Immediately</div>
                                                    <div className="text-2xl font-bold text-slate-300">{formatCurrency(disqualifiedScenario.netProfit)}</div>
                                                    <div className="text-xs text-slate-500 mt-1">Ordinary Income Tax</div>
                                                </div>
                                                <div className="text-center border-x border-white/10 px-4">
                                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Hold 1+ Year</div>
                                                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(equalQualifiedScenario.netProfit)}</div>
                                                    <div className="text-xs text-slate-500 mt-1">Long-Term Cap Gains</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Savings</div>
                                                    <div className={`text-2xl font-bold ${equalTaxSavings > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {equalTaxSavings > 0 ? '+' : ''}{formatCurrency(equalTaxSavings)}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">Tax Reduction</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Side-by-Side Tax Comparison Cards */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-tidemark-navy flex items-center gap-2">
                                        <Target size={18} />
                                        Side-by-Side Tax Comparison
                                    </h4>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Sale price: {formatCurrency(salePrice)}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Disqualified */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-slate-800">Sell Immediately</h4>
                                                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Disqualified</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Exercise and sell same day</p>
                                        </div>
                                        <div className="p-5">
                                            <div className="mb-4 pb-4 border-b border-slate-100">
                                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Net Proceeds After Tax</div>
                                                <div className="text-3xl font-bold text-slate-800">{formatCurrency(disqualifiedScenario.netProfit)}</div>
                                            </div>

                                            <div className="space-y-1 mb-4 pb-4 border-b border-slate-100">
                                                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Gain Calculation</div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Sale Proceeds</span>
                                                    <span className="font-medium">{formatCurrency(sharesToExercise * salePrice)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Less: Exercise Cost</span>
                                                    <span className="font-medium text-red-600">-{formatCurrency(sharesToExercise * (selectedGrant.strikePrice || 0))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200">
                                                    <span className="text-slate-700 font-bold">Taxable Gain</span>
                                                    <span className="font-bold">{formatCurrency(sharesToExercise * (salePrice - (selectedGrant.strikePrice || 0)))}</span>
                                                </div>
                                                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">
                                                    Taxed as <strong>Ordinary Income</strong> at {client.taxBracket}%
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Tax Breakdown</div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600">Federal ({client.taxBracket}%)</span>
                                                    <span className="font-semibold text-slate-800">{formatCurrency(disqualifiedScenario.taxes.fedAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600">State ({client.state})</span>
                                                    <span className="font-semibold text-slate-800">{formatCurrency(disqualifiedScenario.taxes.stateAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600">NIIT (3.8%)</span>
                                                    <span className="font-semibold text-slate-800">{formatCurrency(disqualifiedScenario.taxes.niitAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm pt-3 mt-2 border-t border-slate-200">
                                                    <span className="text-slate-700 font-bold">Total Tax</span>
                                                    <span className="font-bold text-red-600 text-lg">{formatCurrency(disqualifiedScenario.taxes.totalTax)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                                    <span>Effective Tax Rate</span>
                                                    <span className="font-bold">{formatPercent(disqualifiedScenario.taxes.totalTax / (disqualifiedScenario.netProfit + disqualifiedScenario.taxes.totalTax))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Qualified (Equal Comparison) */}
                                    <div className="border-2 border-emerald-300 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm ring-2 ring-emerald-200/50">
                                        <div className="bg-emerald-100/50 px-5 py-3 border-b border-emerald-200">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-emerald-900">Hold 1+ Year</h4>
                                                <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full">Qualified</span>
                                            </div>
                                            <p className="text-xs text-emerald-700/70 mt-1">Exercise now, sell after holding period</p>
                                        </div>
                                        <div className="p-5">
                                            <div className="mb-4 pb-4 border-b border-emerald-200">
                                                <div className="text-xs text-emerald-600 uppercase font-bold mb-1">Net Proceeds After Tax</div>
                                                <div className="text-3xl font-bold text-emerald-800">{formatCurrency(equalQualifiedScenario.netProfit)}</div>
                                            </div>

                                            <div className="space-y-1 mb-4 pb-4 border-b border-emerald-200">
                                                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Gain Calculation</div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Sale Proceeds</span>
                                                    <span className="font-medium">{formatCurrency(sharesToExercise * salePrice)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Less: Exercise Cost</span>
                                                    <span className="font-medium text-red-600">-{formatCurrency(sharesToExercise * (selectedGrant.strikePrice || 0))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-emerald-200">
                                                    <span className="text-emerald-800 font-bold">Taxable Gain</span>
                                                    <span className="font-bold">{formatCurrency(sharesToExercise * (salePrice - (selectedGrant.strikePrice || 0)))}</span>
                                                </div>
                                                <div className="text-xs text-emerald-700 bg-emerald-100 p-2 rounded mt-2">
                                                    Entire gain taxed as <strong>Long-Term Capital Gains</strong> (0-20%)
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-emerald-800 mb-2 uppercase tracking-wide">Tax Breakdown</div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-700">Federal LTCG</span>
                                                    <span className="font-semibold text-emerald-800">{formatCurrency(equalQualifiedScenario.taxes.fedAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-700">State ({client.state})</span>
                                                    <span className="font-semibold text-emerald-800">{formatCurrency(equalQualifiedScenario.taxes.stateAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-700">NIIT (3.8%)</span>
                                                    <span className="font-semibold text-emerald-800">{formatCurrency(equalQualifiedScenario.taxes.niitAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm pt-3 mt-2 border-t border-emerald-200">
                                                    <span className="text-emerald-800 font-bold">Total Tax</span>
                                                    <span className="font-bold text-emerald-600 text-lg">{formatCurrency(equalQualifiedScenario.taxes.totalTax)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-600 bg-emerald-100 p-2 rounded">
                                                    <span>Effective Tax Rate</span>
                                                    <span className="font-bold">{formatPercent(equalQualifiedScenario.taxes.totalTax / (equalQualifiedScenario.netProfit + equalQualifiedScenario.taxes.totalTax))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AMT Optimization Strategy Card */}
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                                {client.customAmtSafeHarbor !== undefined && (
                                     <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12">
                                         <PenLine size={120} />
                                     </div>
                                )}
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h4 className="font-bold text-lg flex items-center gap-2 text-white">
                                            <Zap size={20} className="text-yellow-400 fill-yellow-400" />
                                            AMT Optimization Strategy
                                        </h4>
                                        <p className="text-slate-400 text-xs mt-1">Maximize tax-free exercise room for {new Date().getFullYear()}.</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded text-xs font-bold text-slate-200 border border-white/10">
                                        {client.customAmtSafeHarbor !== undefined && <PenLine size={12} className="text-yellow-400" />}
                                        Limit: {formatCurrency(amtStats.room)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 relative z-10">
                                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Safe Quantity</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">{formatNumber(actionableMaxSafeShares)}</span>
                                            <span className="text-xs text-slate-400">sh</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Cash Budget</p>
                                        <span className="text-xl font-bold text-white">
                                            {formatCurrency(actionableMaxSafeShares * (selectedGrant.strikePrice || 0))}
                                        </span>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Tax-Free Spread</p>
                                        <span className="text-xl font-bold text-emerald-400">
                                            {formatCurrency(actionableMaxSafeShares * spreadPerShare)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSharesToExercise(actionableMaxSafeShares)}
                                    className="w-full py-2 bg-white text-slate-900 text-sm font-bold rounded hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 relative z-10"
                                >
                                    <Target size={16} />
                                    Apply Safe Max Strategy
                                </button>

                                {isAmtDanger && (
                                    <div className="mt-4 flex gap-2 items-start text-xs text-amber-200 bg-amber-500/20 p-3 rounded border border-amber-500/30 relative z-10">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                                        <p><strong>Warning:</strong> Your {formatCurrency(currentSpread)} spread exceeds AMT room by {formatCurrency(currentSpread - amtStats.room)}. Est. AMT: <strong>{formatCurrency((currentSpread - amtStats.room) * 0.28)}</strong></p>
                                    </div>
                                )}
                            </div>

                            {/* ISO Qualification Requirements */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <h4 className="font-bold text-tidemark-navy mb-4 flex items-center gap-2">
                                    <CalendarClock size={18} />
                                    ISO Qualification Requirements
                                </h4>
                                <p className="text-sm text-slate-600 mb-4">
                                    To receive favorable long-term capital gains treatment on ISOs, you must meet <strong>both</strong> holding period requirements:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-tidemark-blue flex items-center justify-center text-white font-bold text-sm">1</div>
                                            <span className="font-bold text-slate-800">1 Year from Exercise</span>
                                        </div>
                                        <p className="text-xs text-slate-600 ml-10">
                                            Hold shares at least 1 year after exercise date to qualify for LTCG rates on the gain.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-tidemark-blue flex items-center justify-center text-white font-bold text-sm">2</div>
                                            <span className="font-bold text-slate-800">2 Years from Grant</span>
                                        </div>
                                        <p className="text-xs text-slate-600 ml-10">
                                            Hold shares at least 2 years after the original grant date.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                    <strong>Disqualifying Disposition:</strong> If you sell before meeting BOTH requirements, it becomes a "disqualifying disposition" and the bargain element (FMV - Strike at exercise) is taxed as ordinary income.
                                </div>
                            </div>

                            {/* AMT Deep Dive Section */}
                            <details className="group">
                                <summary className="bg-slate-100 rounded-xl p-4 cursor-pointer hover:bg-slate-200 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Info size={18} className="text-slate-500" />
                                        <span className="font-bold text-tidemark-navy">Understanding AMT on ISOs</span>
                                    </div>
                                    <span className="text-xs text-slate-500 group-open:hidden">Click to expand</span>
                                </summary>
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-b-xl p-6 text-white -mt-2">
                                    <div className="space-y-4">
                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h5 className="font-bold text-amber-400 text-sm mb-2">What is AMT?</h5>
                                            <p className="text-sm text-slate-300">
                                                The Alternative Minimum Tax is a parallel tax system designed to ensure high-income taxpayers pay a minimum amount of tax.
                                                It adds back certain "preference items" (like ISO bargain element) and applies a flat 26-28% rate.
                                            </p>
                                        </div>

                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h5 className="font-bold text-amber-400 text-sm mb-2">Why ISOs Trigger AMT</h5>
                                            <p className="text-sm text-slate-300 mb-3">
                                                When you exercise ISOs and <strong>hold</strong> the shares (not sell same day), the "bargain element" - the difference between FMV and strike price -
                                                is added to your AMT income. This is a <strong>paper gain</strong> that creates real tax liability.
                                            </p>
                                            <div className="bg-black/30 rounded p-3 font-mono text-xs">
                                                <div className="text-slate-400">AMT Preference Item =</div>
                                                <div className="text-amber-400">(FMV at Exercise - Strike Price) x Shares</div>
                                                <div className="text-slate-400 mt-2">Your current spread:</div>
                                                <div className="text-amber-400">({formatCurrency(selectedGrant.currentPrice)} - {formatCurrency(selectedGrant.strikePrice || 0)}) x {formatNumber(sharesToExercise)} = <span className="text-white font-bold">{formatCurrency(currentSpread)}</span></div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h5 className="font-bold text-amber-400 text-sm mb-2">The AMT Exemption (Safe Harbor)</h5>
                                            <p className="text-sm text-slate-300 mb-3">
                                                You have an AMT exemption that phases out at higher incomes. Exercising ISOs up to this "crossover point"
                                                means no additional AMT liability - it's effectively tax-free for the current year.
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-emerald-500/20 rounded p-3 border border-emerald-500/30">
                                                    <div className="text-xs text-emerald-300 font-bold uppercase mb-1">Your AMT Room</div>
                                                    <div className="text-xl font-bold text-emerald-400">{formatCurrency(amtStats.room)}</div>
                                                    <div className="text-[10px] text-emerald-300/70 mt-1">Safe to exercise without AMT</div>
                                                </div>
                                                <div className="bg-white/10 rounded p-3 border border-white/10">
                                                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">Already Used</div>
                                                    <div className="text-xl font-bold text-slate-300">{formatCurrency(amtStats.existingUsed)}</div>
                                                    <div className="text-[10px] text-slate-400/70 mt-1">From prior exercises this year</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h5 className="font-bold text-amber-400 text-sm mb-2">AMT Credit Recovery</h5>
                                            <p className="text-sm text-slate-300">
                                                <strong>Good news:</strong> AMT paid on ISOs creates a credit you can recover in future years when you sell the shares.
                                                Think of it as a prepayment of tax, not lost money. However, you need cash flow to pay the AMT now.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </details>

                            {/* Key Decision Factors */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                                <h4 className="font-bold text-tidemark-navy mb-4">Key Decision Factors</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <div className="text-sm font-bold text-slate-800 mb-2">Cash Available?</div>
                                        <p className="text-xs text-slate-600">
                                            Holding requires {formatCurrency(sharesToExercise * (selectedGrant.strikePrice || 0))} to exercise, plus potential AMT cash.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <div className="text-sm font-bold text-slate-800 mb-2">Stock Outlook?</div>
                                        <p className="text-xs text-slate-600">
                                            If you expect the stock to appreciate, holding for LTCG treatment amplifies your returns.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <div className="text-sm font-bold text-slate-800 mb-2">Concentration Risk?</div>
                                        <p className="text-xs text-slate-600">
                                            Consider total portfolio exposure. Diversification may outweigh tax savings for large positions.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <BreakevenAnalysis client={client} grant={selectedGrant} sharesToExercise={sharesToExercise} />
                        </div>
                    )}

                    {/* MODE: CASHLESS (LIQUIDITY) */}
                    {strategyMode === 'cashless' && (
                         <div className="animate-fade-in bg-slate-50 rounded-xl border border-slate-200 p-6">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Wallet className="text-emerald-600" size={20} />
                                Cashless Breakdown
                            </h4>

                            <div className="space-y-4">
                                {/* Step 1: Gross Proceeds */}
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 font-bold text-xs">1</div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Total Sale Proceeds</p>
                                            <p className="text-xs text-slate-400">({formatNumber(sharesToExercise)} shares × {formatCurrency(selectedGrant.currentPrice)})</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-800">{formatCurrency(totalProceeds)}</span>
                                </div>

                                {/* Connector */}
                                <div className="flex justify-center -my-2 relative z-10">
                                     <div className="bg-slate-200 p-1 rounded-full"><ArrowRight className="rotate-90 text-slate-400" size={14} /></div>
                                </div>

                                {/* Step 2: Pay Strike */}
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg opacity-80">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-full text-slate-500 font-bold text-xs">2</div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Less: Exercise Cost</p>
                                            <p className="text-xs text-slate-400">Paid to company (Strike {formatCurrency(selectedGrant.strikePrice || 0)})</p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-red-500">-{formatCurrency(totalCost)}</span>
                                </div>
                                
                                {/* Connector */}
                                <div className="flex justify-center -my-2 relative z-10">
                                     <div className="bg-slate-200 p-1 rounded-full"><ArrowRight className="rotate-90 text-slate-400" size={14} /></div>
                                </div>

                                {/* Step 3: Pay Taxes */}
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg opacity-80">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-full text-slate-500 font-bold text-xs">3</div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Less: Est. Taxes</p>
                                            <p className="text-xs text-slate-400">Fed + State (~{formatPercent(estimatedTaxRate)}) on Profit</p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-red-500">-{formatCurrency(estimatedTaxes)}</span>
                                </div>

                                <div className="border-t border-slate-200 my-2"></div>

                                {/* Result */}
                                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-500 p-2 rounded-full text-white">
                                            <DollarSign size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-emerald-900 font-bold uppercase">Net Cash to Client</p>
                                            <p className="text-xs text-emerald-700">Estimated take-home liquidity</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-bold text-emerald-700">{formatCurrency(netCash)}</span>
                                </div>

                                <div className="flex gap-2 items-start p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-100">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    <p>
                                        <strong>Note:</strong> Cashless exercises are Disqualifying Dispositions. 
                                        You lose ISO tax benefits, and the profit is taxed as Ordinary Income. 
                                        However, no upfront cash is required from the client.
                                    </p>
                                </div>
                            </div>
                         </div>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
};