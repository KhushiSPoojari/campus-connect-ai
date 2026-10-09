'use client';

import React, { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Bot,
  ArrowRight,
  Clock,
  MapPin,
  User,
  Trash2,
  FileCheck,
  AlertTriangle,
  Loader2,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SAMPLE_CIRCULARS, type SampleCircular } from '@/data/sample-circulars';
import { useEvents } from '@/lib/events/use-events';
import { useAuth } from '@/lib/context/auth-context';
import type { EventCategory, ExtractedCircularData } from '@/types/event';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const CATEGORIES: EventCategory[] = [
  'Academic',
  'Workshop',
  'Cultural',
  'Sports',
  'Placement',
  'Administrative',
];

interface FormState {
  eventTitle: string;
  date: string;
  time: string;
  venue: string;
  coordinator: string;
  category: EventCategory;
  summary: string;
  targetAudience: string;
}

const emptyForm: FormState = {
  eventTitle: '',
  date: '',
  time: '',
  venue: '',
  coordinator: '',
  category: 'Academic',
  summary: '',
  targetAudience: 'All Campus Students & Faculty',
};

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

const labelClass =
  'mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400';

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { events, addEvent, removeEvent } = useEvents();

  // Active view tab: 'upload' | 'manage'
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<'gemini' | 'fallback' | null>(null);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);

  // Form & Review state
  const [form, setForm] = useState<FormState>(emptyForm);
  const [rawDocumentName, setRawDocumentName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [lastPublishedId, setLastPublishedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Handle file validation
  function validateAndSetFile(file: File) {
    setStatusMessage('');
    setExtractionMode(null);
    setExtractionWarnings([]);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatusType('error');
      setStatusMessage('Invalid file type: Please upload a PDF document (.pdf).');
      setSelectedFile(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatusType('error');
      setStatusMessage(
        `File size limit exceeded: Selected PDF is ${(file.size / (1024 * 1024)).toFixed(2)} MB (maximum allowed is 5 MB).`
      );
      setSelectedFile(null);
      return false;
    }

    if (file.size === 0) {
      setStatusType('error');
      setStatusMessage('Empty file: The selected PDF contains 0 bytes.');
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    setRawDocumentName(file.name);
    setStatusType('info');
    setStatusMessage(`PDF selected: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready for extraction.`);
    return true;
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }

  // Quick-load demo circular text
  async function handleLoadSample(sample: SampleCircular) {
    setSelectedFile(null);
    setRawDocumentName(sample.filename);
    setStatusMessage(`Loaded sample circular: "${sample.name}". Starting extraction pipeline...`);
    setStatusType('info');

    await runExtraction({
      text: sample.rawText,
      filename: sample.filename,
    });
  }

  // Execute extraction via server-side API route
  async function runExtraction(payload: { file?: File; text?: string; filename?: string }) {
    setIsProcessing(true);
    setStatusMessage('');
    setExtractionMode(null);
    setExtractionWarnings([]);

    try {
      setProcessingStep('1/3 Uploading document to server-side endpoint...');

      let response: Response;

      if (payload.file) {
        const formData = new FormData();
        formData.append('file', payload.file);
        setProcessingStep('2/3 Invoking Google Gemini AI extraction engine...');

        response = await fetch('/api/admin/parse-circular', {
          method: 'POST',
          body: formData,
        });
      } else {
        setProcessingStep('2/3 Invoking Google Gemini AI extraction engine...');
        response = await fetch('/api/admin/parse-circular', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: payload.text,
            filename: payload.filename,
          }),
        });
      }

      setProcessingStep('3/3 Validating structured response with Zod schema...');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to extract structured information.');
      }

      const extracted: ExtractedCircularData = result.data;
      setExtractionMode(result.mode);
      if (result.warnings) setExtractionWarnings(result.warnings);

      // Populate review form
      setForm({
        eventTitle: extracted.eventTitle || '',
        date: extracted.date || '',
        time: extracted.time || '',
        venue: extracted.venue || '',
        coordinator: extracted.coordinator || '',
        category: extracted.category || 'Academic',
        summary: extracted.summary || '',
        targetAudience: extracted.targetAudience || 'All Campus Students & Faculty',
      });

      setStatusType('success');
      setStatusMessage(
        result.mode === 'gemini'
          ? 'Structured circular data extracted using Google Gemini. Review and adjust fields below before publishing.'
          : 'Structured data extracted via fallback parser. Review and adjust fields below before publishing.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown extraction failure';
      setStatusType('error');
      setStatusMessage(`Extraction error: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }

  function handleProcessUploadedFile() {
    if (!selectedFile) return;
    runExtraction({ file: selectedFile });
  }

  // Handle publishing notice via central POST /api/events
  async function handlePublishNotice(e: FormEvent) {
    e.preventDefault();

    if (!form.eventTitle || !form.date || !form.venue || !form.coordinator || !form.summary) {
      setStatusType('error');
      setStatusMessage('Please complete all mandatory fields (*) before publishing.');
      return;
    }

    if (isPublishing) return;
    setIsPublishing(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: form.eventTitle.trim(),
          date: form.date.trim(),
          time: form.time.trim() || undefined,
          venue: form.venue.trim(),
          coordinator: form.coordinator.trim(),
          category: form.category,
          summary: form.summary.trim(),
          targetAudience: form.targetAudience.trim() || undefined,
          source: extractionMode === 'gemini' ? 'Gemini Extracted' : 'Official Circular',
          rawDocumentName: rawDocumentName || 'Admin_Upload.pdf',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to publish notice to the server registry.');
        return;
      }

      // Sync into local reactive event store
      addEvent(data.event);

      setLastPublishedId(data.event.id);
      setStatusType('success');
      setStatusMessage(
        `Notice "${data.event.title}" published successfully! It is now persisted in the central database and live in the Student Portal.`
      );

      // Reset form
      setForm(emptyForm);
      setSelectedFile(null);
      setRawDocumentName('');
    } catch (err) {
      setStatusType('error');
      setStatusMessage(
        err instanceof Error ? err.message : 'Network error occurred while publishing notice.'
      );
    } finally {
      setIsPublishing(false);
    }
  }

  function handleResetForm() {
    setForm(emptyForm);
    setSelectedFile(null);
    setRawDocumentName('');
    setStatusMessage('');
    setExtractionMode(null);
    setExtractionWarnings([]);
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Verifying administrator authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              Administrator Access Restricted
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {isAuthenticated && user?.role === 'student' ? (
                <>
                  You are signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</span> with the <Badge variant="info">Student</Badge> role. Administrator privileges are required to access institutional circular parsing and publishing.
                </>
              ) : (
                'You must be signed in with an authorized campus administrator account to access circular uploading, Gemini document extraction, and notice publishing.'
              )}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/login?redirect=/admin"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>{isAuthenticated ? 'Switch to Administrator Account' : 'Sign In as Administrator'}</span>
            </Link>

            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition py-1"
            >
              ← Return to Student Portal home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 mb-2">
            <Sparkles size={14} className="text-amber-400" />
            Campus Connect AI · Administration & Extraction Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Admin Circular Ingestion & Notice Manager
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Ingest campus notification PDFs, extract structured metadata with server-side Google Gemini, and publish official announcements to the Student Portal.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Upload & Ingest Circular
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Manage Notices ({events.length})
          </button>
        </div>
      </header>

      {/* Security & Credential Isolation Disclosure Banner */}
      <section className="bg-indigo-950/40 border border-indigo-800/80 rounded-2xl p-4 text-xs text-indigo-200 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Architecture & Security Protocols</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700 font-mono text-indigo-300">
              Server-Side Endpoint: /api/admin/parse-circular
            </span>
          </div>
        </div>
        <p className="leading-relaxed text-indigo-300">
          • <strong className="text-white">Credential Isolation:</strong> <code className="bg-indigo-900/80 px-1 py-0.2 rounded font-mono text-indigo-200">GEMINI_API_KEY</code> is strictly loaded via server-side environment variables and is never exposed to browser client components.
          <br />
          • <strong className="text-white">Demonstration Prototype:</strong> This administrative interface is an interactive prototype. Published notices persist in this browser session and update the Student Portal notice board (<Link href="/notices" className="underline font-medium text-white hover:text-indigo-200">/notices</Link>) immediately.
        </p>
      </section>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dropzone & Review Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Document Upload Dropzone */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Step 1: Upload Campus Circular Document
                    </h2>
                    <p className="text-xs text-zinc-500">PDF documents only · Max file size: 5 MB</p>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 bg-zinc-50/60 dark:bg-zinc-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                      <FileCheck className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click or drag another file to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Click to browse or drag and drop campus circular PDF
                    </p>
                    <p className="text-xs text-zinc-400">
                      Restricted to PDF format (.pdf) up to 5 MB
                    </p>
                  </div>
                )}
              </div>

              {/* Extraction Trigger Button */}
              {selectedFile && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-500">
                    File validated: Ready for server-side AI processing
                  </span>
                  <Button
                    onClick={handleProcessUploadedFile}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>Run Gemini AI Extraction</span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Quick Load Test Samples */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Quick Demo: Test with Sample Campus Circulars
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_CIRCULARS.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleLoadSample(sample)}
                      disabled={isProcessing}
                      className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{sample.name.split(' ')[0]} {sample.name.split(' ')[1]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 2: Extraction Status & Review Form */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    Step 2: Review, Validate & Publish Structured Data
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Verify all extracted fields before publishing to the live campus notices feed.
                  </p>
                </div>

                {extractionMode && (
                  <Badge variant={extractionMode === 'gemini' ? 'primary' : 'warning'}>
                    <Bot className="w-3 h-3" />
                    <span>Mode: {extractionMode === 'gemini' ? 'Google Gemini 2.5' : 'Developer Fallback'}</span>
                  </Badge>
                )}
              </div>

              {/* Progress Tracker */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                  <span className="font-semibold">{processingStep}</span>
                </div>
              )}

              {/* Status Message */}
              {statusMessage && !isProcessing && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    statusType === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                      : statusType === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {statusType === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : statusType === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p>{statusMessage}</p>
                    {lastPublishedId && statusType === 'success' && (
                      <Link
                        href="/notices"
                        className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                      >
                        <span>View live on Student Notices Board</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Extraction Warnings if any */}
              {extractionWarnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Extraction Advisory Notice:</span>
                  </div>
                  {extractionWarnings.map((w, idx) => (
                    <p key={idx} className="pl-5 text-[11px]">{w}</p>
                  ))}
                </div>
              )}

              {/* Interactive Edit Form */}
              <form onSubmit={handlePublishNotice} className="space-y-4">
                <div>
                  <label htmlFor="eventTitle" className={labelClass}>
                    Event / Notice Title *
                  </label>
                  <input
                    id="eventTitle"
                    required
                    minLength={3}
                    maxLength={200}
                    value={form.eventTitle}
                    onChange={(e) => updateField('eventTitle', e.target.value)}
                    placeholder="e.g. Annual Autonomous AI & Robotics Hackathon 2026"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className={labelClass}>
                      Event Date *
                    </label>
                    <input
                      id="date"
                      required
                      value={form.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      placeholder="e.g. October 24, 2026"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="time" className={labelClass}>
                      Time / Duration
                    </label>
                    <input
                      id="time"
                      value={form.time}
                      onChange={(e) => updateField('time', e.target.value)}
                      placeholder="e.g. 09:00 AM - 08:00 PM"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="venue" className={labelClass}>
                      Venue / Room *
                    </label>
                    <input
                      id="venue"
                      required
                      value={form.venue}
                      onChange={(e) => updateField('venue', e.target.value)}
                      placeholder="e.g. Turing Engineering Tower, 3rd Floor"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="coordinator" className={labelClass}>
                      Coordinator / Organizing Body *
                    </label>
                    <input
                      id="coordinator"
                      required
                      value={form.coordinator}
                      onChange={(e) => updateField('coordinator', e.target.value)}
                      placeholder="e.g. Dr. Sarah Mitchell (HOD, CSE)"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className={labelClass}>
                    Event Category *
                  </label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value as EventCategory)}
                    className={`${inputClass} bg-white dark:bg-zinc-800`}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="summary" className={labelClass}>
                    Summary / Bulletin Description *
                  </label>
                  <textarea
                    id="summary"
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={4}
                    value={form.summary}
                    onChange={(e) => updateField('summary', e.target.value)}
                    placeholder="Provide a concise 1-3 sentence summary of the notice..."
                    className={`${inputClass} resize-y`}
                  />
                  <div className="text-right text-[11px] text-zinc-400 mt-1">
                    {form.summary.length}/1000 characters
                  </div>
                </div>

                <div>
                  <label htmlFor="targetAudience" className={labelClass}>
                    Target Audience
                  </label>
                  <input
                    id="targetAudience"
                    value={form.targetAudience}
                    onChange={(e) => updateField('targetAudience', e.target.value)}
                    placeholder="e.g. All B.Tech & M.Tech Students"
                    className={inputClass}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    type="submit"
                    disabled={isProcessing || isPublishing || !form.eventTitle}
                    className="flex items-center gap-2"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing to Central Registry...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm & Publish Notice</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetForm}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Form</span>
                  </Button>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Live Student Notice Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-5 sticky top-24">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Live Student Portal Preview
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400">Interactive Simulation</span>
              </div>

              {form.eventTitle ? (
                <article className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="primary">
                      <Tag className="w-3 h-3" />
                      <span>{form.category}</span>
                    </Badge>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {extractionMode === 'gemini' ? 'Gemini Extracted' : 'Official Circular'}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                    {form.eventTitle}
                  </h4>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {form.summary || 'Summary description will appear here.'}
                  </p>

                  <div className="space-y-1.5 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-700 pt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {form.date || 'Date Pending'}
                      </span>
                      {form.time && <span className="text-zinc-400">({form.time})</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{form.venue || 'Venue Pending'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">Coordinator: {form.coordinator || 'Pending'}</span>
                    </div>

                    {form.targetAudience && (
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span>Audience: {form.targetAudience}</span>
                      </div>
                    )}
                  </div>

                  {rawDocumentName && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      <span>{rawDocumentName}</span>
                    </div>
                  )}
                </article>
              ) : (
                <div className="py-12 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <FileText className="w-10 h-10 text-zinc-300 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Preview will render automatically
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    Upload a circular PDF or click one of the quick test samples to extract and review event information.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Manage Published Notices Tab */
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Published Campus Notices & Circulars
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                All notices currently visible to students on the Student Portal board.
              </p>
            </div>
            <Link
              href="/notices"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Open Student Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs">
                      <p className="font-semibold line-clamp-1">{evt.title}</p>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{evt.summary}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="primary">{evt.category}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {evt.date}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                      {evt.venue}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                      {evt.coordinator}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {evt.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeEvent(evt.id)}
                        title="Delete notice"
                        className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}