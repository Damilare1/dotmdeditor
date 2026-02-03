import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
  ExternalHyperlink,
} from 'docx';
import {
  XMarkIcon,
  DocumentIcon,
  SpinnerIcon,
} from './Icons';

function ExportModal({ content, onClose, showToast }) {
  const [isExporting, setIsExporting] = useState(null);
  const [filename, setFilename] = useState('document');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const exportMarkdown = useCallback(() => {
    setIsExporting('md');
    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, `${filename}.md`);
      showToast('Exported as Markdown');
      onClose();
    } catch (err) {
      console.error('MD export failed:', err);
      showToast('Export failed');
    }
    setIsExporting(null);
  }, [content, filename, showToast, onClose]);

  const exportPDF = useCallback(async () => {
    setIsExporting('pdf');
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Parse markdown to HTML
      const html = marked.parse(content);

      // Create a styled container that matches the preview
      const container = document.createElement('div');
      container.innerHTML = `
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            font-size: 24pt;
            font-weight: 700;
            color: #1a1a2e;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 10px;
            margin: 0 0 20px 0;
          }
          h2 {
            font-size: 18pt;
            font-weight: 600;
            color: #1a1a2e;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin: 30px 0 15px 0;
          }
          h3 {
            font-size: 14pt;
            font-weight: 600;
            color: #1a1a2e;
            margin: 25px 0 12px 0;
          }
          h4 {
            font-size: 12pt;
            font-weight: 600;
            color: #374151;
            margin: 20px 0 10px 0;
          }
          h5, h6 {
            font-size: 11pt;
            font-weight: 600;
            color: #374151;
            margin: 18px 0 8px 0;
          }
          p {
            margin: 0 0 16px 0;
            line-height: 1.7;
          }
          a {
            color: #6366f1;
            text-decoration: underline;
          }
          strong {
            font-weight: 600;
            color: #1f2937;
          }
          em {
            font-style: italic;
          }
          code {
            background: #f3f4f6;
            color: #db2777;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 9pt;
          }
          pre {
            background: #1f2937;
            color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 9pt;
            line-height: 1.5;
          }
          pre code {
            background: none;
            color: inherit;
            padding: 0;
            font-size: inherit;
          }
          blockquote {
            border-left: 4px solid #6366f1;
            background: rgba(99, 102, 241, 0.05);
            padding: 12px 16px;
            margin: 16px 0;
            font-style: italic;
            color: #4b5563;
            border-radius: 0 8px 8px 0;
          }
          blockquote p {
            margin: 0;
          }
          ul, ol {
            margin: 0 0 16px 0;
            padding-left: 24px;
          }
          li {
            margin: 6px 0;
            line-height: 1.6;
          }
          li > ul, li > ol {
            margin: 6px 0 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 10pt;
          }
          th {
            background: #6366f1;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            border: 1px solid #e5e7eb;
            padding: 10px 12px;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          hr {
            border: none;
            height: 2px;
            background: linear-gradient(to right, transparent, #d1d5db, transparent);
            margin: 32px 0;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
          }
        </style>
        <div class="content">${html}</div>
      `;

      document.body.appendChild(container);

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: 'avoid-all' }
      };

      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);

      showToast('Exported as PDF');
      onClose();
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('PDF export failed');
    }
    setIsExporting(null);
  }, [content, filename, showToast, onClose]);

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
                <DocumentIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Export Document</h2>
                <p className="text-white/70 text-sm">Choose a format</p>
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
          {/* Filename input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="document"
            />
          </div>

          {/* Export options */}
          <div className="space-y-3">
            {/* Markdown */}
            <button
              onClick={exportMarkdown}
              disabled={isExporting !== null}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">MD</span>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800">Markdown</h3>
                <p className="text-sm text-gray-500">Plain text with formatting</p>
              </div>
              {isExporting === 'md' ? (
                <SpinnerIcon className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <span className="text-gray-400 group-hover:text-primary transition-colors">.md</span>
              )}
            </button>

            {/* PDF */}
            <button
              onClick={exportPDF}
              disabled={isExporting !== null}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">PDF</span>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800">PDF Document</h3>
                <p className="text-sm text-gray-500">Best for printing & sharing</p>
              </div>
              {isExporting === 'pdf' ? (
                <SpinnerIcon className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <span className="text-gray-400 group-hover:text-red-500 transition-colors">.pdf</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;
