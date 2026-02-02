import { useState, useEffect, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import LZString from 'lz-string';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import ShareModal from './components/ShareModal';
import Toast from './components/Toast';

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
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Load content from URL or localStorage on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#doc=')) {
      try {
        const compressed = hash.substring(5);
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          setContent(decompressed);
          localStorage.setItem(STORAGE_KEY, decompressed);
          history.replaceState(null, '', window.location.pathname);
          showToast('Document loaded from link');
          return;
        }
      } catch (e) {
        console.error('Failed to load from URL:', e);
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setContent(saved);
    }
  }, []);

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

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
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

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded document.md');
  }, [content, showToast]);

  const handleClear = useCallback(() => {
    if (content && window.confirm('Clear all content?')) {
      setContent('');
      showToast('Editor cleared');
    }
  }, [content, showToast]);

  const generateShareUrl = useCallback(() => {
    if (!content.trim()) {
      showToast('Nothing to share');
      return null;
    }
    const compressed = LZString.compressToEncodedURIComponent(content);
    const url = `${window.location.origin}${window.location.pathname}#doc=${compressed}`;
    return { url, length: url.length };
  }, [content, showToast]);

  const preview = useMemo(() => {
    if (!content.trim()) {
      return '<p class="text-gray-400 italic">Start typing to see the preview...</p>';
    }
    return marked.parse(content);
  }, [content]);

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      <Header
        onShare={() => setShowShareModal(true)}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onClear={handleClear}
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
            <Preview html={preview} />
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

      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}

export default App;
