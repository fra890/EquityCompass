import React, { useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { parseDocument, ExtractedGrantData, logParseResult } from '../utils/documentParser';
import { Button } from './Button';

interface DocumentUploadProps {
  onDataExtracted: (data: ExtractedGrantData[]) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDataExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel' ||
                   fileName.endsWith('.xlsx') ||
                   fileName.endsWith('.xls');

    if (!isPdf && !isExcel) {
      setError('Please upload a PDF or Excel file.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await parseDocument(file);
      logParseResult(result);

      if (result.grants.length === 0) {
        setError('No grant data found in document. Please check the file contains equity grant information.');
        return;
      }
      onDataExtracted(result.grants);
    } catch (err) {
      console.error('Document processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Import from Document
      </label>

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
            Drag and drop your equity grant document here, or
          </p>
          <label htmlFor="file-upload">
            <Button
              type="button"
              variant="secondary"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="text-xs text-slate-500 mt-2">
            Supports PDF and Excel files
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
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>Processing document...</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" onClick={clearFile} className="text-xs py-1 px-3">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {!error && uploadedFile && !isProcessing && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              Document processed successfully! Review the auto-filled fields below.
            </p>
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={clearFile} className="text-xs py-1 px-3">
              Upload Different File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
