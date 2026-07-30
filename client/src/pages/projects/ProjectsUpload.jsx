import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadProjectsExcel } from '../../services/projectsApi';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ProjectsUpload() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    validateAndSetFile(e.dataTransfer.files);
  };

  const onFileSelect = (e) => {
    validateAndSetFile(e.target.files);
  };

  const validateAndSetFile = (fileList) => {
    setError('');
    setSuccessMessage('');

    if (!fileList || fileList.length === 0) return;
    const selected = fileList[0];

    if (!/\.(xlsx|xls|csv)$/i.test(selected.name)) {
      setError('Please upload a valid Excel or CSV file (.xlsx, .xls, or .csv).');
      return;
    }

    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    setError('');
    setSuccessMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await uploadProjectsExcel(file);
      setSuccessMessage(result.message || 'Upload successful.');
      setTimeout(() => navigate('/projects'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload the project sheet.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Upload Project Sheet</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Required columns: Months, Years, Brands, Project Name, Project Status
        </p>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={onFileSelect}
            />
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <UploadIcon className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Drag & Drop your Excel or CSV file here</h3>
            <p className="text-sm text-gray-500">or click to browse from your computer</p>
            <p className="text-xs text-gray-400 mt-4">Supported formats: .xlsx, .xls, .csv</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Selected file</h4>
              <button onClick={clearFile} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                Clear
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 gap-3 border border-gray-200 rounded-lg mb-6">
              <div className="flex items-center space-x-3 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-gray-800 truncate">{file.name}</span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                <button
                  onClick={clearFile}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start space-x-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="whitespace-pre-line">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-start space-x-3 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button className="w-full h-12 text-lg" onClick={handleUpload} disabled={isUploading || !!successMessage}>
              {isUploading ? 'Parsing & Uploading...' : 'Process File'}
            </Button>
            <p className="text-xs text-gray-400 mt-3 text-center">
              A new upload replaces the currently stored project dataset.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
