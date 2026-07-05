import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import LZString from 'lz-string';
import mermaid from 'mermaid';
import plantumlEncoder from 'plantuml-encoder';
import hljs from 'highlight.js';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import ShareModal from './components/ShareModal';
import ExportModal from './components/ExportModal';
import ConfirmModal from './components/ConfirmModal';
import MyDocumentsModal from './components/MyDocumentsModal';
import Toast from './components/Toast';
import { sampleDocumentation, quickStartGuide } from './sampleDocs';
import { loadDocument, getStoredToken, getEditToken, storeEditToken, updateDocument, lockDocument } from './documents';

const STORAGE_KEY = 'markdown-editor-content';
const TITLE_KEY   = 'markdown-editor-title';

// Derive a display title from content when the user hasn't set one explicitly.
function deriveTitleFromContent(content) {
  if (!content.trim()) return '';
  const heading = content.match(/^#\s+(.+)/m);
  if (heading) return heading[1].trim().replace(/[*_`[\]]/g, '');
  return content.trim().split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 100);
}

function TitleInput({ value, onChange, placeholder }) {
  return (
    <div className="pb-3 sm:pb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Untitled document'}
        maxLength={200}
        className="w-full bg-transparent text-white text-2xl sm:text-3xl font-bold placeholder-white/20 focus:outline-none border-b border-white/10 focus:border-white/30 pb-2 transition-colors"
      />
    </div>
  );
}

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

const GA_ID = import.meta.env.VITE_GA_ID;
if (GA_ID) {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Math extension — outputs placeholder elements so DOMPurify stays safe;
// KaTeX renders into them after sanitization (see Preview + ExportModal).
const mathExtension = {
  extensions: [
    {
      name: 'blockMath',
      level: 'block',
      start(src) { return src.indexOf('$$'); },
      tokenizer(src) {
        const match = /^\$\$([\s\S]+?)\$\$/.exec(src);
        if (match) {
          return { type: 'blockMath', raw: match[0], text: match[1].trim() };
        }
      },
      renderer(token) {
        return `<div class="math-block" data-math="${encodeURIComponent(token.text)}"></div>\n`;
      },
    },
    {
      name: 'inlineMath',
      level: 'inline',
      start(src) {
        let i = src.indexOf('$');
        // Skip $$ so block math tokenizer takes it
        while (i !== -1 && src[i + 1] === '$') i = src.indexOf('$', i + 2);
        return i;
      },
      tokenizer(src) {
        const match = /^\$(?!\$)((?:[^$\n]|\\\$)+?)\$(?!\$)/.exec(src);
        if (match) {
          return { type: 'inlineMath', raw: match[0], text: match[1].trim() };
        }
      },
      renderer(token) {
        return `<span class="math-inline" data-math="${encodeURIComponent(token.text)}"></span>`;
      },
    },
  ],
};

marked.use(mathExtension);

marked.use({
  renderer: {
    heading(token) {
      const id = token.text
        .toLowerCase()
        .replace(/[*_`[\]()]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      const parsed = this.parser.parseInline(token.tokens);
      return `<h${token.depth} id="${id}">${parsed}</h${token.depth}>\n`;
    },
    code(token) {
      if (token.lang === 'mermaid') {
        const safeText = token.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const encoded = encodeURIComponent(token.text);
        return `<div class="mermaid-diagram" data-source="${encoded}"><div class="mermaid">${safeText}</div></div>`;
      }
      if (token.lang === 'plantuml') {
        const encoded = plantumlEncoder.encode(token.text);
        const source = encodeURIComponent(token.text);
        const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
        return `<div class="plantuml-diagram" data-source="${source}"><img src="${url}" alt="PlantUML diagram" /></div>`;
      }
      // Syntax-highlight all other fenced code blocks. hljs emits
      // `<span class="hljs-*">` tokens (kept by DOMPurify); token colors come
      // from the imported github-dark theme (see index.css) and match the
      // export styles in ExportModal.
      const lang = (token.lang || '').trim().split(/\s+/)[0].toLowerCase();
      const { value, language } = lang && hljs.getLanguage(lang)
        ? hljs.highlight(token.text, { language: lang })
        : hljs.highlightAuto(token.text);
      const cls = language ? ` language-${language}` : '';
      return `<pre><code class="hljs${cls}">${value}</code></pre>\n`;
    },
  },
});

