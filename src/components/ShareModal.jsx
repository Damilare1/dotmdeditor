import { useState, useEffect, useCallback } from 'react';
import {
  ShareIcon,
  XMarkIcon,
  ClipboardIcon,
  LinkIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  SpinnerIcon,
} from './Icons';

async function shortenUrl(longUrl) {
  const response = await fetch(
    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
  );
  if (!response.ok) {
    throw new Error('Failed to shorten URL');
  }
  return await response.text();
}

function ShareModal({ generateShareUrl, onClose, showToast }) {
  const [shareUrl, setShareUrl] = useState('');
  const [urlLength, setUrlLength] = useState(0);
  const [shortUrl, setShortUrl] = useState('');
  const [isShortening, setIsShortening] = useState(false);
  const [shortenError, setShortenError] = useState('');

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

  const handleCopyShortUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      showToast('Short link copied!');
      onClose();
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy');
    }
  }, [shortUrl, showToast, onClose]);

  const handleShorten = useCallback(async () => {
    if (!shareUrl) return;

    setIsShortening(true);
    setShortenError('');

    try {
      const shortened = await shortenUrl(shareUrl);
      if (shortened && shortened.startsWith('http')) {
        setShortUrl(shortened);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('Failed to shorten:', err);
      setShortenError(
        'Failed to shorten URL. The service may be unavailable or the URL is too long.'
      );
    }

    setIsShortening(false);
  }, [shareUrl]);

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

          {/* Shorten URL */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-gray-700">
                  Shorten URL
                </span>
              </div>
              <button
                onClick={handleShorten}
                disabled={isShortening || !!shortUrl}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isShortening ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin" />
                    Shortening...
                  </>
                ) : shortUrl ? (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Done!
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Shorten
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Creates a short link using TinyURL (free service)
            </p>

            {shortUrl && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={shortUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium focus:outline-none"
                />
                <button
                  onClick={handleCopyShortUrl}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  Copy
                </button>
              </div>
            )}

            {shortenError && (
              <p className="mt-2 text-red-500 text-xs">{shortenError}</p>
            )}
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
