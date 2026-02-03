import { useState, useRef, useEffect } from 'react';
import {
  PencilSquareIcon,
  ShareIcon,
  ClipboardIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  RocketLaunchIcon,
} from './Icons';

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
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowHelpMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <PencilSquareIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Markdown Editor</h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                Write and preview in real-time
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile View Toggle */}
            {isMobile && (
              <div className="flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('editor')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'editor'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'preview'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Help/Samples Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowHelpMenu(!showHelpMenu)}
                  className="group flex items-center gap-2 px-3 py-2 bg-amber-500/80 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                >
                  <QuestionMarkCircleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Help</span>
                </button>

                {showHelpMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl overflow-hidden z-50 animate-modal-in">
                    <div className="p-2">
                      <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Sample Documents
                      </p>
                      <button
                        onClick={() => {
                          onLoadSample('documentation');
                          setShowHelpMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <BookOpenIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Full Documentation</p>
                          <p className="text-xs text-gray-500">Complete feature guide</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          onLoadSample('quickstart');
                          setShowHelpMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                          <RocketLaunchIcon className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Quick Start</p>
                          <p className="text-xs text-gray-500">Get started in 2 minutes</p>
                        </div>
                      </button>
                    </div>
                    <div className="border-t border-gray-100 p-2">
                      <div className="px-3 py-2 text-xs text-gray-500">
                        <p className="font-medium text-gray-700 mb-1">Keyboard Shortcuts</p>
                        <div className="space-y-1">
                          <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl+B</kbd> Bold</p>
                          <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl+I</kbd> Italic</p>
                          <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl+K</kbd> Link</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onShare}
                className="group flex items-center gap-2 px-3 py-2 bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
              >
                <ShareIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={onExport}
                className="group flex items-center gap-2 px-3 py-2 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={onCopy}
                className="group flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
              >
                <ClipboardIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                onClick={onClear}
                className="group flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
