import React, { useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { parseDocument } from '../utils/documentParser';
import { Button } from './Button';
import { Grant, GrantType } from '../types';

interface BulkDocumentUploadProps {
  onGrantsExtracted: (grants: Array<Omit<Grant, 'id' | 'lastUpdated'>>) => void;
}

const BulkDocumentUpload: React.FC<BulkDocumentUploadProps> = ({ onGrantsExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedGrants, setExtractedGrants] = useState<Array<Omit<Grant, 'id' | 'lastUpdated'>>>([]);
  const [showReview, setShowReview] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploadedFile(file);
    setExtractedGrants([]);
    setShowReview(false);

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or Excel file.');
      return;
    }

    setIsProcessing(true);

    try {
      const grants = await parseDocument(file);

      if (grants.length === 0) {
        setError('No grants found in the document. Please check the document format.');
        setIsProcessing(false);
        return;
      }

      const formattedGrants = grants.map(grant => ({
        type: grant.type || 'RSU' as GrantType,
        ticker: grant.ticker?.toUpperCase() || '',
        companyName: grant.companyName || 'Unknown Company',
        currentPrice: 0,
        strikePrice: grant.strikePrice,
        grantDate: grant.grantDate || new Date().toISOString().split('T')[0],
        totalShares: grant.totalShares || 0,
        vestingSchedule: determineVestingSchedule(grant.cliffMonths, grant.vestingMonths),
        withholdingRate: grant.type === 'RSU' ? 22 : undefined,
      })) as Array<Omit<Grant, 'id' | 'lastUpdated'>>;

      setExtractedGrants(formattedGrants);
      setShowReview(true);
    } catch (err) {
      console.error('Document processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  const determineVestingSchedule = (cliffMonths?: number, vestingMonths?: number): Grant['vestingSchedule'] => {
    if (cliffMonths === 12 && vestingMonths === 48) {
      return 'standard_4y_1y_cliff';
    } else if (cliffMonths === 0 && vestingMonths === 48) {
      return 'standard_4y_quarterly';
    }
    return 'standard_4y_1y_cliff';
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
    setExtractedGrants([]);
    setShowReview(false);
  };

  const handleSaveGrants = () => {
    if (extractedGrants.length > 0) {
      onGrantsExtracted(extractedGrants);
    }
  };

  const handleRemoveGrant = (index: number) => {
    setExtractedGrants(extractedGrants.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-6">
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-slate-600 mb-2">
            Drag and drop equity grant documents here, or
          </p>
          <label htmlFor="bulk-file-upload">
            <Button
              type="button"
              variant="secondary"
              onClick={() => document.getElementById('bulk-file-upload')?.click()}
            >
              Browse Files
            </Button>
          </label>
          <input
            id="bulk-file-upload"
            type="file"
            accept=".pdf,.xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="text-xs text-slate-500 mt-2">
            Supports PDF and Excel files (multiple grants per document)
          </p>
        </div>
      ) : (
        <div className="border border-slate-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">{uploadedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(uploadedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 hover:bg-slate-100 rounded"
              disabled={isProcessing}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-blue-600 text-sm mt-3">
              <Loader2 className="animate-spin w-4 h-4" />
              <span>Processing document and extracting grants...</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showReview && extractedGrants.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm font-semibold text-slate-800">
              Found {extractedGrants.length} grant{extractedGrants.length > 1 ? 's' : ''} - Review before adding
            </p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedGrants.map((grant, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Grant #{index + 1} - {grant.companyName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {grant.type} • {grant.totalShares} shares
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveGrant(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove this grant"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Type:</span>
                    <span className="ml-2 font-medium text-slate-800">{grant.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Shares:</span>
                    <span className="ml-2 font-medium text-slate-800">{grant.totalShares}</span>
                  </div>
                  {grant.ticker && (
                    <div>
                      <span className="text-slate-500">Ticker:</span>
                      <span className="ml-2 font-medium text-slate-800">{grant.ticker}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Grant Date:</span>
                    <span className="ml-2 font-medium text-slate-800">{grant.grantDate}</span>
                  </div>
                  {grant.strikePrice && (
                    <div>
                      <span className="text-slate-500">Strike Price:</span>
                      <span className="ml-2 font-medium text-slate-800">${grant.strikePrice}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Vesting:</span>
                    <span className="ml-2 font-medium text-slate-800">
                      {grant.vestingSchedule === 'standard_4y_1y_cliff' ? '4yr/1yr cliff' : '4yr quarterly'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={handleSaveGrants} className="flex-1">
              Add {extractedGrants.length} Grant{extractedGrants.length > 1 ? 's' : ''}
            </Button>
            <Button variant="secondary" onClick={clearFile} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkDocumentUpload;
