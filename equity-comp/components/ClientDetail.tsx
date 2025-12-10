import React, { useState, useMemo } from 'react';
import { Client, Grant, VestingEvent, PlannedExercise } from '../types';
import { GrantForm } from './GrantForm';
import { AddClientModal } from './AddClientModal';
import { ISOPlanner } from './ISOPlanner';
import { Button } from './Button';
import { ArrowLeft, Plus, DollarSign, PieChart, TrendingUp, AlertTriangle, Settings, Coins, Building, Download, Printer, CheckCircle, Lock, Edit2, Trash2, X, Briefcase, Clock, History, TrendingDown } from 'lucide-react';
import { generateVestingSchedule, getQuarterlyProjections, formatCurrency, formatNumber, formatPercent, getEffectiveRates, getGrantStatus, calculateISOQualification } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onUpdateClient: (updatedClient: Client) => void;
}

type Tab = 'overview' | 'iso-planning' | 'history';

interface GrantYearData {
  year: string;
  totalShares: number;
  totalInitialValue: number;
  totalCurrentValue: number;
  count: number;
}

interface VestingYearData {
  year: string;
  vestedShares: number;
  grossValueCurrent: number;
}

// Inline Edit Modal for ISO Exercises
const EditExerciseModal = ({ 
    exercise, 
    onSave, 
    onCancel, 
    onDelete 
}: { 
    exercise: PlannedExercise, 
    onSave: (updated: PlannedExercise) => void, 
    onCancel: () => void,
    onDelete: () => void 
}) => {
    const [date, setDate] = useState(exercise.exerciseDate);
    const [shares, setShares] = useState(exercise.shares);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Exercise</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exercise Date</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shares Exercised</label>
                        <input 
                            type="number" 
                            value={shares} 
                            onChange={(e) => setShares(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button onClick={() => onSave({...exercise, exerciseDate: date, shares})} className="flex-1">Save</Button>
                        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
                    </div>
                     <button 
                        onClick={onDelete}
                        className="w-full mt-2 text-xs text-red-500 hover:text-red-700 font-medium py-2"
                    >
                        Delete This Entry
                    </button>
                </div>
            </div>
        </div>
    );
};


export const ClientDetail: React.FC<ClientDetailProps> = ({ client, onBack, onUpdateClient }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  const [simulateSellAll, setSimulateSellAll] = useState(false);
  
  // State for Editing an Exercise
  const [editingExercise, setEditingExercise] = useState<PlannedExercise | null>(null);

  // --- Calculations ---
  const allEvents = useMemo(() => {
    let events: VestingEvent[] = [];
    client.grants.forEach(grant => {
      const grantEvents = generateVestingSchedule(grant, client, simulateSellAll);
      events = [...events, ...grantEvents];
    });
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [client, simulateSellAll]);

  const upcomingEvents = useMemo(() => getQuarterlyProjections(allEvents), [allEvents]);
  
  // --- Historical Data Aggregation ---
  const historicalData = useMemo(() => {
    const grantsByYear = client.grants.reduce((acc, grant) => {
        const year = new Date(grant.grantDate).getFullYear().toString();
        if (!acc[year]) acc[year] = { year, totalShares: 0, totalInitialValue: 0, totalCurrentValue: 0, count: 0 };
        
        acc[year].totalShares += grant.totalShares;
        acc[year].totalInitialValue += grant.totalShares * (grant.grantPrice || grant.currentPrice); 
        acc[year].totalCurrentValue += grant.totalShares * grant.currentPrice;
        acc[year].count += 1;
        return acc;
    }, {} as Record<string, GrantYearData>);

    const vestingByYear = allEvents.reduce((acc, event) => {
        const year = new Date(event.date).getFullYear().toString();
        if (!acc[year]) acc[year] = { year, vestedShares: 0, grossValueCurrent: 0 };
        acc[year].vestedShares += event.shares;
        acc[year].grossValueCurrent += event.grossValue; 
        return acc;
    }, {} as Record<string, VestingYearData>);

    const grantChartData = Object.values(grantsByYear).sort((a: GrantYearData, b: GrantYearData) => parseInt(a.year) - parseInt(b.year));
    const vestingChartData = Object.values(vestingByYear).sort((a: VestingYearData, b: VestingYearData) => parseInt(a.year) - parseInt(b.year));
    
    return { grantChartData, vestingChartData };
  }, [client.grants, allEvents]);


  const unvestedRSUValue = useMemo(() => {
     return client.grants
        .filter(g => g.type === 'RSU')
        .reduce((sum, g) => {
             const status = getGrantStatus(g, []); 
             return sum + (status.unvested * g.currentPrice);
        }, 0);
  }, [client.grants]);

  // --- Holdings Calculation (New Feature with ST/LT Split) ---
  const holdings = useMemo(() => {
    const rsuHoldings = client.grants
        .filter(g => g.type === 'RSU')
        .reduce((acc, grant) => {
            let sharesHeld = 0;
            let currentVal = 0;
            let shortTerm = 0;
            let longTerm = 0;
            let hasGainData = false;
            let totalGain = 0;

            // Generate past events for this grant to determine aging
            const events = generateVestingSchedule(grant, client, simulateSellAll);
            const pastEvents = events.filter(e => e.isPast).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            if (grant.customHeldShares !== undefined) {
                // Manual Override
                sharesHeld = grant.customHeldShares;
                currentVal = sharesHeld * grant.currentPrice;
                
                // Estimate ST/LT using FIFO logic against the vesting schedule
                // We "fill" the held bucket starting from the OLDEST vest date
                let sharesToAccountFor = sharesHeld;
                const now = new Date();
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(now.getFullYear() - 1);

                for (const event of pastEvents) {
                    if (sharesToAccountFor <= 0) break;
                    // For allocation purposes, assume we held the FULL vested amount if needed, 
                    // or at least the net amount. Let's use 'shares' (gross) as maximum possible, 
                    // but realistically we should track 'netShares'.
                    // If user manually entered shares, they might have bought more or sold some.
                    // We assume these shares originated from these vests.
                    const availableInTranche = event.shares; // Using gross shares to be safe on attribution
                    const alloc = Math.min(sharesToAccountFor, availableInTranche);
                    
                    if (new Date(event.date) < oneYearAgo) {
                        longTerm += alloc;
                    } else {
                        shortTerm += alloc;
                    }
                    sharesToAccountFor -= alloc;
                }
                // If any remaining (e.g. bought on open market or data mismatch), assign to Short Term conservatively
                if (sharesToAccountFor > 0) {
                    shortTerm += sharesToAccountFor;
                }

                // Gain Calculation
                if (grant.averageCostBasis !== undefined) {
                    hasGainData = true;
                    totalGain = (grant.currentPrice - grant.averageCostBasis) * sharesHeld;
                }

            } else {
                // Auto Calculation (Sell-to-Cover)
                const now = new Date();
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(now.getFullYear() - 1);

                pastEvents.forEach(e => {
                    sharesHeld += e.netShares;
                    if (new Date(e.date) < oneYearAgo) {
                        longTerm += e.netShares;
                    } else {
                        shortTerm += e.netShares;
                    }
                });
                currentVal = sharesHeld * grant.currentPrice;
                // No Gain data available for auto-calc without historical prices
            }

            return {
                shares: acc.shares + sharesHeld,
                value: acc.value + currentVal,
                longTerm: acc.longTerm + longTerm,
                shortTerm: acc.shortTerm + shortTerm,
                totalGain: acc.totalGain + totalGain,
                hasGainData: acc.hasGainData || hasGainData
            };
        }, { shares: 0, value: 0, longTerm: 0, shortTerm: 0, totalGain: 0, hasGainData: false });

    const isoHoldings = (client.plannedExercises || []).map(ex => {
        const grant = client.grants.find(g => g.id === ex.grantId);
        if (!grant) return null;
        
        const qualInfo = calculateISOQualification(grant.grantDate, ex.exerciseDate);
        const currentValue = ex.shares * grant.currentPrice;
        
        return {
            ...ex,
            grantTicker: grant.ticker,
            grantDate: grant.grantDate,
            currentFMV: grant.currentPrice,
            currentValue,
            qualification: qualInfo
        };
    }).filter(Boolean) as any[];

    return { rsu: rsuHoldings, iso: isoHoldings };
  }, [allEvents, client.grants, client.plannedExercises, simulateSellAll]);


  // Aggregate stats
  const summary = useMemo(() => {
    const vestingSummary = upcomingEvents.reduce((acc, curr) => ({
      gross: acc.gross + curr.grossValue,
      taxGap: acc.taxGap + curr.taxGap,
      shares: acc.shares + curr.shares,
      netValue: acc.netValue + curr.netValue,
      amtExposure: acc.amtExposure 
    }), { gross: 0, taxGap: 0, shares: 0, netValue: 0, amtExposure: 0 });

    const plannedSummary = (client.plannedExercises || []).reduce((acc, curr) => ({
        amtExposure: acc.amtExposure + curr.amtExposure,
        cost: acc.cost + curr.estimatedCost
    }), { amtExposure: 0, cost: 0 });

    return {
        ...vestingSummary,
        amtExposure: vestingSummary.amtExposure + plannedSummary.amtExposure,
        plannedExerciseCost: plannedSummary.cost
    };
  }, [upcomingEvents, client.plannedExercises]);

  // --- Handlers ---

  const handleSaveGrant = (grantData: Omit<Grant, 'id' | 'lastUpdated'>) => {
    if (editingGrant) {
      // Edit Mode
      const updatedGrants = client.grants.map(g => 
        g.id === editingGrant.id 
          ? { ...grantData, id: editingGrant.id, lastUpdated: new Date().toISOString() } 
          : g
      );
      onUpdateClient({ ...client, grants: updatedGrants });
      setEditingGrant(null);
    } else {
      // Create Mode
      const newGrant: Grant = {
        ...grantData,
        id: crypto.randomUUID(),
        lastUpdated: new Date().toISOString()
      };
      onUpdateClient({ ...client, grants: [...client.grants, newGrant] });
    }
    setShowGrantForm(false);
  };

  const handleEditGrantClick = (grant: Grant) => {
    setEditingGrant(grant);
    setShowGrantForm(true);
  };

  const handleDeleteGrant = (grantId: string) => {
    if (window.confirm("Are you sure you want to delete this grant? This action cannot be undone.")) {
      const updatedGrants = client.grants.filter(g => g.id !== grantId);
      onUpdateClient({ ...client, grants: updatedGrants });
    }
  };

  const handleEditClientSave = (
      name: string, 
      taxBracket: number, 
      state: string, 
      filingStatus: 'single' | 'married_joint', 
      income: number, 
      customState?: number, 
      customLtcg?: number,
      customAmtSafeHarbor?: number
  ) => {
    onUpdateClient({ 
        ...client, 
        name, 
        taxBracket, 
        state,
        filingStatus,
        estimatedIncome: income,
        customStateTaxRate: customState, 
        customLtcgTaxRate: customLtcg,
        customAmtSafeHarbor: customAmtSafeHarbor
    });
  };

  const handleSavePlan = (plan: PlannedExercise) => {
      onUpdateClient({
          ...client,
          plannedExercises: [...(client.plannedExercises || []), plan]
      });
  };

  // --- Exercise Editing Handlers ---
  const handleUpdateExercise = (updated: PlannedExercise) => {
      const updatedExercises = client.plannedExercises.map(ex => 
        ex.id === updated.id ? updated : ex
      );
      onUpdateClient({ ...client, plannedExercises: updatedExercises });
      setEditingExercise(null);
  };

  const handleDeleteExercise = (id: string) => {
      if (window.confirm("Delete this exercise record?")) {
        const updatedExercises = client.plannedExercises.filter(ex => ex.id !== id);
        onUpdateClient({ ...client, plannedExercises: updatedExercises });
        setEditingExercise(null);
      }
  };

  const downloadCSV = () => {
    const rows = [];
    rows.push([`EQUITY REPORT: ${client.name.toUpperCase()}`]);
    rows.push([`Generated: ${new Date().toLocaleDateString()}`]);
    rows.push([]);
    rows.push(['SECTION 1: ACTIVE GRANTS SUMMARY']);
    rows.push(['Type', 'Ticker', 'Company', 'Shares', 'Current Price', 'Strike Price', 'Grant Date', 'Value']);
    client.grants.forEach(g => {
        rows.push([
            g.type,
            g.ticker,
            g.companyName,
            g.totalShares,
            g.currentPrice,
            g.strikePrice || '',
            g.grantDate,
            g.totalShares * g.currentPrice
        ]);
    });
    rows.push([]);
    rows.push(['SECTION 2: FULL VESTING SCHEDULE']);
    rows.push(['Status', 'Date', 'Type', 'Shares Vesting', 'Gross Value', 'Shares Sold to Cover', 'Withholding ($)', 'Net Shares', 'Net Value', 'Tax Gap']);
    allEvents.forEach(e => {
        rows.push([
            e.isPast ? 'VESTED' : 'FUTURE',
            e.date,
            e.grantType,
            e.shares,
            e.grossValue.toFixed(2),
            e.sharesSoldToCover.toFixed(2),
            e.withholdingAmount.toFixed(2),
            e.netShares.toFixed(2),
            e.netValue.toFixed(2),
            e.taxGap.toFixed(2)
        ]);
    });
    rows.push([]);
    rows.push(['SECTION 3: PLANNED ISO EXERCISES']);
    rows.push(['Grant', 'Date', 'Shares', 'Strike Price', 'FMV at Exercise', 'Est. Cost', 'AMT Exposure']);
    (client.plannedExercises || []).forEach(p => {
        rows.push([
            p.grantTicker,
            p.exerciseDate,
            p.shares,
            p.exercisePrice,
            p.fmvAtExercise,
            p.estimatedCost.toFixed(2),
            p.amtExposure.toFixed(2)
        ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${client.name.replace(/\s+/g, '_')}_Full_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    alert("Preparing Report... Please select 'Save as PDF' as the destination in the print dialog that follows.");
    setTimeout(() => {
        window.print();
    }, 500);
  };

  const chartData = upcomingEvents.map(e => ({
    date: e.date,
    grossValue: e.grossValue,
    netValue: e.netValue,
    withholding: e.withholdingAmount,
    taxGap: e.taxGap,
    fedTax: e.taxBreakdown.fed,
    stateTax: e.taxBreakdown.state,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
          <p className="font-bold mb-1 border-b border-slate-600 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
             <div key={index} className="flex justify-between items-center gap-4 mb-0.5">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></div>
                  <span className="opacity-80 text-slate-200">{entry.name}</span>
               </div>
               <span className="font-medium font-mono">{formatCurrency(entry.value)}</span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const { stateRate, fedLtcgRate } = getEffectiveRates(client);

  return (
    <div className="space-y-8 print:space-y-4 print:p-0 print:m-0 print:w-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-500 border border-transparent hover:border-slate-200">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-bold text-tidemark-navy tracking-tight">{client.name}</h1>
               <button onClick={() => setShowEditClient(true)} className="text-slate-400 hover:text-tidemark-blue transition-colors">
                 <Settings size={18} />
               </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-2">
              <span className="bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium shadow-sm">
                Fed Ord: {client.taxBracket}%
              </span>
              <span className={`px-2 py-0.5 rounded border font-medium shadow-sm ${client.customStateTaxRate ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                State ({client.state}): {formatPercent(stateRate)} {client.customStateTaxRate && '(Custom)'}
              </span>
              <span className={`px-2 py-0.5 rounded border font-medium shadow-sm ${client.customLtcgTaxRate ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                Fed LTCG: {formatPercent(fedLtcgRate)} {client.customLtcgTaxRate && '(Custom)'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
             <Button variant="secondary" onClick={printReport} className="gap-2 hidden md:flex">
                <Printer size={18} />
                Print / Save PDF
             </Button>
             <Button variant="secondary" onClick={downloadCSV} className="gap-2 hidden md:flex">
                <Download size={18} />
                Full CSV Export
             </Button>
             <Button onClick={() => { setEditingGrant(null); setShowGrantForm(true); }} className="gap-2 shadow-md shadow-indigo-100">
               <Plus size={20} />
               Add Grant
             </Button>
        </div>
      </div>

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <EditExerciseModal 
            exercise={editingExercise} 
            onSave={handleUpdateExercise} 
            onCancel={() => setEditingExercise(null)} 
            onDelete={() => handleDeleteExercise(editingExercise.id)}
        />
      )}

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b border-slate-200 pb-4">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-2xl font-bold text-tidemark-navy">Equity Analysis Report</h1>
                <h2 className="text-lg text-slate-700 font-semibold">{client.name}</h2>
             </div>
             <div className="text-right">
                <p className="text-sm text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
                <p className="text-xs text-slate-400">EquityCompass Advisors</p>
             </div>
          </div>
      </div>

      {/* Grant Form Modal */}
      {showGrantForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tidemark-navy/40 backdrop-blur-sm p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 p-8 animate-in fade-in zoom-in duration-200 relative">
             <button onClick={() => { setShowGrantForm(false); setEditingGrant(null); }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
             </button>
             <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-tidemark-blue/10 rounded-lg">
                    {editingGrant ? <Edit2 className="text-tidemark-blue" size={20} /> : <Plus className="text-tidemark-blue" size={20} />}
                 </div>
                 <h3 className="text-xl font-bold text-tidemark-navy">{editingGrant ? 'Edit Grant Details' : 'Add New Grant'}</h3>
             </div>
             
             <GrantForm
               key={editingGrant?.id || 'new'}
               onSave={handleSaveGrant}
               onCancel={() => { setShowGrantForm(false); setEditingGrant(null); }}
               initialData={editingGrant || undefined}
             />
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-fit print:hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-tidemark-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Vesting Overview
        </button>
        <button
          onClick={() => setActiveTab('iso-planning')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'iso-planning' ? 'bg-white text-tidemark-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          ISO Planning
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white text-tidemark-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          History & Trends
        </button>
      </div>

      {activeTab === 'iso-planning' ? (
        <div className="print:block">
            <ISOPlanner client={client} grants={client.grants} onSavePlan={handleSavePlan} />
        </div>
      ) : activeTab === 'history' ? (
         <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Grants Awarded by Year */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-tidemark-navy mb-2 flex items-center gap-2">
                        <History size={18} className="text-slate-400"/> 
                        Grants Awarded by Year
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">Comparison of total grant value at time of award vs. current value.</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historicalData.grantChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                <Bar dataKey="totalInitialValue" name="Initial Value (At Grant)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="totalCurrentValue" name="Current Value" fill="#00558C" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Vesting Volume by Year */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-tidemark-navy mb-2 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500"/> 
                        Vesting Volume by Year (Shares)
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">Total shares vested per calendar year.</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historicalData.vestingChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="vestedShares" name="Shares Vested" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
             </div>

             {/* Historical Data Table */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Historical Grant Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-slate-50 uppercase tracking-wider font-semibold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3">Grant Year</th>
                                <th className="px-6 py-3 text-right">Shares Granted</th>
                                <th className="px-6 py-3 text-right">Avg Grant Price</th>
                                <th className="px-6 py-3 text-right">Current Price</th>
                                <th className="px-6 py-3 text-right">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historicalData.grantChartData.map((data: any) => {
                                const avgGrantPrice = data.totalInitialValue / data.totalShares;
                                const avgCurrentPrice = data.totalCurrentValue / data.totalShares;
                                const pctChange = (avgCurrentPrice - avgGrantPrice) / avgGrantPrice;

                                return (
                                    <tr key={data.year} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{data.year}</td>
                                        <td className="px-6 py-4 text-right text-slate-600 font-mono">{formatNumber(data.totalShares)}</td>
                                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(avgGrantPrice)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(avgCurrentPrice)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                pctChange >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                                {pctChange >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                                {formatPercent(pctChange)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
         </div>
      ) : (
        <div className="space-y-8 animate-fade-in print:space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 print:grid-cols-4 print:gap-4 break-inside-avoid">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:p-4 print:border-slate-300 print:shadow-none">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg print:hidden">
                        <DollarSign size={22} />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Proj. Vesting</h4>
                    </div>
                    <p className="text-3xl font-bold text-tidemark-navy">{formatCurrency(summary.gross)}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium print:hidden">Next 12 Months</p>
                </div>
                
                {/* Unvested RSU Value Card */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:p-4 print:border-slate-300 print:shadow-none">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg print:hidden">
                        <Lock size={22} />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Unvested RSUs</h4>
                    </div>
                    <p className="text-3xl font-bold text-slate-700">{formatCurrency(unvestedRSUValue)}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium print:hidden">Total pipeline</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:p-4 print:border-slate-300 print:shadow-none">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg print:hidden">
                        <AlertTriangle size={22} />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Tax Gap</h4>
                    </div>
                    <p className="text-3xl font-bold text-amber-600">{formatCurrency(summary.taxGap)}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium print:hidden">Due April 15</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:p-4 print:border-slate-300 print:shadow-none">
                    <div className="flex items-center gap-3 mb-3">
                         <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg print:hidden">
                         <TrendingUp size={22} />
                         </div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            AMT Exp.
                        </h4>
                    </div>
                    <p className={`text-3xl font-bold text-purple-600`}>
                        {formatCurrency(summary.amtExposure)}
                    </p>
                     <p className="text-xs text-slate-400 mt-1 font-medium print:hidden">From Planned Exercises Only</p>
                </div>
            </div>

            {/* HOLDINGS ANALYSIS SECTION (NEW) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase size={20} className="text-tidemark-blue" />
                        Portfolio Holdings (Vested & Exercised)
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* RSU Holdings Card - Now Editable via Grant */}
                    <div className="border border-slate-100 rounded-xl bg-slate-50 p-5 flex flex-col justify-between relative group">
                        {/* Edit Button for RSU Holdings */}
                        <div className="absolute top-4 right-4">
                            <button 
                                onClick={() => {
                                    // Find first RSU grant to edit or open general add
                                    const rsuGrant = client.grants.find(g => g.type === 'RSU');
                                    if (rsuGrant) {
                                        setEditingGrant(rsuGrant);
                                        setShowGrantForm(true);
                                    } else {
                                        alert("Add an RSU grant first to track holdings.");
                                    }
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm hover:shadow transition-all"
                            >
                                <Edit2 size={12} />
                                Edit Holdings
                            </button>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Vested RSU Holdings
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">Shares vested and held (Net of tax withholding)</p>
                            
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold text-slate-900">{formatNumber(holdings.rsu.shares)}</span>
                                <span className="text-sm text-slate-500 font-medium">shares</span>
                            </div>
                            <div className="text-lg font-semibold text-emerald-600">
                                {formatCurrency(holdings.rsu.value)}
                            </div>
                            
                            {/* NEW: Term Breakdown and Gain */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-400 block mb-0.5">Short Term (&lt;1yr)</span>
                                    <span className="font-bold text-slate-700">{formatNumber(Math.round(holdings.rsu.shortTerm))} sh</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-400 block mb-0.5">Long Term (&gt;1yr)</span>
                                    <span className="font-bold text-slate-700">{formatNumber(Math.round(holdings.rsu.longTerm))} sh</span>
                                </div>
                            </div>

                            {holdings.rsu.hasGainData && (
                                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-bold uppercase">Unrealized Gain</span>
                                    <span className={`text-sm font-bold ${holdings.rsu.totalGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {holdings.rsu.totalGain >= 0 ? '+' : ''}{formatCurrency(holdings.rsu.totalGain)}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400 flex items-center gap-1">
                            <InfoIcon />
                            <span>
                                {client.grants.some(g => g.customHeldShares !== undefined) 
                                 ? "Includes Manual Overrides (FIFO Estimated Term)." 
                                 : "Assuming 'Sell-to-Cover' strategy."}
                            </span>
                        </div>
                    </div>

                    {/* ISO Tax Lot Table */}
                    <div className="lg:col-span-1">
                         <div className="flex justify-between items-end mb-3">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                ISO Qualification Tracker
                            </h4>
                            {/* ISO Summary Stats */}
                            <div className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
                                {client.grants.filter(g => g.type === 'ISO').map(g => {
                                    const status = getGrantStatus(g, client.plannedExercises);
                                    return (
                                        <span key={g.id} className="block text-right">
                                            {g.ticker}: {formatNumber(status.exercised)} Exercised / {formatNumber(status.available)} Remaining
                                        </span>
                                    );
                                })}
                            </div>
                         </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Grant</th>
                                        <th className="px-3 py-2 text-right">Shares</th>
                                        <th className="px-3 py-2 text-right">Value</th>
                                        <th className="px-3 py-2 text-left pl-6">Qualification Status</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {holdings.iso.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                                                No ISO exercises recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        holdings.iso.map((iso, idx) => (
                                            <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors group">
                                                <td className="px-3 py-2.5 font-medium text-slate-900">
                                                    {iso.grantTicker}
                                                    <div className="text-[10px] text-slate-400">Ex: {iso.exerciseDate}</div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-600">{formatNumber(iso.shares)}</td>
                                                <td className="px-3 py-2.5 text-right font-medium text-slate-800">{formatCurrency(iso.currentValue)}</td>
                                                <td className="px-3 py-2.5 pl-6">
                                                    {iso.qualification.isQualified ? (
                                                        <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                                            <CheckCircle size={12} />
                                                            Qualified (LTCG)
                                                        </span>
                                                    ) : (
                                                        <div className="w-full max-w-[140px]">
                                                            <div className="flex justify-between text-[10px] font-bold text-amber-600 mb-1">
                                                                <span>Wait {iso.qualification.monthsRemaining} mo.</span>
                                                                <Clock size={10} />
                                                            </div>
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-amber-400 rounded-full"
                                                                    style={{width: `${iso.qualification.progressBar}%`}}
                                                                ></div>
                                                            </div>
                                                            <div className="text-[9px] text-slate-400 mt-0.5 text-right">
                                                                Eligible: {iso.qualification.qualifyingDate}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-2">
                                                    <button 
                                                        onClick={() => setEditingExercise(iso)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Edit Exercise"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

             {/* Scenario Planning Engine - Hidden on print as it's interactive */}
            <div className="bg-gradient-to-r from-tidemark-navy to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden print:hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Coins className="text-yellow-400" size={20} />
                    Future Vesting Strategy: {simulateSellAll ? 'Sell All & Diversify' : 'Sell-to-Cover (Standard)'}
                    </h3>
                    <p className="text-slate-300 text-sm opacity-90">
                        {simulateSellAll 
                         ? "Liquidation of all future shares at vest to diversify portfolio. Tax gap paid from proceeds." 
                         : "Selling only enough shares to cover statutory withholding. Holding remainder."}
                    </p>
                </div>
                
                <div className="bg-slate-700/50 p-1 rounded-lg flex items-center border border-slate-600/50">
                    <button
                    onClick={() => setSimulateSellAll(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!simulateSellAll ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
                    >
                    Sell-to-Cover
                    </button>
                    <button
                    onClick={() => setSimulateSellAll(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${simulateSellAll ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
                    >
                    Sell All
                    </button>
                </div>
                </div>
            </div>

            {/* Print Only Strategy Summary */}
            <div className="hidden print:block p-4 border border-slate-300 rounded-lg bg-slate-50 break-inside-avoid">
                 <h3 className="font-bold text-slate-800 text-sm">Modeling Assumptions</h3>
                 <p className="text-xs text-slate-600 mt-1">
                    Strategy: {simulateSellAll ? 'Sell All & Diversify' : 'Sell-to-Cover (Standard)'}. 
                    Assumes federal tax rate of {client.taxBracket}% and state rate of {formatPercent(stateRate)}.
                 </p>
            </div>

            {/* Charts (Hidden on Print if complex, but kept here for now as requested) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-tidemark-navy mb-6 flex items-center gap-2">
                    <PieChart size={18} className="text-emerald-500"/> 
                    Distribution Analysis (Sell-to-Cover)
                    </h3>
                    <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                            <Bar dataKey="netValue" name="Net Value (Kept)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={40} />
                            <Bar dataKey="withholding" name="Sold to Cover" stackId="a" fill="#64748b" maxBarSize={40} />
                            <Bar dataKey="taxGap" name="Tax Gap" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-tidemark-navy mb-6 flex items-center gap-2">
                    <Building size={18} className="text-tidemark-blue"/>
                    Tax Liability Breakdown
                    </h3>
                    <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                            <Bar dataKey="fedTax" name="Federal Tax" stackId="a" fill="#00558C" radius={[0, 0, 4, 4]} maxBarSize={40} />
                            <Bar dataKey="stateTax" name={`State (${client.state || 'Other'})`} stackId="a" fill="#1B365D" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            {/* Removed ISO AMT Line to prevent confusion with potential vs actual exercise */}
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Grants List & Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
                {/* Left: Active Grants */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full print:hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building size={18} className="text-slate-400" />
                        Active Grants
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {client.grants.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No grants recorded yet.</div>
                        ) : (
                        client.grants.map(grant => (
                            <div key={grant.id} className="p-5 hover:bg-slate-50 transition-colors group relative">
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditGrantClick(grant); }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Edit Grant"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteGrant(grant.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete Grant"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-800 text-lg">{grant.ticker || 'N/A'}</span>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${grant.type === 'ISO' ? 'bg-purple-100 text-purple-700' : 'bg-tidemark-blue/10 text-tidemark-navy'}`}>
                                    {grant.type}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-slate-600 mb-3">{grant.companyName}</div>
                                
                                <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
                                    <div>Price: <span className="font-medium text-slate-700">{formatCurrency(grant.currentPrice)}</span></div>
                                    {grant.type === 'ISO' && <div>Strike: <span className="font-medium text-slate-700">{formatCurrency(grant.strikePrice || 0)}</span></div>}
                                    <div>Total: <span className="font-medium text-slate-700">{formatNumber(grant.totalShares)}</span></div>
                                    <div>Rate: <span className="font-medium text-slate-700">{grant.withholdingRate || 22}%</span></div>
                                </div>
                            </div>
                        ))
                        )}
                    </div>
                </div>

                {/* Right: Detailed Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full print:col-span-3 print:border-slate-300 print:shadow-none print:h-auto break-inside-avoid">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:bg-white print:border-b-2 print:border-slate-300">
                        <h3 className="font-bold text-slate-800">Upcoming Vesting Schedule</h3>
                    </div>
                    <div className="overflow-x-auto flex-1 custom-scrollbar print:overflow-visible">
                        <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-slate-50 uppercase tracking-wider font-semibold border-b border-slate-100 print:bg-white print:text-black">
                            <tr>
                            <th className="px-4 py-4 print:py-2">Date</th>
                            <th className="px-4 py-4 print:py-2">Shares</th>
                            <th className="px-4 py-4 text-right print:py-2">Gross</th>
                            <th className="px-4 py-4 text-center print:py-2">Withholding</th>
                            <th className="px-4 py-4 text-right bg-slate-50 text-slate-600 print:bg-white print:text-black print:py-2">Sold to Cover</th>
                            <th className="px-4 py-4 text-right bg-emerald-50/50 text-emerald-900 border-x border-emerald-100/50 print:bg-white print:text-black print:border-none print:py-2">Net Shares</th>
                            <th className="px-4 py-4 text-right bg-emerald-50/50 text-emerald-700 border-r border-emerald-100/50 print:bg-white print:text-black print:border-none print:py-2">Net Value</th>
                            <th className="px-4 py-4 text-right print:py-2">Tax Gap</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                            {upcomingEvents.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                No upcoming vesting events found in the next 12 months.
                                </td>
                            </tr>
                            ) : (
                            upcomingEvents.map((event, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {event.date}
                                    <div className="text-[10px] text-slate-400 uppercase print:text-black">{event.grantType}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 print:text-black">{formatNumber(event.shares)}</td>
                                <td className="px-4 py-3 text-right text-slate-600 font-medium print:text-black">{formatCurrency(event.grossValue)}</td>
                                <td className="px-4 py-3 text-center">
                                    <div className="text-xs text-slate-500 print:text-black">{event.electedWithholdingRate}%</div>
                                    <div className="text-[10px] text-slate-400 print:hidden">({formatCurrency(event.withholdingAmount)})</div>
                                </td>
                                <td className="px-4 py-3 text-right bg-slate-50/50 text-slate-500 font-mono print:bg-white print:text-black">
                                    -{formatNumber(Math.round(event.sharesSoldToCover))}
                                </td>
                                <td className="px-4 py-3 text-right bg-emerald-50/30 text-emerald-900 font-medium border-x border-emerald-100/30 print:bg-white print:text-black print:border-none">
                                    {formatNumber(event.netShares)}
                                </td>
                                <td className="px-4 py-3 text-right bg-emerald-50/30 text-emerald-700 font-bold border-r border-emerald-100/30 print:bg-white print:text-black print:border-none">
                                    {formatCurrency(event.netValue)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {event.grantType === 'ISO' ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-slate-400 text-xs print:text-black">Unexercised</span>
                                    </div>
                                    ) : (
                                    event.taxGap > 0 ? (
                                        <span className="text-amber-600 font-medium text-xs print:text-black">+{formatCurrency(event.taxGap)}</span>
                                    ) : (
                                        <span className="text-emerald-600 text-xs font-medium print:text-black">Covered</span>
                                    )
                                    )}
                                </td>
                                </tr>
                            ))
                            )}
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Compliance Footer (Print Only) */}
      <div className="hidden print:block mt-8 pt-6 border-t border-slate-300">
         <p className="text-[10px] text-slate-500 text-justify leading-relaxed">
            <strong>Compliance Disclosure:</strong> Securities offered through EquityCompass Capital Markets, Member FINRA/SIPC. 
            Investment advisory services offered through EquityCompass Advisors, a registered investment adviser. 
            This report is generated by the EquityCompass platform for informational and planning purposes only. 
            It is based on information provided by the client and third-party sources deemed reliable but not guaranteed. 
            The projections, estimates, and tax calculations herein are hypothetical in nature, do not reflect actual investment results, 
            and are not guarantees of future performance. Market data and stock prices are delayed. 
            This report does not constitute tax, legal, or accounting advice. Clients should consult with their own 
            qualified tax advisor, estate planner, or attorney regarding their specific financial situation and before making any investment decisions.
            Past performance is not indicative of future results.
         </p>
      </div>

      <AddClientModal 
        isOpen={showEditClient} 
        onClose={() => setShowEditClient(false)} 
        onSave={handleEditClientSave}
        initialData={{ 
            name: client.name, 
            taxBracket: client.taxBracket, 
            state: client.state || 'CA',
            filingStatus: client.filingStatus,
            estimatedIncome: client.estimatedIncome,
            customStateTaxRate: client.customStateTaxRate,
            customLtcgTaxRate: client.customLtcgTaxRate,
            customAmtSafeHarbor: client.customAmtSafeHarbor
        }}
      />
    </div>
  );
};

// Simple Icon component for the RSU card
function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}