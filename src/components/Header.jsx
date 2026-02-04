import { useState, useRef, useEffect } from 'react';
import {
  PencilSquareIcon,
  ShareIcon,
  ClipboardIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  GitHubIcon,
} from './Icons';

const GITHUB_URL = 'https://github.com/Damilare1/dotmdeditor';

// Three dots menu icon
function EllipsisIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

function Header({
  onShare,
  onCopy,
  onExport,
  onClear,
  onLoadSample,
  activeView,
  setActiveView,
  isMobile,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <PencilSquareIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Markdown Editor</h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                Write and preview in real-time
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Mobile View Toggle */}
            {isMobile && (
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveView('editor')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    activeView === 'editor'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    activeView === 'preview'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}

            {/* Primary Actions - Hidden on mobile */}
            <button
              onClick={onShare}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-linear-to-r from-primary to-accent hover:opacity-90 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25"
            >
              <ShareIcon className="w-4 h-4" />
              <span>Share</span>
            </button>

            <button
              onClick={onExport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* More Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  showMenu
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
                }`}
                title="More options"
              >
                <EllipsisIcon className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl overflow-hidden z-50 animate-modal-in">
                  {/* Primary Actions - Visible only on mobile */}
                  <div className="p-1.5 sm:hidden">
                    <button
                      onClick={() => {
                        onShare();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <ShareIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Share</span>
                    </button>
                    <button
                      onClick={() => {
                        onExport();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Export</span>
                    </button>
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <GitHubIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">View on GitHub</span>
                    </a>
                  </div>

                  {/* Divider - Only on mobile */}
                  <div className="border-t border-gray-100 sm:hidden" />

                  {/* Other Actions */}
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        onCopy();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ClipboardIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Copy Markdown</span>
                    </button>
                    <button
                      onClick={() => {
                        onClear();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span className="text-sm">Clear Editor</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Sample Documents */}
                  <div className="p-1.5">
                    <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Load Sample
                    </p>
                    <button
                      onClick={() => {
                        onLoadSample('documentation');
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <BookOpenIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm">Full Documentation</span>
                    </button>
                    <button
                      onClick={() => {
                        onLoadSample('quickstart');
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <RocketLaunchIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">Quick Start Guide</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Keyboard Shortcuts */}
                  <div className="p-3 bg-gray-50">
                    <p className="text-xs font-medium text-gray-600 mb-2">Keyboard Shortcuts</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                      <span><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">⌘B</kbd> Bold</span>
                      <span><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">⌘I</kbd> Italic</span>
                      <span><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">⌘K</kbd> Link</span>
                      <span><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">Tab</kbd> Indent</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GitHub Link - Hidden on mobile */}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center w-9 h-9 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-all"
              title="View source on GitHub"
            >
              <GitHubIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
