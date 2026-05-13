import { useState, useEffect, useCallback, useRef } from 'react';
import { XMarkIcon } from './Icons';
import {
  getMyDocuments,
  requestVerificationCode,
  verifyCode,
  signOut,
  storeToken,
  isCloudEnabled,
} from '../documents';

function SpinnerIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function DocIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ErrorMsg({ msg }) {
  return (
    <p className="text-sm text-red-600 mt-2">{msg}</p>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// step: email | sending | code | verifying | list | loading-list
export default function MyDocumentsModal({ authToken, onAuthToken, onLoadDocument, onClose }) {
  const configured = isCloudEnabled();

  const [step, setStep] = useState(authToken ? 'loading-list' : 'email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [docs, setDocs] = useState([]);

  const codeInputRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (step === 'code') setTimeout(() => codeInputRef.current?.focus(), 50);
  }, [step]);

  // Auto-fetch if we already have a token
  useEffect(() => {
    if (authToken && step === 'loading-list') {
      fetchDocs(authToken);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDocs = useCallback(async (token) => {
    setStep('loading-list');
    setError(null);
    try {
      const data = await getMyDocuments(token);
      setDocs(data);
      setStep('list');
    } catch (err) {
      // Session expired or invalid — drop back to email step
      if (err.message.includes('expired')) {
        onAuthToken(null);
        setStep('email');
        setError('Your session expired. Please verify your email again.');
      } else {
        setError(err.message);
        setStep('list');
      }
    }
  }, [onAuthToken]);

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
      await fetchDocs(token);
    } catch (err) {
      setError(err.message);
      setStep('code');
    }
  }, [email, code, onAuthToken, fetchDocs]);

  const handleSignOut = useCallback(async () => {
    await signOut(authToken);
    onAuthToken(null);
    setDocs([]);
    setEmail('');
    setCode('');
    setError(null);
    setStep('email');
  }, [authToken, onAuthToken]);

  const handleOpenDoc = useCallback((slug) => {
    onLoadDocument(slug);
    onClose();
  }, [onLoadDocument, onClose]);

  // ── Body ────────────────────────────────────────────────────────────────────

  function Body() {
    if (!configured) {
      return (
        <p className="text-sm text-gray-500 p-6">
          Cloud save is not configured. Add{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">VITE_API_URL</code> to{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">.env.local</code>.
        </p>
      );
    }

    if (step === 'email' || step === 'sending') {
      return (
        <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Enter the email you used to save documents to retrieve them.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <ErrorMsg msg={error} />}
          <button
            type="submit"
            disabled={step === 'sending'}
            className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {step === 'sending'
              ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Sending code…</>
              : 'Send verification code'}
          </button>
        </form>
      );
    }

    if (step === 'code' || step === 'verifying') {
      return (
        <form onSubmit={handleCodeSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
          <input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <ErrorMsg msg={error} />}
          <button
            type="submit"
            disabled={code.length < 6 || step === 'verifying'}
            className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {step === 'verifying'
              ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Verifying…</>
              : 'Verify & open my documents'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(null); }}
            className="w-full text-xs text-gray-400 hover:text-primary transition-colors"
          >
            ← Use a different email
          </button>
        </form>
      );
    }

    if (step === 'loading-list') {
      return (
        <div className="flex items-center justify-center p-12 gap-3 text-gray-400">
          <SpinnerIcon className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your documents…</span>
        </div>
      );
    }

    // ── Document list ──
    return (
      <div>
        {error && (
          <div className="px-6 pt-4">
            <ErrorMsg msg={error} />
          </div>
        )}

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 gap-2">
            <DocIcon className="w-10 h-10 opacity-30" />
            <p className="text-sm">No saved documents yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto scrollbar-thin">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <button
                  onClick={() => handleOpenDoc(doc.slug)}
                  className="w-full flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <DocIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.created_at)}</p>
                  </div>
                  <span className="text-xs font-mono text-gray-300 shrink-0 mt-0.5">{doc.slug}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="bg-linear-to-r from-primary to-accent p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <DocIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">My Documents</h2>
                <p className="text-white/70 text-sm">
                  {step === 'list' ? `Signed in as ${email || '…'}` : 'Verify your email to continue'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <Body />
      </div>
    </div>
  );
}
