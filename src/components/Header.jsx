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

function FolderIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

const GITHUB_URL = 'https://github.com/Damilare1/dotmdeditor';

// Three dots menu icon
function EllipsisIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

function SaveIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

function LockClosedIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function LockOpenIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}

function Header({
  onShare,
  onCopy,
  onExport,
  onClear,
  onLoadSample,
  onMyDocuments,
  onSaveChanges,
  onLockToggle,
  hasEditAccess,
  isDocLocked,
  isSavingChanges,
  isTogglingLock,
  activeView,
  setActiveView,
  isMobile,
}) {
  // Tabs are restricted when the doc is locked and this user is not the owner.
  const tabsLocked = isDocLocked && !hasEditAccess;

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
                  onClick={() => !tabsLocked && setActiveView('editor')}
                  disabled={tabsLocked}
                  title={tabsLocked ? 'Document is locked' : undefined}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    tabsLocked
                      ? 'opacity-40 cursor-not-allowed text-gray-400'
                      : activeView === 'editor'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {tabsLocked && <LockClosedIcon className="w-2.5 h-2.5" />}
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

            {/* Desktop View Toggle */}
            {!isMobile && (
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => !tabsLocked && setActiveView('editor')}
                  disabled={tabsLocked}
                  title={tabsLocked ? 'Document is locked' : undefined}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    tabsLocked
                      ? 'opacity-40 cursor-not-allowed text-gray-400'
                      : activeView === 'editor'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {tabsLocked && <LockClosedIcon className="w-2.5 h-2.5" />}
                  Editor
                </button>
                <button
                  onClick={() => !tabsLocked && setActiveView('split')}
                  disabled={tabsLocked}
                  title={tabsLocked ? 'Document is locked' : undefined}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    tabsLocked
                      ? 'opacity-40 cursor-not-allowed text-gray-400'
                      : activeView === 'split'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {tabsLocked && <LockClosedIcon className="w-2.5 h-2.5" />}
                  Split
                </button>
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeView === 'preview'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}

            {hasEditAccess && (
              <div className="hidden sm:flex items-center gap-1.5">
                {/* Save — only available when document is unlocked */}
                {!isDocLocked && (
                  <button
                    onClick={onSaveChanges}
                    disabled={isSavingChanges}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-all"
                    title="Save changes"
                  >
                    <SaveIcon className="w-4 h-4" />
                    <span>{isSavingChanges ? 'Saving…' : 'Save'}</span>
                  </button>
                )}

                {/* Lock — shown when document is not locked */}
                {!isDocLocked && (
                  <button
                    onClick={onLockToggle}
                    disabled={isTogglingLock}
                    title="Lock document — prevents all edits until unlocked"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-60"
                  >
                    <LockOpenIcon className="w-4 h-4" />
                    <span>{isTogglingLock ? 'Locking…' : 'Lock'}</span>
                  </button>
                )}

                {/* Unlock — shown when document is locked; only the owner will succeed */}
                {isDocLocked && (
                  <button
                    onClick={onLockToggle}
                    disabled={isTogglingLock}
                    title="Unlock document (owner only)"
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-60"
                  >
                    <LockClosedIcon className="w-4 h-4" />
                    <span>{isTogglingLock ? 'Unlocking…' : 'Locked'}</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onMyDocuments}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all"
            >
              <FolderIcon className="w-4 h-4" />
              <span>My Docs</span>
            </button>

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
                    {/* Save — only when unlocked and user has edit access */}
                    {hasEditAccess && !isDocLocked && (
                      <button
                        onClick={() => { onSaveChanges(); setShowMenu(false); }}
                        disabled={isSavingChanges}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <SaveIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{isSavingChanges ? 'Saving…' : 'Save Changes'}</span>
                      </button>
                    )}
                    {/* Lock — only when not locked */}
                    {hasEditAccess && !isDocLocked && (
                      <button
                        onClick={() => { onLockToggle(); setShowMenu(false); }}
                        disabled={isTogglingLock}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <LockOpenIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{isTogglingLock ? 'Locking…' : 'Lock Document'}</span>
                      </button>
                    )}
                    {/* Unlock — only when locked; server enforces owner-only */}
                    {hasEditAccess && isDocLocked && (
                      <button
                        onClick={() => { onLockToggle(); setShowMenu(false); }}
                        disabled={isTogglingLock}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <LockClosedIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{isTogglingLock ? 'Unlocking…' : 'Unlock Document'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => { onMyDocuments(); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FolderIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">My Documents</span>
                    </button>
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
