import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShareIcon,
  XMarkIcon,
  ClipboardIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
} from './Icons';
import {
  saveDocument,
  requestVerificationCode,
  verifyCode,
  isCloudEnabled,
  storeToken,
} from '../documents';

// ── Small icon components ─────────────────────────────────────────────────────

function CloudIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}
function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function SpinnerIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Step machine ──────────────────────────────────────────────────────────────
// idle → email → sending → code → verifying → saving → done
//                                                      ↑
//                         (skip email+code if token already stored)

function ShareModal({
  content,
  title,
  generateShareUrl,
  cloudSlug,
  editToken,
  onCloudSave,
  authToken,
  onAuthToken,
  onClose,
  showToast,
}) {
  const configured = isCloudEnabled();

  // Step state for the cloud-save section
  const [step, setStep] = useState('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [savedSlug, setSavedSlug] = useState(cloudSlug || null);
  const [savedEditToken, setSavedEditToken] = useState(editToken || null);
  const [allowEdit, setAllowEdit] = useState(false); // share-link permission toggle
  const [copied, setCopied] = useState(false);

  // Legacy URL section
  const [legacyUrl, setLegacyUrl] = useState('');
  const [legacyLen, setLegacyLen] = useState(0);

  const codeInputRef = useRef(null);

  useEffect(() => {
    const result = generateShareUrl();
    if (result) { setLegacyUrl(result.url); setLegacyLen(result.length); }
  }, [generateShareUrl]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Focus the code input when we reach that step
  useEffect(() => {
    if (step === 'code') setTimeout(() => codeInputRef.current?.focus(), 50);
  }, [step]);

  const cloudUrl = savedSlug
    ? `${window.location.origin}${window.location.pathname}?doc=${savedSlug}${allowEdit && savedEditToken ? `&edit=${savedEditToken}` : ''}`
    : null;

  // ── Actions ─────────────────────────────────────────────────────────────────

  const doSave = useCallback(async (token) => {
    setStep('saving');
    setError(null);
    try {
      const { slug, editToken: tok } = await saveDocument(content, token, title);
      setSavedSlug(slug);
      setSavedEditToken(tok);
      onCloudSave(slug, tok);
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('idle');
    }
  }, [content, onCloudSave]);

  const handleSaveClick = useCallback(() => {
    setError(null);
    if (authToken) {
      doSave(authToken);
    } else {
      setStep('email');
    }
  }, [authToken, doSave]);

  const handleEmailSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setStep('sending');
    try {
      await requestVerificationCode(email.trim().toLowerCase());
      setStep('code');
    } catch (err) {
      setError(err.message);
      setStep('email');
    }
  }, [email]);

  const handleCodeSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setStep('verifying');
    try {
      const token = await verifyCode(email.trim().toLowerCase(), code.trim());
      storeToken(token);
      onAuthToken(token);
      await doSave(token);
    } catch (err) {
      setError(err.message);
      setStep('code');
    }
  }, [email, code, onAuthToken, doSave]);

  const handleCopyCloud = useCallback(async () => {
    if (!cloudUrl) return;
    await navigator.clipboard.writeText(cloudUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Link copied!');
  }, [cloudUrl, showToast]);

  const handleCopyLegacy = useCallback(async () => {
    await navigator.clipboard.writeText(legacyUrl).catch(() => {});
    showToast('Link copied!');
    onClose();
  }, [legacyUrl, showToast, onClose]);

  const handleNativeShare = useCallback(async () => {
    const url = cloudUrl || legacyUrl;
    try {
      await navigator.share({ title: 'Markdown Document', url });
      onClose();
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Share failed');
    }
  }, [cloudUrl, legacyUrl, onClose, showToast]);

  // ── Render helpers ──────────────────────────────────────────────────────────

  function CloudBody() {
    if (!configured) {
      return (
        <p className="text-sm text-gray-500">
          Cloud save is not configured. Add{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">VITE_API_URL</code>{' '}
          to <code className="text-xs bg-gray-100 px-1 rounded">.env.local</code>.
        </p>
      );
    }

    // ── Saved state ──
    if (step === 'done' || cloudUrl) {
      return (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckIcon className="w-4 h-4" /> Saved — your short link is ready
          </p>

          {/* Permission toggle */}
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer select-none">
            <div>
              <p className="text-sm font-medium text-gray-700">Allow others to edit</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {allowEdit ? 'Anyone with this link can edit' : 'Link is read-only for everyone else'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowEdit(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowEdit ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${allowEdit ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>

          <div className="flex gap-2">
            <input
              readOnly
              value={cloudUrl}
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleCopyCloud}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => { setSavedSlug(null); setSavedEditToken(null); setStep('idle'); }}
            className="text-xs text-gray-400 hover:text-primary transition-colors"
          >
            Save as new version →
          </button>
        </div>
      );
    }

    // ── Email step ──
    if (step === 'email' || step === 'sending') {
      return (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <p className="text-sm text-gray-500">
            Enter your email to save and retrieve documents across devices.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={step === 'sending'}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
            >
              {step === 'sending'
                ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Sending…</>
                : 'Send code'}
            </button>
          </div>
          {error && <ErrorMsg msg={error} />}
        </form>
      );
    }

    // ── OTP step ──
    if (step === 'code' || step === 'verifying') {
      return (
        <form onSubmit={handleCodeSubmit} className="space-y-3">
          <p className="text-sm text-gray-500">
            We sent a 6-digit code to <strong>{email}</strong>. Check your inbox.
          </p>
          <div className="flex gap-2">
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={code.length < 6 || step === 'verifying'}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
            >
              {step === 'verifying'
                ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Verifying…</>
                : 'Verify'}
            </button>
          </div>
          {error && <ErrorMsg msg={error} />}
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(null); }}
            className="text-xs text-gray-400 hover:text-primary transition-colors"
          >
            ← Use a different email
          </button>
        </form>
      );
    }

    // ── Saving spinner ──
    if (step === 'saving') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SpinnerIcon className="w-4 h-4 animate-spin text-primary" /> Saving document…
        </div>
      );
    }

    // ── Idle (default) ──
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          {authToken
            ? 'Upload this document and get a permanent short link.'
            : 'Verify your email once, then save and retrieve documents from any device.'}
        </p>
        <button
          onClick={handleSaveClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
        >
          <CloudIcon className="w-4 h-4" />
          {authToken ? 'Save & Get Link' : 'Verify email & Save'}
        </button>
        {error && <ErrorMsg msg={error} />}
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="bg-linear-to-r from-primary to-accent p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShareIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Share Document</h2>
                <p className="text-white/70 text-sm">Anyone with the link can view</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Cloud save */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <CloudIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-gray-700">Cloud Save</span>
              <span className="ml-auto text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                Recommended
              </span>
            </div>
            <div className="p-4">
              <CloudBody />
            </div>
          </div>

          {/* Legacy URL */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <ShareIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Share via URL</span>
              <span className="ml-auto text-xs text-gray-400">No account needed</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={legacyUrl}
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-xs focus:outline-none"
                />
                <button
                  onClick={handleCopyLegacy}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                >
                  <ClipboardIcon className="w-4 h-4" /> Copy
                </button>
              </div>
              {legacyLen > 64000 && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                  URL exceeds 64 KB — use Cloud Save instead.
                </p>
              )}
              {legacyLen > 32000 && legacyLen <= 64000 && (
                <p className="text-sm text-amber-600 flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                  Large link ({Math.round(legacyLen / 1024)} KB) — works in modern browsers.
                </p>
              )}
            </div>
          </div>

          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <ArrowUpIcon className="w-5 h-5" /> Share via…
            </button>
          )}

          <p className="text-xs text-gray-400 text-center">
            Cloud documents are public and permanent. No login required for viewing.
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <p className="text-sm text-red-600 flex items-center gap-1.5">
      <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
      {msg}
    </p>
  );
}

export default ShareModal;
