import React, { useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { parseDocument, logParseResult, ParseResult } from '../utils/documentParser';
import { Button } from './Button';
import { Grant, GrantType } from '../types';

interface ExistingGrantInfo {
  externalGrantId: string;
  totalShares: number;
  grantDate: string;
  type: GrantType;
  ticker: string;
}

interface BulkDocumentUploadProps {
  onGrantsExtracted: (grants: Array<Omit<Grant, 'id' | 'lastUpdated'>>) => void;
  existingGrantIds?: string[];
  existingGrants?: ExistingGrantInfo[];
}

interface ConflictWarning {
  grantId: string;
  field: string;
  existingValue: string | number;
  newValue: string | number;
}

const BulkDocumentUpload: React.FC<BulkDocumentUploadProps> = ({
  onGrantsExtracted,
  existingGrantIds = [],
  existingGrants = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedGrants, setExtractedGrants] = useState<Array<Omit<Grant, 'id' | 'lastUpdated'>>>([]);
  const [showReview, setShowReview] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<ConflictWarning[]>([]);

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
    setWarnings([]);
    setDuplicateWarnings([]);
    setConflictWarnings([]);

    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel' ||
                   fileName.endsWith('.xlsx') ||
                   fileName.endsWith('.xls') ||
                   fileName.endsWith('.csv');

    if (!isPdf && !isExcel) {
      setError('Please upload a PDF or Excel file.');
      return;
    }

    setIsProcessing(true);

    try {
      const result: ParseResult = await parseDocument(file);

      logParseResult(result);

      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      if (result.grants.length === 0) {
        setError('No grants found in the document. Please check the document format.');
        setIsProcessing(false);
        return;
      }

      const duplicates: string[] = [];
      const conflicts: ConflictWarning[] = [];

      const formattedGrants = result.grants
        .filter(grant => {
          if (grant.externalGrantId && existingGrantIds.includes(grant.externalGrantId)) {
            const existingGrant = existingGrants.find(g => g.externalGrantId === grant.externalGrantId);

            if (existingGrant) {
              if (existingGrant.totalShares !== grant.totalShares) {
                conflicts.push({
                  grantId: grant.externalGrantId,
                  field: 'Total Shares',
                  existingValue: existingGrant.totalShares,
                  newValue: grant.totalShares || 0
                });
              }
              if (existingGrant.type !== grant.type) {
                conflicts.push({
                  grantId: grant.externalGrantId,
                  field: 'Grant Type',
                  existingValue: existingGrant.type,
                  newValue: grant.type || 'RSU'
                });
              }
              if (existingGrant.grantDate !== grant.grantDate) {
                conflicts.push({
                  grantId: grant.externalGrantId,
                  field: 'Grant Date',
                  existingValue: existingGrant.grantDate,
                  newValue: grant.grantDate || ''
                });
              }
            }

            duplicates.push(`Duplicate grant skipped: ${grant.externalGrantId} (${grant.type} - ${grant.totalShares} shares)`);
            console.log(`[BulkUpload] Duplicate grant skipped: ${grant.externalGrantId}`);
            return false;
          }
          return true;
        })
        .map(grant => ({
          type: grant.type || 'RSU' as GrantType,
          ticker: grant.ticker?.toUpperCase() || '',
          companyName: grant.companyName || 'Unknown Company',
          currentPrice: 0,
          strikePrice: grant.strikePrice,
          grantDate: grant.grantDate || new Date().toISOString().split('T')[0],
          totalShares: grant.totalShares || 0,
          vestingSchedule: determineVestingSchedule(grant.cliffMonths, grant.vestingMonths, grant.type),
          withholdingRate: grant.type === 'RSU' ? 22 : undefined,
          customHeldShares: 0,
          externalGrantId: grant.externalGrantId,
          esppDiscountPercent: grant.esppDiscountPercent,
          esppPurchasePrice: grant.esppPurchasePrice,
          esppOfferingStartDate: grant.esppOfferingStartDate,
          esppOfferingEndDate: grant.esppOfferingEndDate,
          esppFmvAtOfferingStart: grant.esppFmvAtOfferingStart,
          esppFmvAtPurchase: grant.esppFmvAtPurchase,
        })) as Array<Omit<Grant, 'id' | 'lastUpdated'>>;

      if (duplicates.length > 0) {
        setDuplicateWarnings(duplicates);
      }

      if (conflicts.length > 0) {
        setConflictWarnings(conflicts);
      }

      if (formattedGrants.length === 0 && duplicates.length > 0) {
        setError('All grants in this document already exist for this client.');
        setIsProcessing(false);
        return;
      }

      setExtractedGrants(formattedGrants);
      setShowReview(true);
    } catch (err) {
      console.error('Document processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  const determineVestingSchedule = (
    cliffMonths?: number,
    vestingMonths?: number,
    grantType?: GrantType
  ): Grant['vestingSchedule'] => {
    if (grantType === 'ESPP') {
      return 'immediate';
    }
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
    setWarnings([]);
    setDuplicateWarnings([]);
    setConflictWarnings([]);
  };

  const handleSaveGrants = () => {
    if (extractedGrants.length > 0) {
      onGrantsExtracted(extractedGrants);
    }
  };

  const handleRemoveGrant = (index: number) => {
    setExtractedGrants(extractedGrants.filter((_, i) => i !== index));
  };

  const formatGrantType = (type: GrantType): string => {
    switch (type) {
      case 'RSU': return 'RSU';
      case 'ISO': return 'ISO';
      case 'NSO': return 'NSO';
      case 'ESPP': return 'ESPP';
      default: return type;
    }
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
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="text-xs text-slate-500 mt-2">
            Supports PDF and Excel files (RSU, ISO, NSO, ESPP grants)
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

      {warnings.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Warnings</p>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {duplicateWarnings.length > 0 && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800">Duplicate Grants Detected</p>
              <ul className="text-sm text-orange-700 mt-1 list-disc list-inside">
                {duplicateWarnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {conflictWarnings.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">DATA CONFLICT DETECTED</p>
              <p className="text-xs text-red-700 mb-2">
                The following grants have conflicting data between the document and existing records. Please verify which is correct.
              </p>
              <div className="space-y-2">
                {conflictWarnings.map((conflict, i) => (
                  <div key={i} className="text-sm bg-white rounded p-2 border border-red-200">
                    <div className="font-medium text-red-800">Grant ID: {conflict.grantId}</div>
                    <div className="text-red-700 mt-1">
                      <span className="font-medium">{conflict.field}:</span>
                      <span className="ml-2">Existing: <span className="font-mono bg-red-100 px-1 rounded">{conflict.existingValue}</span></span>
                      <span className="ml-2">New: <span className="font-mono bg-red-100 px-1 rounded">{conflict.newValue}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <div className="mt-3">
            <Button variant="secondary" onClick={clearFile} className="text-xs py-1 px-3">
              Try Again
            </Button>
          </div>
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
                      {formatGrantType(grant.type)} - {grant.totalShares} shares
                      {grant.externalGrantId && (
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">
                          ID: {grant.externalGrantId}
                        </span>
                      )}
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
                    <span className="ml-2 font-medium text-slate-800">{formatGrantType(grant.type)}</span>
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
                  {grant.type === 'ESPP' && grant.esppDiscountPercent && (
                    <div>
                      <span className="text-slate-500">Discount:</span>
                      <span className="ml-2 font-medium text-slate-800">{grant.esppDiscountPercent}%</span>
                    </div>
                  )}
                  {grant.type === 'ESPP' && grant.esppPurchasePrice && (
                    <div>
                      <span className="text-slate-500">Purchase Price:</span>
                      <span className="ml-2 font-medium text-slate-800">${grant.esppPurchasePrice}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Vesting:</span>
                    <span className="ml-2 font-medium text-slate-800">
                      {grant.vestingSchedule === 'standard_4y_1y_cliff' ? '4yr/1yr cliff' :
                       grant.vestingSchedule === 'immediate' ? 'Immediate' : '4yr quarterly'}
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
