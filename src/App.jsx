import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  FileText, Upload, CheckCircle, XCircle, AlertTriangle,
  Download, Globe, Trash2, Link, AlertOctagon, Info,
  ChevronRight, Package, FileWarning, Copy, Loader2,
  Sparkles, FileSpreadsheet, MinusCircle, Check, ArrowRight,
  ShieldCheck, FileCheck, FileSignature, CheckCircle2,
  Circle, FileX, RefreshCw
} from 'lucide-react';
import { en, bn } from './i18n/translations.js';
import { validateRequirements } from './lib/validation.js';
import { calculateFileHash, detectDuplicates, canMatchFile } from './lib/duplicate.js';
import { getDocumentStatus, hasBlockingProblems, getStatusSummary } from './lib/status.js';
import { getPdfPageCount, isPdfFile } from './lib/pdf.js';
import { generatePackage, downloadPdf } from './lib/package.js';

// ─── Constants ──────────────────────────────────────────────────────
const MAX_FILES = 30;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── Status Badge Component ────────────────────────────────────────
function StatusBadge({ status, t }) {
  const config = {
    ok: { icon: CheckCircle2, label: t.statusOk, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    missing: { icon: XCircle, label: t.statusMissing, classes: 'bg-red-50 text-red-700 border-red-200' },
    expiry_needed: { icon: AlertTriangle, label: t.statusExpiryNeeded, classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    expired: { icon: XCircle, label: t.statusExpired, classes: 'bg-red-50 text-red-700 border-red-200' },
    not_provided: { icon: MinusCircle, label: t.statusNotProvided, classes: 'bg-slate-50 text-slate-500 border-slate-200' },
  };
  const c = config[status] || config.not_provided;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${c.classes}`}>
      <Icon size={14} strokeWidth={2.5} />
      {c.label}
    </span>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────────
function StepIndicator({ currentStep, t }) {
  const steps = [
    { num: 1, label: t.step1 || 'Requirements', icon: FileText },
    { num: 2, label: t.step2 || 'Documents', icon: Upload },
    { num: 3, label: t.step3 || 'Review & Validate', icon: ShieldCheck },
    { num: 4, label: t.step4 || 'Generate', icon: Package },
  ];
  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      <div className="flex items-center justify-between relative">
        {/* Connecting Lines */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 z-0 hidden sm:block"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 z-0 transition-all duration-500 hidden sm:block"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;
          const isFuture = currentStep < step.num;

          return (
            <div key={step.num} className="relative z-10 flex flex-col items-center gap-2 bg-slate-50 sm:bg-transparent px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 shadow-sm
                ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                ${isActive ? 'bg-white border-blue-600 text-blue-600' : ''}
                ${isFuture ? 'bg-white border-slate-200 text-slate-300' : ''}
              `}>
                {isDone ? <Check strokeWidth={3} size={20} /> : <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />}
              </div>
              <span className={`text-xs sm:text-sm font-semibold transition-colors duration-300
                ${isDone ? 'text-slate-800' : ''}
                ${isActive ? 'text-blue-700' : ''}
                ${isFuture ? 'text-slate-400' : ''}
              `}>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">Step {step.num}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('en');
  const t = lang === 'en' ? en : bn;

  const [tender, setTender] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');

  const fileInputRef = useRef(null);
  const reqInputRef = useRef(null);

  const duplicateFileIds = useMemo(() => detectDuplicates(uploadedFiles), [uploadedFiles]);

  const currentStep = useMemo(() => {
    if (!tender) return 1;
    if (uploadedFiles.length === 0) return 2;
    if (generatedPdf) return 4;
    return 3;
  }, [tender, uploadedFiles.length, generatedPdf]);

  const summary = useMemo(() => {
    if (!tender || requirements.length === 0) return null;
    return getStatusSummary(requirements, matches, tender.submission_deadline);
  }, [tender, requirements, matches]);

  const isBlocking = useMemo(() => {
    if (!tender || requirements.length === 0) return true;
    return hasBlockingProblems(requirements, matches, tender.submission_deadline);
  }, [tender, requirements, matches]);

  const handleLoadRequirements = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const result = validateRequirements(text);
      if (!result.valid) {
        setError(t[result.error] || result.error);
        return;
      }
      setTender(result.data.tender);
      setRequirements(result.data.requirements);
      setMatches([]);
      setUploadedFiles([]);
      setGeneratedPdf(null);
      setStep(2);
    } catch (err) {
      setError(t.invalidJSON);
    }
  }, [t]);

  const handleFileUpload = useCallback(async (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    setError(null);

    if (uploadedFiles.length + newFiles.length > MAX_FILES) {
      setError(t.tooManyFiles);
      return;
    }

    const currentSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const newSize = newFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_TOTAL_SIZE) {
      setError(t.fileTooLarge);
      return;
    }

    const processed = [];
    for (const file of newFiles) {
      if (!isPdfFile(file)) {
        setError(`"${file.name}" ${t.notPDF}`);
        continue;
      }
      const arrayBuffer = await file.arrayBuffer();
      const hash = await calculateFileHash(arrayBuffer);
      const { pages, error: pdfError } = await getPdfPageCount(arrayBuffer);
      processed.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        hash,
        pages,
        error: pdfError ? (t[pdfError] || pdfError) : null,
        arrayBuffer
      });
    }
    setUploadedFiles(prev => [...prev, ...processed]);
    setGeneratedPdf(null);
  }, [uploadedFiles, t]);

  const handleRemoveFile = useCallback((id) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    setMatches(prev => prev.filter(m => m.fileId !== id));
    setGeneratedPdf(null);
  }, []);

  const handleMatch = useCallback((requirementId, fileId) => {
    setMatches(prev => {
      const withoutReq = prev.filter(m => m.requirementId !== requirementId);
      if (!fileId) return withoutReq;
      const withoutFile = withoutReq.filter(m => m.fileId !== fileId);
      return [...withoutFile, { requirementId, fileId, expiryDate: '' }];
    });
    setGeneratedPdf(null);
  }, []);

  const handleExpiryDate = useCallback((requirementId, date) => {
    setMatches(prev => prev.map(m =>
      m.requirementId === requirementId ? { ...m, expiryDate: date } : m
    ));
    setGeneratedPdf(null);
  }, []);

  const handleAutoMatch = useCallback(() => {
    const newMatches = [...matches];
    const matchedFileIds = new Set(newMatches.map(m => m.fileId));
    const matchedReqIds = new Set(newMatches.map(m => m.requirementId));

    for (const req of requirements) {
      if (matchedReqIds.has(req.id)) continue;
      const reqWords = req.title_en.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      let bestMatch = null;
      let bestScore = 0;

      for (const file of uploadedFiles) {
        if (matchedFileIds.has(file.id)) continue;
        if (file.error) continue;
        if (duplicateFileIds.has(file.id)) {
          const dupGroup = uploadedFiles.filter(f => f.hash === file.hash);
          const dupAlreadyMatched = dupGroup.some(f => matchedFileIds.has(f.id));
          if (dupAlreadyMatched) continue;
        }
        const nameClean = file.name.toLowerCase()
          .replace(/\.pdf$/, '')
          .replace(/[_\-\.]/g, ' ')
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/);

        let score = 0;
        for (const word of reqWords) {
          if (word.length < 2) continue;
          if (nameClean.some(nw => nw.includes(word) || word.includes(nw))) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = file;
        }
      }
      if (bestMatch && bestScore >= 1) {
        newMatches.push({ requirementId: req.id, fileId: bestMatch.id, expiryDate: '' });
        matchedFileIds.add(bestMatch.id);
        matchedReqIds.add(req.id);
      }
    }
    setMatches(newMatches);
    setGeneratedPdf(null);
  }, [requirements, uploadedFiles, matches, duplicateFileIds]);

  const handleClearMatches = useCallback(() => {
    setMatches([]);
    setGeneratedPdf(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isBlocking || !tender) return;
    setGenerating(true);
    setError(null);
    try {
      const pdfBytes = await generatePackage(tender, requirements, matches, uploadedFiles);
      const filename = `${tender.tender_id}_Package.pdf`;
      setGeneratedPdf(pdfBytes);
      setGeneratedFilename(filename);
    } catch (err) {
      setError('Failed to generate package: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }, [isBlocking, tender, requirements, matches, uploadedFiles]);

  const handleDownload = useCallback(() => {
    if (generatedPdf && generatedFilename) {
      downloadPdf(generatedPdf, generatedFilename);
    }
  }, [generatedPdf, generatedFilename]);

  const handleExportCSV = useCallback(() => {
    if (!tender || requirements.length === 0) return;
    const rows = [['Document', 'File Name', 'Pages', 'Expiry Date', 'Status']];
    for (const req of requirements) {
      const match = matches.find(m => m.requirementId === req.id);
      const file = match ? uploadedFiles.find(f => f.id === match.fileId) : null;
      const { status } = getDocumentStatus(req, match?.fileId, match?.expiryDate, tender.submission_deadline);
      rows.push([
        req.title_en,
        file ? file.name : '',
        file ? String(file.pages) : '',
        match?.expiryDate || '',
        status
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tender.tender_id}_status.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tender, requirements, matches, uploadedFiles]);

  const getAvailableFiles = useCallback((requirementId) => {
    const currentMatch = matches.find(m => m.requirementId === requirementId);
    return uploadedFiles.filter(f => {
      if (f.error) return false;
      if (currentMatch && currentMatch.fileId === f.id) return true;
      if (matches.some(m => m.fileId === f.id && m.requirementId !== requirementId)) return false;
      if (!canMatchFile(f.id, uploadedFiles, matches.filter(m => m.requirementId !== requirementId))) return false;
      return true;
    });
  }, [uploadedFiles, matches]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [dragOver, setDragOver] = useState(false);
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-20">
      {/* ── Premium Header ────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-md flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-slate-900 leading-tight">Tender Package Builder</h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">AI DevFest 2026</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {tender && (
              <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                <FileCheck size={14} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">{tender.tender_id}</span>
              </div>
            )}
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Globe size={16} />
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
        <StepIndicator currentStep={currentStep} t={t} />

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertOctagon size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm font-medium flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 1: Hero Empty State ─────────────────────────────── */}
        {!tender && (
          <div className="max-w-3xl mx-auto mt-16 text-center">
            <span className="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest text-blue-700 bg-blue-50 rounded-full border border-blue-100 uppercase">
              Tender Package Workspace
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              Tender Document Package Builder
            </h2>
            <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Prepare compliant tender submissions faster, with automatic document validation, expiry checks and PDF packaging.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-12 text-sm font-medium text-slate-700">
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Validate requirements</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Detect duplicates</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Check expiry dates</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Generate final package</div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <label 
                className="block w-full p-12 cursor-pointer hover:bg-slate-50 transition-colors group relative"
              >
                <input
                  ref={reqInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleLoadRequirements}
                  className="hidden"
                />
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                  <FileText size={40} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Drop requirements.json here</h3>
                <p className="text-slate-500 mb-8">or browse from your computer</p>
                
                <span className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold shadow-md shadow-blue-200 transition-all">
                  Load Tender Requirements
                  <ArrowRight size={18} />
                </span>
              </label>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                Your documents are processed locally in your browser.
              </div>
            </div>
          </div>
        )}

        {/* ── WORKSPACE DASHBOARD ──────────────────────────────────── */}
        {tender && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Tender Summary Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{tender.title}</h2>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                      Workspace Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tender ID</p>
                      <p className="font-mono font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded inline-block">{tender.tender_id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Submission Deadline</p>
                      <p className="font-semibold text-red-600">{tender.submission_deadline}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Procuring Entity</p>
                      <p className="font-medium text-slate-800">{tender.procuring_entity}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bidder</p>
                      <p className="font-medium text-slate-800">{tender.bidder}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Health Dashboard */}
            {summary && (
              <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="flex-1 w-full">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                      <ShieldCheck className={isBlocking ? "text-amber-400" : "text-emerald-400"} />
                      Document Readiness
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      {isBlocking 
                        ? <span className="text-amber-300 font-medium">{summary.blocking} issues require attention</span>
                        : <span className="text-emerald-300 font-medium">All mandatory documents are ready for packaging.</span>
                      }
                    </p>
                    
                    {(() => {
                      const readyCount = requirements.length - summary.blocking;
                      const readyPercentage = requirements.length > 0 ? (readyCount / requirements.length * 100) : 0;
                      return (
                        <>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${readyPercentage}%` }}></div>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-400 flex justify-between">
                            <span>{readyCount} of {requirements.length} requirements ready</span>
                            <span>{readyPercentage.toFixed(0)}%</span>
                          </div>
                        </>
                      );
                    })()}
                    <div className="mt-2 text-xs font-semibold text-slate-400 flex justify-between">
                      <span>{summary.ok} of {requirements.length} ready</span>
                      <span>{(summary.ok / requirements.length * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto shrink-0">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                      <div className="text-2xl font-bold text-emerald-400 mb-1">{summary.ok}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OK</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                      <div className="text-2xl font-bold text-red-400 mb-1">{summary.missing + summary.expired}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Missing</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                      <div className="text-2xl font-bold text-amber-400 mb-1">{summary.expiryNeeded}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiry</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                      <div className="text-2xl font-bold text-slate-400 mb-1">{summary.notProvided}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Optional</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Uploads */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Upload size={18} className="text-blue-600" /> Upload Documents
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Up to 30 files • 50 MB total</p>
                  </div>
                  
                  <div className={uploadedFiles.length > 0 ? "p-3" : "p-5"}>
                    <label 
                      className={`block w-full border-2 border-dashed rounded-xl text-center cursor-pointer transition-all
                        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                        ${uploadedFiles.length > 0 ? 'p-4' : 'p-8'}
                      `}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className={`flex items-center justify-center ${uploadedFiles.length > 0 ? 'gap-3 flex-row' : 'flex-col gap-3'}`}>
                        <Upload size={uploadedFiles.length > 0 ? 20 : 24} className="text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Drop PDF files here {uploadedFiles.length > 0 ? 'to add more' : ''}</p>
                          {uploadedFiles.length === 0 && <p className="text-xs text-slate-500 mt-1">or click to browse</p>}
                        </div>
                      </div>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uploaded Files ({uploadedFiles.length})</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
                        {uploadedFiles.map(file => {
                          const isDup = duplicateFileIds.has(file.id);
                          const isMatched = matches.some(m => m.fileId === file.id);
                          return (
                            <div key={file.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors shadow-sm">
                              <div className="flex items-start gap-3">
                                <FileText size={28} className={isDup ? "text-amber-500" : "text-blue-500"} strokeWidth={1.5} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate" title={file.name}>{file.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{file.pages} {t.pages} • {formatSize(file.size)}</p>
                                  
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {isMatched ? (
                                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">MATCHED</span>
                                    ) : (
                                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">UNMATCHED</span>
                                    )}
                                    {isDup && (
                                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                        <AlertTriangle size={10} /> DUPLICATE
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveFile(file.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                  title={t.remove}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {duplicateFileIds.size > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 shadow-sm">
                    <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 mb-1">Duplicate documents detected</h4>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Files with identical content have been detected. The system will prevent matching the same duplicate content to multiple requirements.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Matching */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    <Link size={20} className="text-blue-600" /> Match Documents
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAutoMatch}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <Sparkles size={14} /> Auto-Match
                    </button>
                  </div>
                </div>

                {requirements.map((req, idx) => {
                  const match = matches.find(m => m.requirementId === req.id);
                  const matchedFile = match ? uploadedFiles.find(f => f.id === match.fileId) : null;
                  const { status } = getDocumentStatus(req, match?.fileId, match?.expiryDate, tender.submission_deadline);
                  
                  return (
                    <div key={req.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col sm:flex-row transition-all hover:border-slate-300">
                      {/* Left: Requirement Details */}
                      <div className="p-3 sm:p-4 sm:w-5/12 bg-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="flex gap-2 mb-2">
                            <span className="w-6 h-6 rounded bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {req.order}
                            </span>
                            <h4 className="font-semibold text-slate-900 text-sm leading-tight">
                              {lang === 'en' ? req.title_en : (req.title_bn || req.title_en)}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-8">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${req.mandatory ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {req.mandatory ? t.mandatory : t.optional}
                            </span>
                            {req.has_expiry && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Expiry Req
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 ml-8">
                          <StatusBadge status={status} t={t} />
                        </div>
                      </div>

                      {/* Right: Action / Matching */}
                      <div className="p-3 sm:p-4 sm:w-7/12 flex flex-col justify-center gap-3">
                        {!matchedFile ? (
                          <div className="w-full">
                            <select
                              value=""
                              onChange={(e) => handleMatch(req.id, e.target.value)}
                              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                            >
                              <option value="" disabled>Select document...</option>
                              {getAvailableFiles(req.id).map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.pages} pg)</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileCheck size={16} className="text-blue-600 flex-shrink-0" />
                                <span className="text-sm font-semibold text-slate-800 truncate" title={matchedFile.name}>
                                  {matchedFile.name}
                                </span>
                              </div>
                              <button
                                onClick={() => handleMatch(req.id, null)}
                                className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1 rounded bg-white border border-slate-200 hover:border-red-200 transition-colors flex-shrink-0"
                              >
                                Change
                              </button>
                            </div>

                            {req.has_expiry && (
                              <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Expiry:</span>
                                <input
                                  type="date"
                                  value={match.expiryDate || ''}
                                  onChange={(e) => handleExpiryDate(req.id, e.target.value)}
                                  className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium
                                    ${!match.expiryDate ? 'border-amber-300 bg-amber-50' : 'border-slate-300'}
                                  `}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── PACKAGE GENERATION ──────────────────────────────────── */}
            <div className="mt-12 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Package Readiness</h3>
                  {isBlocking ? (
                    <p className="text-amber-300 font-medium text-sm flex items-center justify-center md:justify-start gap-2">
                      <AlertTriangle size={16} /> Resolve all blocking issues before generating.
                    </p>
                  ) : (
                    <p className="text-emerald-300 font-medium text-sm flex items-center justify-center md:justify-start gap-2">
                      <ShieldCheck size={16} /> All mandatory documents are valid and ready.
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-700"
                  >
                    <FileSpreadsheet size={18} /> Export CSV
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isBlocking || generating}
                    className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-md
                      ${isBlocking || generating 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 hover:shadow-blue-900/70'
                      }
                    `}
                  >
                    {generating ? (
                      <><Loader2 size={18} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Package size={18} /> Generate Package</>
                    )}
                  </button>
                </div>
              </div>
              
              {generatedPdf && (
                <div className="p-8 bg-emerald-50 border-t border-emerald-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Package Generated!</h3>
                  <p className="text-slate-600 mb-6 font-mono text-sm bg-white px-3 py-1 rounded border border-slate-200">
                    {generatedFilename}
                  </p>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-200"
                  >
                    <Download size={20} /> Download PDF Package
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
