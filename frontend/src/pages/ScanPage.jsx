import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useScan } from '../context/ScanContext';

// Stage labels shown in sequence during a real scan
const STAGES = [
  { pct: 5,  label: 'Uploading image…' },
  { pct: 20, label: 'Pre-processing image…' },
  { pct: 35, label: 'Running OCR…' },
  { pct: 55, label: 'Identifying menu items…' },
  { pct: 70, label: 'Estimating nutritional values…' },
  { pct: 85, label: 'Scoring against your profile…' },
  { pct: 95, label: 'Finalising results…' },
];

export default function ScanPage() {
  const {
    isScanning,
    scanProgress,
    scanStage,
    scanError,
    setScanError,
    startScan,
    completeScan,
    setScanProgress,
    setScanStage,
    currentScan,
    history,
    deleteHistoryEntry,
    setCurrentScan,
  } = useScan();

  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);

  // Two separate inputs:
  //   cameraInputRef  — has capture="environment", opens rear camera on mobile
  //   fileInputRef    — normal file picker (gallery / desktop)
  const cameraInputRef = useRef(null);
  const fileInputRef   = useRef(null);
  const navigate       = useNavigate();

  const applyFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleCameraCapture = (e) => applyFile(e.target.files?.[0]);
  const handleFileSelect    = (e) => applyFile(e.target.files?.[0]);

  const handleScan = async () => {
    if (!file) return;
    startScan();

    let stageIdx = 0;
    const advanceStage = (prog) => {
      while (stageIdx < STAGES.length && prog >= STAGES[stageIdx].pct) {
        setScanStage(STAGES[stageIdx].label);
        stageIdx++;
      }
    };

    let current = 0;
    const ticker = setInterval(() => {
      current = Math.min(current + (Math.random() * 4 + 1), 90);
      setScanProgress(Math.round(current));
      advanceStage(current);
    }, 400);

    try {
      const formData = new FormData();
      formData.append('menu_image', file);

      const { data } = await api.post('/scans/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(ticker);
      setScanProgress(100);
      setScanStage('Analysis complete!');
      completeScan(data);
      setTimeout(() => navigate('/analysis'), 600);
    } catch (err) {
      clearInterval(ticker);
      setScanProgress(0);
      setScanStage('');
      const msg = err?.response?.data?.error || 'Scan failed. Please try again with a clearer image.';
      setScanError(msg);
    }
  };

  const progress = Math.round(scanProgress);

  return (
    <div className="space-y-8 pb-32">
      {/* Hidden inputs */}
      {/* Camera input — capture="environment" opens rear camera on iOS/Android */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />
      {/* File input — gallery / desktop file picker, no capture constraint */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Hero */}
      <section className="mb-8">
        <h1 className="text-[3.5rem] font-headline font-bold leading-tight tracking-[-0.04em] text-on-surface">
          NutriScan <span className="text-primary">AI</span>
        </h1>
        <p className="text-on-surface-variant font-medium mt-2">
          Point your camera at a menu or upload a photo to decode nutritional density instantly.
        </p>
      </section>

      {/* Scan Canvas */}
      <section className="relative">
        <div className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden bg-surface-container-high shadow-2xl outline outline-1 outline-white/20">
          {preview ? (
            <img src={preview} alt="Menu" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-surface-container-low to-surface-container-high">
              <span className="material-symbols-outlined text-6xl text-outline/30 mb-4">photo_camera</span>
              <p className="text-on-surface-variant font-medium">Upload a menu image to begin</p>
            </div>
          )}

          {/* Scanning overlay */}
          {isScanning && (
            <>
              <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] z-10" />
              <div
                className="absolute left-0 w-full h-[3px] z-20 bg-primary"
                style={{
                  boxShadow: '0 0 18px 4px rgba(0,185,120,0.7)',
                  animation: 'scanLine 2s ease-in-out infinite',
                }}
              />
              <div className="absolute top-8 left-8  w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg z-20" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg z-20" />
              <div className="absolute bottom-8 left-8  w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg z-20" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg z-20" />
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className="glass-panel px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl border border-white/30">
                  <span className="material-symbols-outlined text-primary animate-spin text-xl">progress_activity</span>
                  <span className="text-sm font-bold text-primary tracking-wide">{scanStage}</span>
                </div>
              </div>
            </>
          )}

          {/* Static corner brackets */}
          {!isScanning && (
            <>
              <div className="absolute top-8 left-8  w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-8 left-8  w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </>
          )}
        </div>

        {/* Upload zone — now has two action buttons */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 glass-panel p-4 rounded-2xl shadow-[0px_24px_48px_rgba(0,77,54,0.15)] border border-primary/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold font-headline truncate">{file ? file.name : 'Import Menu'}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">
                {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, JPG, PNG up to 10 MB'}
              </p>
            </div>
          </div>

          {/* Camera button — opens rear camera */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isScanning}
            aria-label="Open camera"
            className="bg-primary/10 text-primary p-2.5 rounded-xl hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all ease-out-expo disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
          </button>

          {/* File / gallery button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            aria-label="Upload from gallery or files"
            className="bg-primary text-white p-2.5 rounded-xl hover:scale-110 active:scale-95 transition-transform ease-out-expo disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </section>

      {/* Progress Panel */}
      <section className="mt-16 space-y-4">
        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] nova-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-headline font-semibold tracking-tight">AI Precision Engine</h3>
              <p className="text-xs text-on-surface-variant">
                {isScanning ? scanStage : file ? 'Ready — press Analyse Menu below' : 'Upload a menu to begin analysis'}
              </p>
            </div>
            <span className="text-primary font-bold font-headline">
              {isScanning ? `${progress}%` : '—'}
            </span>
          </div>
          <div className="space-y-4">
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(0,105,75,0.3)] transition-all duration-500"
                style={{ width: `${isScanning ? progress : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`bg-surface-container-low p-3 rounded-xl flex items-center gap-3 ${isScanning ? 'text-primary' : ''}`}>
                <span className="material-symbols-outlined text-sm">visibility</span>
                <span className="text-xs font-medium">OCR {isScanning ? 'active' : 'ready'}</span>
              </div>
              <div className={`bg-surface-container-low p-3 rounded-xl flex items-center gap-3 ${progress > 50 ? 'text-primary' : ''}`}>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                <span className="text-xs font-medium">{progress > 50 ? 'Mapping data' : 'Data Mapping'}</span>
              </div>
            </div>
          </div>
        </div>

        {file && !isScanning && (
          <button
            onClick={handleScan}
            className="w-full bg-primary text-on-primary py-5 rounded-2xl font-headline font-bold text-lg tracking-tight shadow-[0_0_20px_rgba(0,105,75,0.3)] hover:shadow-[0_0_30px_rgba(0,105,75,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
            {scanError ? 'Retry Scan' : 'Analyse Menu'}
          </button>
        )}

        {/* Error Banner */}
        {scanError && !isScanning && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Scan Failed</p>
              <p className="text-xs text-red-600 mt-1">{scanError}</p>
            </div>
            <button
              onClick={() => setScanError('')}
              className="p-1 text-red-400 hover:text-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {isScanning && (
          <div className="w-full bg-primary/60 text-on-primary py-5 rounded-2xl font-headline font-bold text-lg tracking-tight flex items-center justify-center gap-3 cursor-not-allowed select-none">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Analysing… {progress}%
          </div>
        )}
      </section>

      {/* View last result */}
      {currentScan && !isScanning && (() => {
        const items = currentScan.extracted_items || currentScan.results || [];
        const savedAt = currentScan.savedAt
          ? new Date(currentScan.savedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : null;
        return (
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary-fixed/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
            <div className="relative bg-surface-container-lowest rounded-[1.5rem] p-5 nova-shadow outline outline-1 outline-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary-fixed to-primary opacity-60" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,105,75,0.3)] shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline font-bold text-on-surface">Last Scan Results</h3>
                  <p className="text-xs text-on-surface-variant">
                    {items.length} items analysed{savedAt ? ` · ${savedAt}` : ''}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold font-headline text-sm">
                  {items.length}
                </div>
              </div>

              {items.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {items.slice(0, 4).map((it, i) => {
                    const cls = it.classification;
                    const badgeColor = cls === 'recommended' ? 'bg-emerald-500' : cls === 'avoid' ? 'bg-red-500' : 'bg-amber-500';
                    return (
                      <span key={i} className={`${badgeColor} text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold truncate max-w-[120px]`}>
                        {it.food_name}
                      </span>
                    );
                  })}
                  {items.length > 4 && (
                    <span className="bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      +{items.length - 4} more
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={() => navigate('/analysis')}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-[0_0_12px_rgba(0,105,75,0.2)]"
              >
                <span className="material-symbols-outlined text-base">analytics</span>
                View Full Analysis
              </button>
            </div>
          </section>
        );
      })()}

      {/* Scan History */}
      {history.length > 0 && !isScanning && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline text-sm font-bold tracking-widest uppercase text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              Scan History
            </h3>
            <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-full">
              {history.length} scan{history.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry) => {
              const items = entry.extracted_items || entry.results || [];
              const time = entry.savedAt
                ? new Date(entry.savedAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })
                : 'Unknown';
              return (
                <div
                  key={entry.id}
                  className="bg-surface-container-lowest rounded-2xl p-4 nova-shadow outline outline-1 outline-white/10 flex items-center gap-3 group hover:outline-primary/30 transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    setCurrentScan(entry);
                    navigate('/analysis');
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>document_scanner</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {items.length} item{items.length !== 1 ? 's' : ''} scanned
                    </p>
                    <p className="text-[10px] text-on-surface-variant">{time}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {items.slice(0, 2).map((it, i) => {
                      const cls = it.classification;
                      const dot = cls === 'recommended' ? 'bg-emerald-500' : cls === 'avoid' ? 'bg-red-500' : 'bg-amber-500';
                      return <span key={i} className={`w-2 h-2 rounded-full ${dot}`} />;
                    })}
                    {items.length > 2 && (
                      <span className="text-[9px] text-on-surface-variant font-medium">+{items.length - 2}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryEntry(entry.id);
                    }}
                    className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="fixed inset-0 -z-10 pointer-events-none opacity-20">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary-fixed blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-tertiary-fixed blur-[120px] rounded-full" />
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 0%; }
          50%  { top: calc(100% - 3px); }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}