import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, X, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { uploadReports } from '../services/api';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const MAX_FILES = 20;

const STATUS_META = {
  success: { label: 'Uploaded', icon: CheckCircle2, className: 'text-green-600' },
  duplicate: { label: 'Duplicate (skipped)', icon: AlertTriangle, className: 'text-yellow-600' },
  error: { label: 'Failed', icon: XCircle, className: 'text-red-600' },
};

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [employeeType, setEmployeeType] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFiles(e.dataTransfer.files);
  };

  const onFileSelect = (e) => {
    validateAndSetFiles(e.target.files);
  };

  const validateAndSetFiles = (fileList) => {
    setError('');
    setDuplicateWarning(null);
    setBatchResults(null);
    setBatchSummary(null);

    if (!fileList || fileList.length === 0) return;
    const selected = Array.from(fileList);

    if (selected.length > MAX_FILES) {
      setError(`You selected ${selected.length} files. Please select up to ${MAX_FILES} files at a time.`);
      return;
    }

    const invalid = selected.filter(f => !(f.name.endsWith('.xlsx') || f.name.endsWith('.xls')));
    if (invalid.length > 0) {
      setError(`Please upload valid Excel files only (.xlsx or .xls). Invalid: ${invalid.map(f => f.name).join(', ')}`);
      return;
    }

    setFiles(selected);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async (replace = false) => {
    if (files.length === 0 || !employeeType) return;

    setIsUploading(true);
    setError('');

    try {
      const { results, summary } = await uploadReports(files, employeeType, replace);

      if (results.length === 1) {
        const [result] = results;
        if (result.status === 'success') {
          navigate('/');
        } else if (result.status === 'duplicate') {
          setDuplicateWarning(result.message);
        } else {
          setError(result.message || 'Failed to upload report');
        }
      } else {
        setBatchResults(results);
        setBatchSummary(summary);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload report(s)');
    } finally {
      setIsUploading(false);
    }
  };

  const startOver = () => {
    setFiles([]);
    setError('');
    setDuplicateWarning(null);
    setBatchResults(null);
    setBatchSummary(null);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Upload Attendance Sheets</h2>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">What type of attendance sheet are you uploading?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEmployeeType('ACTIVE')}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                employeeType === 'ACTIVE'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              🟢 Active Employees
            </button>
            <button
              type="button"
              onClick={() => setEmployeeType('INACTIVE')}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                employeeType === 'INACTIVE'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              🔴 Inactive Employees
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">This type applies to every file in this upload.</p>
        </div>

        {files.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              !employeeType ? 'opacity-50 cursor-not-allowed border-gray-200' :
              isDragging ? 'border-primary bg-primary/5 cursor-pointer' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 cursor-pointer'
            }`}
            onDragOver={employeeType ? onDragOver : undefined}
            onDragLeave={employeeType ? onDragLeave : undefined}
            onDrop={employeeType ? onDrop : undefined}
            onClick={() => employeeType && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              multiple
              onChange={onFileSelect}
              disabled={!employeeType}
            />
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <UploadIcon className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Drag & Drop your Excel file(s) here</h3>
            <p className="text-sm text-gray-500">
              {employeeType ? 'or click to browse from your computer' : 'Select an employee type above to continue'}
            </p>
            <p className="text-xs text-gray-400 mt-4">Supported formats: .xlsx, .xls · Up to {MAX_FILES} files at a time</p>
          </div>
        ) : batchResults ? (
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="mb-4">
              <h4 className="font-medium text-gray-900">Upload Summary</h4>
              <p className="text-sm text-gray-500 mt-1">
                {batchSummary.success} uploaded, {batchSummary.duplicate} duplicate(s) skipped, {batchSummary.error} failed
                {' '}(of {batchSummary.total})
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg mb-6">
              {batchResults.map((r, i) => {
                const meta = STATUS_META[r.status];
                const StatusIcon = meta.icon;
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-sm text-gray-800 truncate" title={r.fileName}>{r.fileName}</span>
                    <span className={`flex items-center gap-1.5 text-sm font-medium shrink-0 ${meta.className}`}>
                      <StatusIcon className="w-4 h-4" /> {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={startOver} className="w-full">
                Upload More
              </Button>
              <Button variant="default" onClick={() => navigate('/')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">{files.length} file{files.length > 1 ? 's' : ''} selected</h4>
              <button
                onClick={startOver}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg mb-6">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-gray-800 truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start space-x-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {duplicateWarning ? (
              <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3 mb-4 text-yellow-800">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Duplicate Report Detected</h4>
                    <p className="text-sm mt-1">{duplicateWarning}</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={startOver} className="w-full">
                    Cancel
                  </Button>
                  <Button variant="default" onClick={() => handleUpload(true)} disabled={isUploading} className="w-full">
                    {isUploading ? 'Replacing...' : 'Replace Existing'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full h-12 text-lg"
                onClick={() => handleUpload(false)}
                disabled={isUploading}
              >
                {isUploading ? 'Parsing & Uploading...' : `Process ${files.length} File${files.length > 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
