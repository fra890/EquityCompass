import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Grant, GrantType, CustomVestingDate } from '../types';
import { fetchStockPrice } from '../services/geminiService';
import { Search, Loader2, PenLine, Plus, Trash2, Calendar } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import { ExtractedGrantData } from '../utils/documentParser';

interface GrantFormProps {
  onSave: (grant: Omit<Grant, 'id' | 'lastUpdated' | 'sales' | 'vestingPrices'>) => void;
  onCancel: () => void;
  initialData?: Grant; // Added for edit mode
}

export const GrantForm: React.FC<GrantFormProps> = ({ onSave, onCancel, initialData }) => {
  const [type, setType] = useState<GrantType>('RSU');
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [grantPrice, setGrantPrice] = useState<string>('');
  const [strikePrice, setStrikePrice] = useState<string>('');
  const [grantDate, setGrantDate] = useState('');
  const [totalShares, setTotalShares] = useState<string>('');
  const [vestingSchedule, setVestingSchedule] = useState<Grant['vestingSchedule']>('standard_4y_1y_cliff');
  const [withholdingRate, setWithholdingRate] = useState<string>('22');
  
  // Manual Overrides
  const [customHeldShares, setCustomHeldShares] = useState<string>('');
  const [averageCostBasis, setAverageCostBasis] = useState<string>('');
  const [showOverride, setShowOverride] = useState(false);

  // Custom Vesting Dates
  const [customVestingDates, setCustomVestingDates] = useState<CustomVestingDate[]>([]);

  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState('');

  // Pre-fill form if editing
  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'RSU');
      setTicker(initialData.ticker || '');
      setCompanyName(initialData.companyName || '');
      setCurrentPrice(initialData.currentPrice != null ? String(initialData.currentPrice) : '');
      setStrikePrice(initialData.strikePrice != null ? String(initialData.strikePrice) : '');
      setGrantPrice(initialData.grantPrice != null ? String(initialData.grantPrice) : '');
      setGrantDate(initialData.grantDate || '');
      setTotalShares(initialData.totalShares != null ? String(initialData.totalShares) : '');
      setVestingSchedule(initialData.vestingSchedule || 'standard_4y_1y_cliff');
      setWithholdingRate(initialData.withholdingRate != null ? String(initialData.withholdingRate) : '22');

      setCustomHeldShares(initialData.customHeldShares != null ? String(initialData.customHeldShares) : '');
      setAverageCostBasis(initialData.averageCostBasis != null ? String(initialData.averageCostBasis) : '');
      if (initialData.customHeldShares != null) setShowOverride(true);

      setCustomVestingDates(initialData.customVestingDates || []);
    } else {
      setType('RSU');
      setTicker('');
      setCompanyName('');
      setCurrentPrice('');
      setStrikePrice('');
      setGrantPrice('');
      setGrantDate('');
      setTotalShares('');
      setVestingSchedule('standard_4y_1y_cliff');
      setWithholdingRate('22');
      setCustomHeldShares('');
      setAverageCostBasis('');
      setShowOverride(false);
      setCustomVestingDates([]);
    }
  }, [initialData]);

  const handleTickerBlur = async () => {
    if (!ticker) return;

    if (!companyName) setCompanyName(ticker.toUpperCase());

    setIsFetchingPrice(true);
    setPriceError('');
    try {
      const data = await fetchStockPrice(ticker);
      setCurrentPrice(data.price.toString());
    } catch (err) {
      console.error(err);
      setPriceError('Could not auto-fetch price. Please enter manually.');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleDocumentData = async (grants: ExtractedGrantData[]) => {
    if (grants.length === 0) return;

    const data = grants[0];
    if (data.type) setType(data.type);
    if (data.ticker) {
      setTicker(data.ticker);
      // Auto-fetch stock price if ticker was extracted
      if (data.ticker.trim()) {
        setIsFetchingPrice(true);
        setPriceError('');
        try {
          const priceData = await fetchStockPrice(data.ticker);
          setCurrentPrice(priceData.price.toString());
        } catch (err) {
          console.error('Failed to fetch stock price:', err);
          setPriceError('Could not auto-fetch price. Please enter manually.');
        } finally {
          setIsFetchingPrice(false);
        }
      }
    }
    if (data.companyName) setCompanyName(data.companyName);
    if (data.strikePrice != null) setStrikePrice(String(data.strikePrice));
    if (data.grantDate) setGrantDate(data.grantDate);
    if (data.totalShares != null) setTotalShares(String(data.totalShares));

    if (data.cliffMonths != null && data.vestingMonths != null) {
      if (data.cliffMonths === 12 && data.vestingMonths === 48) {
        setVestingSchedule('standard_4y_1y_cliff');
      } else if (data.cliffMonths === 0 && data.vestingMonths === 48) {
        setVestingSchedule('standard_4y_quarterly');
      }
    }

    if (grants.length > 1) {
      alert(`Document contains ${grants.length} grants. Only the first grant has been pre-filled. Use "Upload Document" button to automatically import all grants.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!companyName?.trim()) {
      alert('Company name is required');
      return;
    }
    if (!currentPrice || isNaN(parseFloat(currentPrice)) || parseFloat(currentPrice) <= 0) {
      alert('Valid current price is required');
      return;
    }
    if (!totalShares || isNaN(parseFloat(totalShares)) || parseFloat(totalShares) <= 0) {
      alert('Valid total shares is required');
      return;
    }
    if (!grantDate) {
      alert('Grant date is required');
      return;
    }

    const validCustomVestingDates = vestingSchedule === 'custom'
      ? customVestingDates.filter(v => v.date && v.shares > 0)
      : undefined;

    if (vestingSchedule === 'custom' && (!validCustomVestingDates || validCustomVestingDates.length === 0)) {
      alert('Please add at least one valid vesting date with shares');
      return;
    }

    onSave({
      type,
      ticker: ticker.toUpperCase(),
      companyName: companyName.trim(),
      currentPrice: parseFloat(currentPrice),
      grantPrice: grantPrice ? parseFloat(grantPrice) : undefined,
      strikePrice: (type === 'ISO' || type === 'NSO') && strikePrice !== '' ? parseFloat(strikePrice) : undefined,
      grantDate,
      totalShares: parseFloat(totalShares),
      vestingSchedule,
      customVestingDates: validCustomVestingDates,
      withholdingRate: (type === 'RSU' || type === 'ESPP') ? parseFloat(withholdingRate) : undefined,
      customHeldShares: customHeldShares ? parseFloat(customHeldShares) : undefined,
      averageCostBasis: averageCostBasis ? parseFloat(averageCostBasis) : undefined
    });
  };

  const inputClass = "w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!initialData && (
        <DocumentUpload onDataExtracted={handleDocumentData} />
      )}

      {/* Type Selector */}
      <div>
        <label className={labelClass}>Grant Type</label>
        <div className="flex p-1 bg-slate-100 rounded-lg w-full">
           <button
             type="button"
             onClick={() => setType('RSU')}
             className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'RSU' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             RSU
           </button>
           <button
             type="button"
             onClick={() => setType('ISO')}
             className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'ISO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             ISO
           </button>
           <button
             type="button"
             onClick={() => setType('NSO')}
             className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'NSO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             NSO
           </button>
           <button
             type="button"
             onClick={() => setType('ESPP')}
             className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'ESPP' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             ESPP
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Ticker Symbol</label>
          <div className="relative">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className={`${inputClass} uppercase pr-10`}
              placeholder="e.g. TSLA"
            />
            <div className="absolute right-3 top-2.5">
               {isFetchingPrice ? (
                 <Loader2 className="animate-spin text-indigo-500" size={20} />
               ) : (
                 <button type="button" onClick={handleTickerBlur} disabled={!ticker} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <Search size={20} />
                 </button>
               )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Leave blank for private companies.</p>
        </div>
        
        <div>
           <label className={labelClass}>Company Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Tesla"
            />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Current Share Price ($)</label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            className={`${inputClass} ${priceError ? 'border-red-300 focus:ring-red-500' : ''}`}
            placeholder="0.00"
          />
          {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
        </div>

        <div>
             <label className={labelClass}>Price at Grant Date ($)</label>
             <input
               type="number"
               step="0.01"
               min="0"
               value={grantPrice}
               onChange={(e) => setGrantPrice(e.target.value)}
               className={inputClass}
               placeholder="Optional"
             />
             <p className="text-[10px] text-slate-500 mt-1">For historical comparisons.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {(type === 'ISO' || type === 'NSO') && (
           <div className="animate-fade-in">
             <label className={labelClass}>Strike Price ($)</label>
             <input
               type="number"
               required
               step="0.01"
               min="0"
               value={strikePrice}
               onChange={(e) => setStrikePrice(e.target.value)}
               className={inputClass}
               placeholder="0.00"
             />
           </div>
        )}

        {(type === 'RSU' || type === 'ESPP') && (
           <div className="animate-fade-in">
             <label className={labelClass}>Elected Withholding (%)</label>
             <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={withholdingRate}
                  onChange={(e) => setWithholdingRate(e.target.value)}
                  className={inputClass}
                  placeholder="22"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 font-medium">%</span>
             </div>
             <p className="text-xs text-slate-500 mt-1">Statutory default is 22%. High income is 37%.</p>
           </div>
        )}

        <div>
          <label className={labelClass}>Grant Date</label>
          <input
            type="date"
            required
            value={grantDate}
            onChange={(e) => setGrantDate(e.target.value)}
            className={inputClass}
          />
        </div>
        
        <div>
          <label className={labelClass}>Total Shares Granted</label>
          <input
            type="number"
            required
            min="1"
            value={totalShares}
            onChange={(e) => setTotalShares(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Vesting Schedule</label>
        <select
          value={vestingSchedule}
          onChange={(e) => {
            const newSchedule = e.target.value as Grant['vestingSchedule'];
            setVestingSchedule(newSchedule);
            if (newSchedule === 'custom' && customVestingDates.length === 0) {
              setCustomVestingDates([{ date: '', shares: 0 }]);
            }
          }}
          className={inputClass}
        >
          <option value="standard_4y_1y_cliff">Standard 4-Year (1 Year Cliff)</option>
          <option value="standard_4y_quarterly">Standard 4-Year (Quarterly Immediate)</option>
          <option value="custom">Custom Vesting Dates</option>
        </select>
        <p className="text-xs text-slate-500 mt-1">
          {vestingSchedule === 'standard_4y_1y_cliff'
            ? '25% vests after 1 year, then 1/16th quarterly thereafter.'
            : vestingSchedule === 'standard_4y_quarterly'
            ? '1/16th vests every quarter starting 3 months after grant.'
            : 'Enter specific vesting dates manually (e.g., SpaceX bi-annual vesting).'}
        </p>
      </div>

      {vestingSchedule === 'custom' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              Custom Vesting Dates
            </label>
            <button
              type="button"
              onClick={() => setCustomVestingDates([...customVestingDates, { date: '', shares: 0 }])}
              className="flex items-center gap-1 text-xs font-medium text-tidemark-blue hover:text-tidemark-blue/80 transition-colors"
            >
              <Plus size={14} />
              Add Date
            </button>
          </div>

          {customVestingDates.map((vest, index) => (
            <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Vest Date</label>
                <input
                  type="date"
                  value={vest.date}
                  onChange={(e) => {
                    const updated = [...customVestingDates];
                    updated[index].date = e.target.value;
                    setCustomVestingDates(updated);
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-tidemark-blue focus:border-tidemark-blue outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Shares</label>
                <input
                  type="number"
                  min="0"
                  value={vest.shares || ''}
                  onChange={(e) => {
                    const updated = [...customVestingDates];
                    updated[index].shares = parseFloat(e.target.value) || 0;
                    setCustomVestingDates(updated);
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-tidemark-blue focus:border-tidemark-blue outline-none"
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = customVestingDates.filter((_, i) => i !== index);
                  setCustomVestingDates(updated.length > 0 ? updated : [{ date: '', shares: 0 }]);
                }}
                className="mt-5 p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {customVestingDates.length > 0 && (
            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span>{customVestingDates.length} vesting event{customVestingDates.length !== 1 ? 's' : ''}</span>
              <span className="font-medium">
                Total: {customVestingDates.reduce((sum, v) => sum + (v.shares || 0), 0).toLocaleString()} shares
              </span>
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
         <button 
           type="button" 
           onClick={() => setShowOverride(!showOverride)} 
           className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
         >
           <PenLine size={16} />
           {showOverride ? 'Hide Manual Holdings' : 'Manually Edit Holdings (Override)'}
         </button>

         {showOverride && (
           <div className="mt-3 bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Actual Shares Held</label>
                  <input
                    type="number"
                    min="0"
                    value={customHeldShares}
                    onChange={(e) => setCustomHeldShares(e.target.value)}
                    className={inputClass}
                    placeholder="Auto-calculated if blank"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg. Cost Basis ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={averageCostBasis}
                    onChange={(e) => setAverageCostBasis(e.target.value)}
                    className={inputClass}
                    placeholder="Per Share Basis"
                  />
              </div>
              <p className="col-span-2 text-[10px] text-slate-400">
                Use this to override the system's "Sell-to-Cover" assumption for portfolio value calculations.
              </p>
           </div>
         )}
      </div>

      <div className="flex gap-3 pt-6 mt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {initialData ? 'Update Grant' : 'Add Grant'}
        </Button>
      </div>
    </form>
  );
};