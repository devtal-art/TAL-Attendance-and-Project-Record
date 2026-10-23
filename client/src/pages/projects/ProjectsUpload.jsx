import React, { useMemo, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload as UploadIcon, FileSpreadsheet, X, AlertCircle, CheckCircle2, ListTree, Table2, ArrowLeft, Download } from 'lucide-react';
import { previewProjectsExcel, uploadProjectsExcel } from '../../services/projectsApi';
import { Button } from '../../components/ui/button';
import ProjectsSummaryCards from '../../components/projects/ProjectsSummaryCards';
import HierarchyTree from '../../components/projects/HierarchyTree';
import ProjectsTable from '../../components/projects/ProjectsTable';
import ValidationDuplicatesPanel from '../../components/projects/ValidationDuplicatesPanel';
import { useNavigate } from 'react-router-dom';

// Mirrors the exact headers projectExcelParser.service.js resolves on the
// server: Year, Brand, Category, Department, Month, Task Name are required;
// Week No. and Links are optional (a sheet without them still parses fine -
// see the parser's OPTIONAL_HEADER_ALIASES). Links demonstrates the one
// line per "Label: https://..." pair format the parser expects; a row left
// blank there shows that's fine too.
const SAMPLE_ROWS = [
  {
    Year: 2026,
    Brand: 'Norris Hauz Cafe',
    Category: 'Social Media',
    Department: 'Design',
    'Week No.': 3,
    Month: 'Jan',
    'Task Name': 'Instagram post - new menu launch',
    Links: 'Screenshot: https://shortlink.gs39.co.in/r.php?c=B372Mv\nScreenshot 2: https://shortlink.gs39.co.in/r.php?c=fFUGDY',
    Status: 'Delivered',
  },
  {
    Year: 2026,
    Brand: 'Norris Hauz Cafe',
    Category: 'Website',
    Department: 'Development',
    'Week No.': '',
    Month: 'Jan',
    'Task Name': 'Homepage banner update',
    Links: '',
    Status: 'In Progress',
  },
  {
    Year: 2026,
    Brand: 'Example Brand',
    Category: 'Poster, Flyer & Catalogue',
    Department: 'Digital Marketing',
    'Week No.': 8,
    Month: 'Feb',
    'Task Name': 'Ramadan promo flyer',
    Links: 'Screenshot: https://shortlink.gs39.co.in/r.php?c=fFUGDY',
    Status: 'Not Started',
  },
];

const downloadSampleSheet = () => {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_ROWS);
  worksheet['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 9 }, { wch: 8 }, { wch: 40 }, { wch: 55 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
  XLSX.writeFile(workbook, 'project_sheet_sample_format.xlsx');
};

export default function ProjectsUpload() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState('select'); // 'select' | 'preview'
  const [previewData, setPreviewData] = useState(null); // { records, invalidCount, duplicateCount }
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'hierarchy'
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const validRecords = useMemo(
    () => (previewData ? previewData.records.filter((r) => r.valid) : []),
    [previewData],
  );

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

  const resetToSelect = () => {
    setStep('select');
    setPreviewData(null);
    setFile(null);
    setError('');
    setSuccessMessage('');
    setViewMode('hierarchy');
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsParsing(true);
    setError('');

    try {
      const result = await previewProjectsExcel(file);
      setPreviewData(result);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse the project sheet.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!file) return;

    setIsSaving(true);
    setError('');

    try {
      const result = await uploadProjectsExcel(file);
      setSuccessMessage(result.message || 'Upload successful.');
      setTimeout(() => navigate('/projects'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the project sheet.');
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 'preview' && previewData) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={resetToSelect} className="text-gray-400 hover:text-gray-700 shrink-0" title="Choose a different file">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900">Review before saving</h2>
              <p className="text-sm text-gray-500 truncate max-w-md">{file?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">New rows are added to your existing projects — nothing already saved is deleted. The only change to an existing project is filling in a Status it doesn't have yet.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={resetToSelect} disabled={isSaving} className="flex-1 sm:flex-none">Choose a different file</Button>
            <Button onClick={handleConfirmSave} disabled={isSaving || !!successMessage} className="flex-1 sm:flex-none">
              {isSaving ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="whitespace-pre-line">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-start space-x-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <ProjectsSummaryCards records={validRecords} />

        <ValidationDuplicatesPanel
          records={previewData.records}
          invalidCount={previewData.invalidCount}
          duplicateCount={previewData.duplicateCount}
          existingDuplicateCount={previewData.existingDuplicateCount}
          statusUpdateCount={previewData.statusUpdateCount}
          unrecognizedStatusCount={previewData.unrecognizedStatusCount}
        />

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Table2 className="w-4 h-4" /> Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'hierarchy' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ListTree className="w-4 h-4" /> Hierarchy View
            </button>
          </div>

          {viewMode === 'hierarchy' ? (
            <HierarchyTree records={validRecords} />
          ) : (
            <ProjectsTable
              records={previewData.records}
              getRowFlags={(r) => ({ invalid: !r.valid, duplicate: r.isDuplicate || r.existsInDatabase })}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Upload Project Sheet</h2>
        <p className="text-sm text-gray-500 mb-1 text-center">
          Required columns: Year, Brand, Category, Department, Month, Task Name
        </p>
        <p className="text-xs text-gray-400 mb-4 text-center">
          Optional: Week No., Links (one "Label: https://..." per line), Status (Delivered, Cancelled, Hold, Review, In Progress or Not Started) — see the sample format
        </p>
        <div className="flex justify-center mb-6">
          <Button type="button" variant="outline" size="sm" onClick={downloadSampleSheet}>
            <Download className="w-4 h-4 mr-2" /> Download Sample Format
          </Button>
        </div>

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

            <Button className="w-full h-12 text-lg" onClick={handleProcess} disabled={isParsing}>
              {isParsing ? 'Parsing...' : 'Process File'}
            </Button>
            <p className="text-xs text-gray-400 mt-3 text-center">
              You'll be able to review the parsed data before it's saved. New rows are added to your existing projects — nothing already saved is deleted. The only change to an existing project is filling in a Status it doesn't have yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
