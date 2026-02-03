import { useState, useEffect, useCallback } from 'react';
import {
  ShareIcon,
  XMarkIcon,
  ClipboardIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
} from './Icons';

function ShareModal({ generateShareUrl, onClose, showToast }) {
  const [shareUrl, setShareUrl] = useState('');
  const [urlLength, setUrlLength] = useState(0);

  useEffect(() => {
    const result = generateShareUrl();
    if (result) {
      setShareUrl(result.url);
      setUrlLength(result.length);
    }
  }, [generateShareUrl]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard!');
      onClose();
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy link');
    }
  }, [shareUrl, showToast, onClose]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({
        title: 'Markdown Document',
        text: 'Check out this markdown document',
        url: shareUrl,
      });
      onClose();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        showToast('Share failed');
      }
    }
  }, [shareUrl, onClose, showToast]);

  if (!shareUrl) return null;

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
                <p className="text-white/70 text-sm">
                  Anyone with the link can view
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shareable Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleCopyUrl}
              className="px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <ClipboardIcon className="w-5 h-5" />
              Copy
            </button>
          </div>

          {/* Size Warning */}
          {urlLength > 2000 && (
            <p className="mt-3 text-amber-600 text-sm flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Large document - link may not work in all browsers</span>
            </p>
          )}

          {/* Native Share Button */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full mt-4 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <ArrowUpIcon className="w-5 h-5" />
              Share via...
            </button>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              The document content is encoded in the URL. No data is stored on
              any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
