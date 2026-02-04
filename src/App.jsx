import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import LZString from 'lz-string';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import ShareModal from './components/ShareModal';
import ExportModal from './components/ExportModal';
import ConfirmModal from './components/ConfirmModal';
import Toast from './components/Toast';
import { sampleDocumentation, quickStartGuide } from './sampleDocs';

const STORAGE_KEY = 'markdown-editor-content';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

function App() {
  const [content, setContent] = useState('');
  const [activeView, setActiveView] = useState('editor');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLoadSampleConfirm, setShowLoadSampleConfirm] = useState(false);
  const [pendingSample, setPendingSample] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
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
            // Switch to preview on mobile when document is loaded from URL
            if (window.innerWidth < 640) {
              setActiveView('preview');
            }
            showToast('Document loaded from link');
            return true;
          }
        } catch (e) {
          console.error('Failed to load from URL:', e);
        }
      }
      return false;
    };

    // Try loading from hash on mount
    if (!loadFromHash()) {
      // No hash found, try localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContent(saved);
      }
    }

    // Listen for hash changes (when user navigates to a shared link while on page)
    const handleHashChange = () => {
      loadFromHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [showToast]);

  // Save content to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, content);
  }, [content]);

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

  const generateShareUrl = useCallback(() => {
    if (!content.trim()) {
      showToast('Nothing to share');
      return null;
    }
    const compressed = LZString.compressToEncodedURIComponent(content);
    const url = `${window.location.origin}${window.location.pathname}#doc=${compressed}`;
    return { url, length: url.length };
  }, [content, showToast]);

  // Compute preview HTML from markdown content (sanitized to prevent XSS)
  const preview = content.trim()
    ? DOMPurify.sanitize(marked.parse(content))
    : '<p class="text-gray-400 italic">Start typing to see the preview...</p>';

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      <Header
        onShare={() => setShowShareModal(true)}
        onCopy={handleCopy}
        onExport={() => setShowExportModal(true)}
        onClear={handleClearRequest}
        onLoadSample={handleLoadSample}
        activeView={activeView}
        setActiveView={setActiveView}
        isMobile={isMobile}
      />

      <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 h-[calc(100vh-80px)] sm:h-[calc(100vh-88px)]">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 h-full">
          {(!isMobile || activeView === 'editor') && (
            <Editor
              content={content}
              setContent={setContent}
              charCount={charCount}
              wordCount={wordCount}
            />
          )}
          {(!isMobile || activeView === 'preview') && (
            <Preview
              html={preview}
              onContentChange={setContent}
              isEditable={true}
            />
          )}
        </div>
      </main>

      {showShareModal && (
        <ShareModal
          generateShareUrl={generateShareUrl}
          onClose={() => setShowShareModal(false)}
          showToast={showToast}
        />
      )}

      {showExportModal && (
        <ExportModal
          content={content}
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
