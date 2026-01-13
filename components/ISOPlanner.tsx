import React, { useState, useEffect, useMemo } from 'react';
import { Client, Grant, PlannedExercise } from '../types';
import { calculateISOScenarios, formatCurrency, formatPercent, getGrantStatus, formatNumber, calculateAMTRoom, getEffectiveRates, generateVestingSchedule, getQuarterlyProjections, calculateISOQualification } from '../utils/calculations';
import { Info, CheckCircle, Save, TrendingUp, Lock, Unlock, AlertTriangle, Wallet, ArrowRight, DollarSign, CalendarClock, Zap, Target, PenLine, Calendar } from 'lucide-react';
import { Button } from './Button';

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
  const qualifiedScenario = calculateISOScenarios(
      sharesToExercise, 
      selectedGrant.strikePrice || 0, 
      selectedGrant.currentPrice, 
      futurePrice, 
      client, 
      true
  );

  const disqualifiedScenario = calculateISOScenarios(
      sharesToExercise,
      selectedGrant.strikePrice || 0,
      selectedGrant.currentPrice,
      selectedGrant.currentPrice,
      client,
      false
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
                            
                            {/* AMT Optimization Strategy Card - High Impact */}
                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-5 text-white shadow-lg border border-indigo-700/50 relative overflow-hidden">
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
                                        <p className="text-indigo-200 text-xs mt-1">Maximize tax-free exercise room for {new Date().getFullYear()}.</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded text-xs font-bold text-indigo-100 border border-white/10">
                                        {client.customAmtSafeHarbor !== undefined && <PenLine size={12} className="text-yellow-400" />}
                                        Limit: {formatCurrency(amtStats.room)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 relative z-10">
                                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                        <p className="text-indigo-300 text-xs font-bold uppercase mb-1">Safe Quantity</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">{formatNumber(actionableMaxSafeShares)}</span>
                                            <span className="text-xs text-indigo-200">sh</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                        <p className="text-indigo-300 text-xs font-bold uppercase mb-1">Cash Budget</p>
                                        <span className="text-xl font-bold text-white">
                                            {formatCurrency(actionableMaxSafeShares * (selectedGrant.strikePrice || 0))}
                                        </span>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                        <p className="text-indigo-300 text-xs font-bold uppercase mb-1">Tax-Free Spread</p>
                                        <span className="text-xl font-bold text-emerald-400">
                                            {formatCurrency(actionableMaxSafeShares * spreadPerShare)}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSharesToExercise(actionableMaxSafeShares)}
                                    className="w-full py-2 bg-white text-indigo-900 text-sm font-bold rounded hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 relative z-10"
                                >
                                    <Target size={16} />
                                    Apply Safe Max Strategy
                                </button>
                                
                                <div className="flex gap-2 items-start text-[11px] text-indigo-200 bg-white/5 p-2 rounded mt-4 relative z-10">
                                    <Info size={14} className="shrink-0 mt-0.5" />
                                    <p>
                                        <strong>Why this matters:</strong> Exercising ISOs up to the AMT crossover point is effectively tax-free for the current year. 
                                        You start the Capital Gains holding clock (1 year) without paying AMT. This is the most tax-efficient way to build a position.
                                        {client.customAmtSafeHarbor !== undefined && <span className="block mt-1 text-yellow-300 font-bold">* Using Manual Override from Holistiplan/BNA.</span>}
                                    </p>
                                </div>
                            </div>

                            {/* AMT Breakeven Visualizer */}
                            <div className={`rounded-xl border p-5 ${isAmtDanger ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-tidemark-navy flex items-center gap-2 text-sm">
                                        <CalendarClock size={16} className={isAmtDanger ? 'text-purple-600' : 'text-slate-400'} />
                                        AMT Threshold Monitor
                                    </h4>
                                    <div className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                        {client.filingStatus === 'married_joint' ? 'MFJ' : 'Single'}
                                    </div>
                                </div>
                                
                                <div className="space-y-1 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Calculated Spread:</span>
                                        <span className={`font-bold ${isAmtDanger ? 'text-purple-600' : 'text-slate-900'}`}>{formatCurrency(currentSpread)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Remaining AMT Room:</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(amtStats.room)}</span>
                                    </div>
                                </div>

                                <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden mt-4">
                                    <div 
                                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${isAmtDanger ? 'bg-purple-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(100, (currentSpread / (amtStats.totalCapacity || 1)) * 100)}%` }}
                                    ></div>
                                    <div 
                                        className="absolute top-0 w-0.5 h-full bg-slate-900 z-10" 
                                        style={{ left: `${Math.min(100, ((amtStats.room + amtStats.existingUsed) / (amtStats.totalCapacity || 1)) * 100)}%` }}
                                        title="AMT Breakeven Point"
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                    <span>$0</span>
                                    <span className="flex items-center gap-1">
                                        AMT Limit ({formatCurrency(amtStats.totalCapacity)})
                                        {client.customAmtSafeHarbor !== undefined && <PenLine size={10} />}
                                    </span>
                                </div>

                                {isAmtDanger ? (
                                    <div className="mt-3 flex gap-2 items-start text-xs text-purple-700 bg-purple-100 p-2 rounded border border-purple-200">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                        <p><strong>Warning:</strong> You are crossing the AMT threshold. Every dollar of spread above {formatCurrency(amtStats.room)} may trigger 26-28% AMT tax due next April.</p>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-slate-500">
                                        Within safe harbor. No AMT expected.
                                    </p>
                                )}
                            </div>

                            {/* Recommendation Header */}
                            {(() => {
                                const taxSavings = qualifiedScenario.netProfit - disqualifiedScenario.netProfit;
                                const holdingBenefit = taxSavings > 0;
                                const amtExceedsRoom = currentSpread > amtStats.room;

                                return (
                                    <div className={`rounded-xl p-6 border-2 ${
                                        holdingBenefit && !amtExceedsRoom
                                            ? 'bg-emerald-50 border-emerald-300'
                                            : amtExceedsRoom
                                                ? 'bg-amber-50 border-amber-300'
                                                : 'bg-slate-50 border-slate-300'
                                    }`}>
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-full ${
                                                holdingBenefit && !amtExceedsRoom
                                                    ? 'bg-emerald-500'
                                                    : amtExceedsRoom
                                                        ? 'bg-amber-500'
                                                        : 'bg-slate-500'
                                            }`}>
                                                {holdingBenefit && !amtExceedsRoom ? (
                                                    <TrendingUp className="text-white" size={24} />
                                                ) : (
                                                    <AlertTriangle className="text-white" size={24} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`text-xl font-bold mb-1 ${
                                                    holdingBenefit && !amtExceedsRoom
                                                        ? 'text-emerald-800'
                                                        : amtExceedsRoom
                                                            ? 'text-amber-800'
                                                            : 'text-slate-800'
                                                }`}>
                                                    {holdingBenefit && !amtExceedsRoom
                                                        ? `Holding saves ${formatCurrency(taxSavings)} in taxes`
                                                        : amtExceedsRoom
                                                            ? 'Caution: AMT threshold exceeded'
                                                            : 'Consider immediate sale'
                                                    }
                                                </h3>
                                                <p className="text-sm text-slate-600 mb-4">
                                                    {holdingBenefit && !amtExceedsRoom
                                                        ? `By exercising and holding for 1+ year, you qualify for long-term capital gains rates (0-20%) instead of ordinary income rates (up to ${client.taxBracket}%).`
                                                        : amtExceedsRoom
                                                            ? `This exercise amount exceeds your AMT safe harbor by ${formatCurrency(currentSpread - amtStats.room)}. Consider reducing shares or splitting across tax years.`
                                                            : 'At current prices and tax rates, the benefit of holding is minimal. Consider your liquidity needs.'
                                                    }
                                                </p>

                                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/50">
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-medium mb-1">Sell Now (After Tax)</div>
                                                        <div className="text-lg font-bold text-slate-700">{formatCurrency(disqualifiedScenario.netProfit)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-medium mb-1">Hold 1 Year (After Tax)</div>
                                                        <div className="text-lg font-bold text-emerald-700">{formatCurrency(qualifiedScenario.netProfit)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-medium mb-1">Tax Savings</div>
                                                        <div className={`text-lg font-bold ${taxSavings > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {taxSavings > 0 ? '+' : ''}{formatCurrency(taxSavings)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

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
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg flex items-center gap-2">
                                            <Info size={20} className="text-amber-400" />
                                            Understanding AMT on ISOs
                                        </h4>
                                        <p className="text-slate-400 text-sm mt-1">Why exercising ISOs can trigger Alternative Minimum Tax</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
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

                                {isAmtDanger && (
                                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <div className="font-bold text-amber-300 mb-1">You're Exceeding AMT Safe Harbor</div>
                                                <p className="text-sm text-amber-200/80">
                                                    Your {formatCurrency(currentSpread)} spread exceeds the {formatCurrency(amtStats.room)} AMT room by {formatCurrency(currentSpread - amtStats.room)}.
                                                    This could trigger approximately <strong>{formatCurrency((currentSpread - amtStats.room) * 0.28)}</strong> in AMT due next April.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Side-by-Side Comparison */}
                            <div>
                                <h4 className="font-bold text-tidemark-navy mb-4 flex items-center gap-2">
                                    <Target size={18} />
                                    Detailed Tax Comparison
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Disqualified */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-slate-800">Sell Immediately</h4>
                                                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Disqualified</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Exercise and sell same day or within holding period</p>
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
                                                    <span className="font-medium">{formatCurrency(sharesToExercise * selectedGrant.currentPrice)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Less: Exercise Cost</span>
                                                    <span className="font-medium text-red-600">-{formatCurrency(sharesToExercise * (selectedGrant.strikePrice || 0))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200">
                                                    <span className="text-slate-700 font-bold">Taxable Gain</span>
                                                    <span className="font-bold">{formatCurrency(sharesToExercise * (selectedGrant.currentPrice - (selectedGrant.strikePrice || 0)))}</span>
                                                </div>
                                                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">
                                                    Taxed as <strong>Ordinary Income</strong> at your marginal rate
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

                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <div className="text-xs text-slate-600">
                                                    <strong>Pros:</strong> Immediate liquidity, no market risk, no AMT
                                                </div>
                                                <div className="text-xs text-slate-600 mt-1">
                                                    <strong>Cons:</strong> Highest tax rate, lose ISO tax benefit
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Qualified */}
                                    <div className="border-2 border-tidemark-blue/30 rounded-xl overflow-hidden bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm ring-2 ring-tidemark-blue/10">
                                        <div className="bg-tidemark-blue/10 px-5 py-3 border-b border-tidemark-blue/20">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-tidemark-navy">Hold 1+ Year</h4>
                                                <span className="text-[10px] font-bold uppercase bg-tidemark-blue text-white px-2 py-0.5 rounded-full">Qualified</span>
                                            </div>
                                            <p className="text-xs text-tidemark-navy/70 mt-1">Exercise now, sell after meeting holding requirements</p>
                                        </div>
                                        <div className="p-5">
                                            <div className="mb-4 pb-4 border-b border-sky-200">
                                                <div className="text-xs text-tidemark-blue uppercase font-bold mb-1">Net Proceeds After Tax</div>
                                                <div className="text-3xl font-bold text-tidemark-navy">{formatCurrency(qualifiedScenario.netProfit)}</div>
                                            </div>

                                            <div className="space-y-1 mb-4 pb-4 border-b border-sky-200">
                                                <div className="text-xs font-bold text-tidemark-navy uppercase tracking-wide mb-2">Gain Calculation</div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Projected Sale</span>
                                                    <span className="font-medium">{formatCurrency(sharesToExercise * futurePrice)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Less: Exercise Cost</span>
                                                    <span className="font-medium text-red-600">-{formatCurrency(sharesToExercise * (selectedGrant.strikePrice || 0))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-sky-200">
                                                    <span className="text-tidemark-navy font-bold">Taxable Gain</span>
                                                    <span className="font-bold">{formatCurrency(sharesToExercise * (futurePrice - (selectedGrant.strikePrice || 0)))}</span>
                                                </div>
                                                <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded mt-2">
                                                    Entire gain taxed as <strong>Long-Term Capital Gains</strong> (0-20%)
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-tidemark-navy mb-2 uppercase tracking-wide">Tax Breakdown</div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-700">Federal LTCG</span>
                                                    <span className="font-semibold text-tidemark-navy">{formatCurrency(qualifiedScenario.taxes.fedAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-700">State ({client.state})</span>
                                                    <span className="font-semibold text-tidemark-navy">{formatCurrency(qualifiedScenario.taxes.stateAmount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-700">NIIT (3.8%)</span>
                                                    <span className="font-semibold text-tidemark-navy">{formatCurrency(qualifiedScenario.taxes.niitAmount)}</span>
                                                </div>
                                                {currentSpread > amtStats.room && (
                                                    <div className="flex justify-between items-center text-sm bg-amber-50 p-2 rounded border border-amber-200">
                                                        <span className="text-amber-800 font-medium">AMT (est.)</span>
                                                        <span className="font-bold text-amber-600">{formatCurrency((currentSpread - amtStats.room) * 0.28)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-sm pt-3 mt-2 border-t border-sky-200">
                                                    <span className="text-tidemark-navy font-bold">Total Tax</span>
                                                    <span className="font-bold text-tidemark-blue text-lg">{formatCurrency(qualifiedScenario.taxes.totalTax)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-600 bg-sky-100 p-2 rounded">
                                                    <span>Effective Tax Rate</span>
                                                    <span className="font-bold">{formatPercent(qualifiedScenario.taxes.totalTax / (qualifiedScenario.netProfit + qualifiedScenario.taxes.totalTax))}</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-sky-200">
                                                <div className="text-xs text-slate-700">
                                                    <strong>Pros:</strong> Lowest tax rate, maximize ISO benefit
                                                </div>
                                                <div className="text-xs text-slate-700 mt-1">
                                                    <strong>Cons:</strong> Market risk, cash needed to exercise, potential AMT
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

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
                                            Holding assumes price goes to {formatCurrency(futurePrice)}. If stock drops, tax savings may not offset losses.
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