function App() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState(() => localStorage.getItem(TITLE_KEY) || '');
  const [activeView, setActiveView] = useState(window.innerWidth < 640 ? 'editor' : 'split');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLoadSampleConfirm, setShowLoadSampleConfirm] = useState(false);
  const [pendingSample, setPendingSample] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [cloudSlug, setCloudSlug] = useState(null);
  const [editToken, setEditToken] = useState(null);
  const [isDocLocked, setIsDocLocked] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [authToken, setAuthToken] = useState(() => getStoredToken());
  const [showMyDocumentsModal, setShowMyDocumentsModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  }, []);

  // Load content from URL or localStorage on mount and hash change
  useEffect(() => {
    const loadFromHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#doc=')) {
        try {
          const compressed = hash.substring(5);
          const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
          if (decompressed) {
            setContent(decompressed);
            localStorage.setItem(STORAGE_KEY, decompressed);
            history.replaceState(null, '', window.location.pathname);
            if (window.innerWidth < 640) setActiveView('preview');
            showToast('Document loaded from link');
            return true;
          }
        } catch (e) {
          console.error('Failed to load from URL:', e);
        }
      }
      return false;
    };

    // Check for cloud document slug in query params first (?doc=<slug>&edit=<token>)
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('doc');
    if (slug) {
      // If the URL carries an edit token, persist it and activate edit mode.
      const urlEditToken = params.get('edit');
      if (urlEditToken) storeEditToken(slug, urlEditToken);

      setIsLoadingCloud(true);
      loadDocument(slug)
        .then(({ content: loaded, title: loadedTitle, locked }) => {
          setContent(loaded);
          setTitle(loadedTitle || '');
          setCloudSlug(slug);
          setEditToken(getEditToken(slug));
          setIsDocLocked(!!locked);
          localStorage.setItem(STORAGE_KEY, loaded);
          localStorage.setItem(TITLE_KEY, loadedTitle || '');
          history.replaceState(null, '', window.location.pathname);
          if (window.innerWidth < 640) setActiveView('preview');
          showToast('Document loaded');
        })
        .catch(() => showToast('Could not load document — link may be invalid'))
        .finally(() => setIsLoadingCloud(false));
      return;
    }

    // Fall back to hash URL or localStorage
    if (!loadFromHash()) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setContent(saved);
    }

    const handleHashChange = () => { loadFromHash(); };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [showToast]);

  // Persist content and title to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, content);
  }, [content]);

  useEffect(() => {
    localStorage.setItem(TITLE_KEY, title);
  }, [title]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy');
    }
  }, [content, showToast]);

  const handleClearRequest = useCallback(() => {
    if (content) {
      setShowClearConfirm(true);
    }
  }, [content]);

  const handleClearConfirm = useCallback(() => {
    setContent('');
    setTitle('');
    setCloudSlug(null);
    setEditToken(null);
    setIsDocLocked(false);
    showToast('Editor cleared');
  }, [showToast]);

  const loadSampleContent = useCallback((sampleType) => {
    const sampleContent = sampleType === 'documentation'
      ? sampleDocumentation
      : quickStartGuide;
    setContent(sampleContent);
    // Switch to preview on mobile when sample is loaded
    if (window.innerWidth < 640) {
      setActiveView('preview');
    }
    showToast(`Loaded ${sampleType === 'documentation' ? 'documentation' : 'quick start guide'}`);
  }, [showToast]);

  const handleLoadSample = useCallback((sampleType) => {
    if (content.trim()) {
      setPendingSample(sampleType);
      setShowLoadSampleConfirm(true);
    } else {
      loadSampleContent(sampleType);
    }
  }, [content, loadSampleContent]);

  const handleLoadSampleConfirm = useCallback(() => {
    if (pendingSample) {
      loadSampleContent(pendingSample);
      setPendingSample(null);
    }
  }, [pendingSample, loadSampleContent]);

  // Called by ShareModal after a successful cloud save.
  const handleCloudSave = useCallback((slug, tok) => {
    setCloudSlug(slug);
    setEditToken(tok);
  }, []);

  const handleLockToggle = useCallback(async () => {
    if (!cloudSlug || !editToken) return;
    const nextLocked = !isDocLocked;
    setIsTogglingLock(true);
    try {
      await lockDocument(cloudSlug, nextLocked, editToken);
      setIsDocLocked(nextLocked);
      showToast(nextLocked ? 'Document locked' : 'Document unlocked');
    } catch (err) {
      showToast(err.message || 'Failed to update lock');
    } finally {
      setIsTogglingLock(false);
    }
  }, [cloudSlug, editToken, isDocLocked, showToast]);

  const handleSaveChanges = useCallback(async () => {
    if (!cloudSlug || !editToken) return;
    setIsSavingChanges(true);
    try {
      await updateDocument(cloudSlug, content, editToken, title || deriveTitleFromContent(content));
      showToast('Changes saved');
    } catch (err) {
      showToast(err.message || 'Save failed');
    } finally {
      setIsSavingChanges(false);
    }
  }, [cloudSlug, editToken, content, title, showToast]);

  const handleLoadCloudDocument = useCallback((slug) => {
    setIsLoadingCloud(true);
    loadDocument(slug)
      .then(({ content: loaded, title: loadedTitle, locked }) => {
        setContent(loaded);
        setTitle(loadedTitle || '');
        setCloudSlug(slug);
        setEditToken(getEditToken(slug));
        setIsDocLocked(!!locked);
        localStorage.setItem(STORAGE_KEY, loaded);
        localStorage.setItem(TITLE_KEY, loadedTitle || '');
        if (window.innerWidth < 640) setActiveView('preview');
        showToast('Document loaded');
      })
      .catch(() => showToast('Could not load document'))
      .finally(() => setIsLoadingCloud(false));
  }, [showToast]);

  const generateShareUrl = useCallback(() => {
    if (!content.trim()) {
      showToast('Nothing to share');
      return null;
    }
    const compressed = LZString.compressToEncodedURIComponent(content);
    const url = `${window.location.origin}${window.location.pathname}#doc=${compressed}`;
    return { url, length: url.length };
  }, [content, showToast]);

  // Derived — computed before effects that depend on them
  const hasEditAccess = !!(cloudSlug && editToken);

  // When a locked document is loaded by someone without edit access, force preview mode.
  useEffect(() => {
    if (isDocLocked && !hasEditAccess) {
      setActiveView('preview');
    }
  }, [isDocLocked, hasEditAccess]);

  // Compute preview HTML from markdown content (sanitized to prevent XSS)
  const preview = content.trim()
    ? DOMPurify.sanitize(marked.parse(content), { ADD_ATTR: ['data-source', 'data-math'] })
    : '<p class="text-gray-400 italic">Start typing to see the preview...</p>';

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const activeTitle = title || deriveTitleFromContent(content);

  return (
    <div className="bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      {isLoadingCloud && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-white">
            <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm font-medium">Loading document…</span>
          </div>
        </div>
      )}
      <Header
        onShare={() => setShowShareModal(true)}
        onCopy={handleCopy}
        onExport={() => setShowExportModal(true)}
        onClear={handleClearRequest}
        onLoadSample={handleLoadSample}
        onMyDocuments={() => setShowMyDocumentsModal(true)}
        onSaveChanges={handleSaveChanges}
        onLockToggle={handleLockToggle}
        hasEditAccess={hasEditAccess}
        isDocLocked={isDocLocked}
        isSavingChanges={isSavingChanges}
        isTogglingLock={isTogglingLock}
        activeView={activeView}
        setActiveView={setActiveView}
        isMobile={isMobile}
      />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 flex flex-col h-[calc(100vh-80px)] sm:h-[calc(100vh-88px)]">
        <TitleInput
          value={title}
          onChange={setTitle}
          placeholder={deriveTitleFromContent(content) || 'Untitled document'}
        />
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 flex-1 min-h-0">
          {(isMobile ? activeView === 'editor' : activeView !== 'preview') && (
            <Editor
              content={content}
              setContent={setContent}
              charCount={charCount}
              wordCount={wordCount}
            />
          )}
          {(isMobile ? activeView === 'preview' : activeView !== 'editor') && (
            <Preview
              html={preview}
              onContentChange={setContent}
              isEditable={activeView !== 'preview'}
            />
          )}
        </div>
      </main>

      {showShareModal && (
        <ShareModal
          content={content}
          title={activeTitle}
          generateShareUrl={generateShareUrl}
          cloudSlug={cloudSlug}
          editToken={editToken}
          onCloudSave={handleCloudSave}
          authToken={authToken}
          onAuthToken={setAuthToken}
          onClose={() => setShowShareModal(false)}
          showToast={showToast}
        />
      )}

      {showMyDocumentsModal && (
        <MyDocumentsModal
          authToken={authToken}
          onAuthToken={setAuthToken}
          onLoadDocument={handleLoadCloudDocument}
          onClose={() => setShowMyDocumentsModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          content={content}
          title={activeTitle}
          onClose={() => setShowExportModal(false)}
          showToast={showToast}
        />
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearConfirm}
        title="Clear Editor"
        message="Are you sure you want to clear all content? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showLoadSampleConfirm}
        onClose={() => {
          setShowLoadSampleConfirm(false);
          setPendingSample(null);
        }}
        onConfirm={handleLoadSampleConfirm}
        title="Load Sample Document"
        message="This will replace your current content. Are you sure you want to continue?"
        confirmText="Load Sample"
        cancelText="Cancel"
        variant="warning"
      />

      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}

export default App;
