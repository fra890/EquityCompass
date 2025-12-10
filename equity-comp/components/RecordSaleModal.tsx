import React, { useState } from 'react';
import { Grant, StockSale } from '../types';
import { Button } from './Button';
import { X, DollarSign } from 'lucide-react';

interface RecordSaleModalProps {
  grant: Grant;
  onSave: (sale: Omit<StockSale, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({ grant, onSave, onCancel }) => {
  const today = new Date().toISOString().split('T')[0];
  const [saleDate, setSaleDate] = useState(today);
  const [sharesSold, setSharesSold] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(grant.currentPrice);
  const [reason, setReason] = useState<string>('Diversification');
  const [notes, setNotes] = useState<string>('');

  const totalProceeds = sharesSold * salePrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (sharesSold <= 0) {
      alert('Shares sold must be greater than 0');
      return;
    }

    if (salePrice < 0) {
      alert('Sale price must be non-negative');
      return;
    }

    onSave({
      grantId: grant.id,
      saleDate,
      sharesSold,
      salePrice,
      totalProceeds,
      reason,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Record Stock Sale</h3>
              <p className="text-sm text-slate-500">{grant.companyName}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sale Date</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shares Sold</label>
            <input
              type="number"
              value={sharesSold || ''}
              onChange={(e) => setSharesSold(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sale Price per Share</label>
            <input
              type="number"
              value={salePrice || ''}
              onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Total Proceeds:</span>
              <span className="text-xl font-bold text-tidemark-navy">
                ${totalProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason for Sale</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
              required
            >
              <option value="Diversification">Diversification</option>
              <option value="Tax Payment">Tax Payment</option>
              <option value="Liquidity Need">Liquidity Need</option>
              <option value="Rebalancing">Rebalancing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none resize-none"
              rows={3}
              placeholder="Additional details about this sale..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Record Sale
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
