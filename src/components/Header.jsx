import {
  PencilSquareIcon,
  ShareIcon,
  ClipboardIcon,
  DocumentArrowDownIcon,
  TrashIcon,
} from './Icons';

function Header({
  onShare,
  onCopy,
  onExport,
  onClear,
  activeView,
  setActiveView,
  isMobile,
}) {
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
