import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  FileText, Upload, CheckCircle, XCircle, AlertTriangle,
  Download, Globe, Trash2, Link, AlertOctagon, Info,
  ChevronRight, Package, FileWarning, Copy, Loader2,
  Sparkles, FileSpreadsheet, MinusCircle
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
    ok: { icon: CheckCircle, label: t.statusOk, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    missing: { icon: XCircle, label: t.statusMissing, classes: 'bg-red-50 text-red-700 border-red-200' },
    expiry_needed: { icon: AlertTriangle, label: t.statusExpiryNeeded, classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    expired: { icon: XCircle, label: t.statusExpired, classes: 'bg-red-50 text-red-700 border-red-200' },
    not_provided: { icon: MinusCircle, label: t.statusNotProvided, classes: 'bg-slate-50 text-slate-500 border-slate-200' },
  };
  const c = config[status] || config.not_provided;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${c.classes}`}>
      <Icon size={13} />
      {c.label}
    </span>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────────
function StepIndicator({ currentStep, t }) {
  const steps = [
    { num: 1, label: t.step1, icon: FileText },
    { num: 2, label: t.step2, icon: Upload },
    { num: 3, label: t.step3, icon: Link },
    { num: 4, label: t.step4, icon: Package },
  ];
  return (
    <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isDone = currentStep > step.num;
        return (
          <React.Fragment key={step.num}>
            {idx > 0 && <ChevronRight size={16} className="text-slate-300 mx-1 hidden sm:block" />}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : ''}
              ${isDone ? 'bg-emerald-50 text-emerald-700' : ''}
              ${!isActive && !isDone ? 'bg-slate-100 text-slate-400' : ''}`}>
              {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.num}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('en');
  const t = lang === 'en' ? en : bn;

  // Core state
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

  // ── Duplicate detection ──────────────────────────────────────────
  const duplicateFileIds = useMemo(() => detectDuplicates(uploadedFiles), [uploadedFiles]);

  // ── Current step calculation ─────────────────────────────────────
  const currentStep = useMemo(() => {
    if (!tender) return 1;
    if (uploadedFiles.length === 0) return 2;
    if (generatedPdf) return 4;
    return 3;
  }, [tender, uploadedFiles.length, generatedPdf]);

  // ── Status summary ──────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!tender || requirements.length === 0) return null;
    return getStatusSummary(requirements, matches, tender.submission_deadline);
  }, [tender, requirements, matches]);

  const isBlocking = useMemo(() => {
    if (!tender || requirements.length === 0) return true;
    return hasBlockingProblems(requirements, matches, tender.submission_deadline);
  }, [tender, requirements, matches]);

  // ── Load Requirements ────────────────────────────────────────────
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

  // ── File Upload ──────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    setError(null);

    // Validate count
    if (uploadedFiles.length + newFiles.length > MAX_FILES) {
      setError(t.tooManyFiles);
      return;
    }

    // Validate total size
    const currentSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const newSize = newFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_TOTAL_SIZE) {
      setError(t.fileTooLarge);
      return;
    }

    // Process each file
    const processed = [];
    for (const file of newFiles) {
      if (!isPdfFile(file)) {
        setError(`"${file.name}" ${t.notPDF}`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const hash = await calculateFileHash(arrayBuffer);
        const { pages, error: pdfError } = await getPdfPageCount(arrayBuffer);

        const fileObj = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          pages: pages,
          hash: hash,
          arrayBuffer: arrayBuffer,
          error: pdfError,
        };

        processed.push(fileObj);
      } catch (err) {
        setError(`"${file.name}": ${t.corruptPDF}`);
      }
    }

    if (processed.length > 0) {
      setUploadedFiles(prev => [...prev, ...processed]);
      setGeneratedPdf(null);
    }

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadedFiles, t]);

  // ── Remove File ──────────────────────────────────────────────────
  const handleRemoveFile = useCallback((fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setMatches(prev => prev.filter(m => m.fileId !== fileId));
    setGeneratedPdf(null);
  }, []);

  // ── Match File ───────────────────────────────────────────────────
  const handleMatch = useCallback((requirementId, fileId) => {
    if (!fileId) {
      // Remove match
      setMatches(prev => prev.filter(m => m.requirementId !== requirementId));
      setGeneratedPdf(null);
      return;
    }

    // Check duplicate restriction
    if (!canMatchFile(fileId, uploadedFiles, matches.filter(m => m.requirementId !== requirementId))) {
      setError(t.duplicateMatchBlocked);
      return;
    }

    setMatches(prev => {
      // Remove any existing match for this requirement
      const filtered = prev.filter(m => m.requirementId !== requirementId && m.fileId !== fileId);
      return [...filtered, { requirementId, fileId, expiryDate: '' }];
    });
    setGeneratedPdf(null);
    setError(null);
  }, [uploadedFiles, matches, t]);

  // ── Set Expiry Date ──────────────────────────────────────────────
  const handleExpiryDate = useCallback((requirementId, date) => {
    setMatches(prev => prev.map(m =>
      m.requirementId === requirementId ? { ...m, expiryDate: date } : m
    ));
    setGeneratedPdf(null);
  }, []);

  // ── Auto-Match ───────────────────────────────────────────────────
  const handleAutoMatch = useCallback(() => {
    const newMatches = [...matches];
    const matchedFileIds = new Set(newMatches.map(m => m.fileId));
    const matchedReqIds = new Set(newMatches.map(m => m.requirementId));

    for (const req of requirements) {
      if (matchedReqIds.has(req.id)) continue;

      // Normalize the requirement title for comparison
      const reqWords = req.title_en.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);

      let bestMatch = null;
      let bestScore = 0;

      for (const file of uploadedFiles) {
        if (matchedFileIds.has(file.id)) continue;
        if (file.error) continue;
        if (duplicateFileIds.has(file.id)) {
          // Check if another duplicate is already matched
          const dupGroup = uploadedFiles.filter(f => f.hash === file.hash);
          const dupAlreadyMatched = dupGroup.some(f => matchedFileIds.has(f.id));
          if (dupAlreadyMatched) continue;
        }

        // Normalize filename
        const nameClean = file.name.toLowerCase()
          .replace(/\.pdf$/, '')
          .replace(/[_\-\.]/g, ' ')
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/);

        // Score: count matching words
        let score = 0;
        for (const word of reqWords) {
          if (word.length < 2) continue;
          if (nameClean.some(nw => nw.includes(word) || word.includes(nw))) {
            score++;
          }
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

  // ── Clear All Matches ────────────────────────────────────────────
  const handleClearMatches = useCallback(() => {
    setMatches([]);
    setGeneratedPdf(null);
  }, []);

  // ── Generate Package ─────────────────────────────────────────────
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
      console.error('Package generation error:', err);
      setError('Failed to generate package: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }, [isBlocking, tender, requirements, matches, uploadedFiles]);

  // ── Download ─────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (generatedPdf && generatedFilename) {
      downloadPdf(generatedPdf, generatedFilename);
    }
  }, [generatedPdf, generatedFilename]);

  // ── Export CSV ────────────────────────────────────────────────────
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
    a.click();
    URL.revokeObjectURL(url);
  }, [tender, requirements, matches, uploadedFiles]);

  // ── Get available files for matching (not already matched to other reqs) ─
  const getAvailableFiles = useCallback((requirementId) => {
    const currentMatch = matches.find(m => m.requirementId === requirementId);
    return uploadedFiles.filter(f => {
      if (f.error) return false;
      // Already matched to this requirement? show it
      if (currentMatch && currentMatch.fileId === f.id) return true;
      // Already matched to another requirement? hide it
      if (matches.some(m => m.fileId === f.id && m.requirementId !== requirementId)) return false;
      // Check duplicate restriction
      if (!canMatchFile(f.id, uploadedFiles, matches.filter(m => m.requirementId !== requirementId))) return false;
      return true;
    });
  }, [uploadedFiles, matches]);

  // ── Format file size ─────────────────────────────────────────────
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Drag and drop handlers ───────────────────────────────────────
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">{t.appName}</h1>
              {tender && (
                <p className="text-xs text-blue-600 font-medium">{t.tenderId}: {tender.tender_id}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            id="language-switch"
          >
            <Globe size={15} />
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Step Indicator ─────────────────────────────────────── */}
        <StepIndicator currentStep={currentStep} t={t} />

        {/* ── Error Alert ────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" id="error-alert">
            <AlertOctagon size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 1: Load Requirements ──────────────────────────── */}
        {!tender && (
          <section className="mb-8" id="section-load-requirements">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t.loadRequirements}</h2>
              <p className="text-slate-500 text-sm mb-6">{t.loadRequirementsDesc}</p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium cursor-pointer transition-colors shadow-sm shadow-blue-200">
                <Upload size={18} />
                {t.selectFile}
                <input
                  ref={reqInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleLoadRequirements}
                  className="hidden"
                  id="requirements-input"
                />
              </label>
            </div>
          </section>
        )}

        {/* ── Tender Summary ─────────────────────────────────────── */}
        {tender && (
          <section className="mb-6" id="section-tender-summary">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info size={14} />
                {t.tenderSummary}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.tenderId}</p>
                  <p className="text-sm font-bold text-blue-700">{tender.tender_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.tenderTitle}</p>
                  <p className="text-sm font-semibold text-slate-800">{tender.title}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.procuringEntity}</p>
                  <p className="text-sm font-semibold text-slate-800">{tender.procuring_entity}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.bidder}</p>
                  <p className="text-sm font-semibold text-slate-800">{tender.bidder}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t.submissionDeadline}</p>
                  <p className="text-sm font-semibold text-slate-800">{tender.submission_deadline}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {tender && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── LEFT COLUMN: Upload + Files ─────────────────────── */}
            <div className="lg:col-span-1 space-y-6">
              {/* Upload Area */}
              <section id="section-upload">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Upload size={14} />
                    {t.uploadDocuments}
                  </h2>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
                      ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                    <p className="text-sm text-slate-600 font-medium">{t.dropPDFs}</p>
                    <p className="text-xs text-slate-400 mt-1">{t.maxFiles} • {t.maxSize}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload-input"
                    />
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase">
                        {t.uploadedFiles} ({uploadedFiles.length})
                      </h3>
                      {uploadedFiles.map(file => {
                        const isDup = duplicateFileIds.has(file.id);
                        const isMatched = matches.some(m => m.fileId === file.id);
                        return (
                          <div key={file.id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm
                            ${file.error ? 'bg-red-50 border-red-200' :
                              isDup ? 'bg-amber-50 border-amber-200' :
                              isMatched ? 'bg-emerald-50 border-emerald-200' :
                              'bg-slate-50 border-slate-200'}`}>
                            <FileText size={16} className={file.error ? 'text-red-400' : 'text-slate-400'} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-700 truncate text-xs">{file.name}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                {file.error ? (
                                  <span className="text-red-500">{t.corruptPDF}</span>
                                ) : (
                                  <>
                                    <span>{file.pages} {file.pages === 1 ? t.page : t.pages}</span>
                                    <span>•</span>
                                    <span>{formatSize(file.size)}</span>
                                  </>
                                )}
                              </div>
                              {isDup && !file.error && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium mt-0.5">
                                  <Copy size={10} /> {t.duplicate}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              aria-label={t.remove}
                              id={`remove-file-${file.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN: Matching + Status ─────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Matching Section */}
              <section id="section-matching">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Link size={14} />
                      {t.matchDocuments}
                    </h2>
                    {uploadedFiles.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAutoMatch}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-xs font-medium transition-colors"
                          id="auto-match-btn"
                        >
                          <Sparkles size={13} />
                          {t.autoMatch}
                        </button>
                        <button
                          onClick={handleClearMatches}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                          id="clear-matches-btn"
                        >
                          {t.clearAllMatches}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {requirements.map(req => {
                      const match = matches.find(m => m.requirementId === req.id);
                      const matchedFile = match ? uploadedFiles.find(f => f.id === match.fileId) : null;
                      const { status } = getDocumentStatus(req, match?.fileId || null, match?.expiryDate || null, tender.submission_deadline);
                      const availFiles = getAvailableFiles(req.id);

                      return (
                        <div key={req.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors" id={`req-${req.id}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-800 text-sm">
                                  {lang === 'en' ? req.title_en : (req.title_bn || req.title_en)}
                                </h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.mandatory ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                  {req.mandatory ? t.mandatory : t.optional}
                                </span>
                                {req.has_expiry && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                                    {t.expiryRequired}
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge status={status} t={t} />
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            {/* File selector */}
                            <select
                              value={match?.fileId || ''}
                              onChange={(e) => handleMatch(req.id, e.target.value || null)}
                              className="flex-1 min-w-[200px] text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              id={`match-select-${req.id}`}
                            >
                              <option value="">{t.selectFile2}</option>
                              {availFiles.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.name} ({f.pages} {f.pages === 1 ? t.page : t.pages})
                                </option>
                              ))}
                            </select>

                            {/* Expiry date input */}
                            {req.has_expiry && match?.fileId && (
                              <input
                                type="date"
                                value={match?.expiryDate || ''}
                                onChange={(e) => handleExpiryDate(req.id, e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t.enterExpiryDate}
                                id={`expiry-${req.id}`}
                              />
                            )}

                            {/* Remove match button */}
                            {match?.fileId && (
                              <button
                                onClick={() => handleMatch(req.id, null)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                title={t.removeMatch}
                                id={`unmatch-${req.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* ── Status Summary + Package Generation ────────────── */}
              {summary && (
                <section id="section-status-summary">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <CheckCircle size={14} />
                      {t.statusSummary}
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{summary.ok}</p>
                        <p className="text-xs text-emerald-600 font-medium">{t.statusOk}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-700">{summary.missing}</p>
                        <p className="text-xs text-red-600 font-medium">{t.statusMissing}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-700">{summary.expiryNeeded}</p>
                        <p className="text-xs text-amber-600 font-medium">{t.statusExpiryNeeded}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-700">{summary.expired}</p>
                        <p className="text-xs text-red-600 font-medium">{t.statusExpired}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-slate-500">{summary.notProvided}</p>
                        <p className="text-xs text-slate-500 font-medium">{t.statusNotProvided}</p>
                      </div>
                    </div>

                    {isBlocking ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-5">
                        <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-700 text-sm font-semibold">
                            {summary.blocking} {summary.blocking === 1 ? t.blockingProblem : t.blockingProblems}
                          </p>
                          <p className="text-red-600 text-xs mt-1">{t.cannotGenerate}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 mb-5">
                        <CheckCircle size={20} className="text-emerald-500" />
                        <p className="text-emerald-700 text-sm font-semibold">{t.noBlockingProblems}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={handleGenerate}
                        disabled={isBlocking || generating}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm
                          ${isBlocking || generating
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-md'}`}
                        id="generate-package-btn"
                      >
                        {generating ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            {t.generating}
                          </>
                        ) : (
                          <>
                            <Package size={18} />
                            {t.generatePackage}
                          </>
                        )}
                      </button>

                      {generatedPdf && (
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm shadow-emerald-200 hover:shadow-md"
                          id="download-package-btn"
                        >
                          <Download size={18} />
                          {t.downloadPackage}
                        </button>
                      )}

                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm transition-colors"
                        id="export-csv-btn"
                      >
                        <FileSpreadsheet size={16} />
                        {t.exportCSV}
                      </button>
                    </div>

                    {generatedPdf && (
                      <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-500" />
                        <div>
                          <p className="text-emerald-700 text-sm font-semibold">{t.packageGenerated}</p>
                          <p className="text-emerald-600 text-xs">{generatedFilename} — {t.packageReady}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400">
        <p>Tender Document Package Builder • AI DevFest 2026</p>
        <p className="mt-1">All PDF processing happens locally in your browser.</p>
      </footer>
    </div>
  );
}
