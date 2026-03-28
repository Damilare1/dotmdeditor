import { useRef, useCallback, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { EyeIcon } from './Icons';

// Configure turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndownService.use(gfm);

// Formatting toolbar button component
function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
        active ? 'bg-primary/20 text-primary' : 'text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

// Toolbar separator
function ToolbarSeparator() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}

function Preview({ html, onContentChange, isEditable = false }) {
  const contentRef = useRef(null);
  const scrollRef = useRef(null);
  const isEditingRef = useRef(false);
  const lastHtmlRef = useRef(html);
  const [showToolbar, setShowToolbar] = useState(false);

  // Only update innerHTML when html changes from external source (not from editing)
  useEffect(() => {
    if (!contentRef.current) return;

    // Skip update if we're currently editing (to preserve cursor position)
    if (isEditingRef.current) return;

    // Only update if html actually changed from external source
    if (html !== lastHtmlRef.current) {
      contentRef.current.innerHTML = html;
      lastHtmlRef.current = html;
    }
  }, [html]);

  // Set initial HTML on mount
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = html;
    }
  }, []);

  const syncToMarkdown = useCallback(() => {
    if (!contentRef.current || !onContentChange) return;

    isEditingRef.current = true;

    // Convert HTML back to markdown
    const markdown = turndownService.turndown(contentRef.current.innerHTML);
    onContentChange(markdown);

    // Keep editing flag true for a short time to prevent HTML reset
    setTimeout(() => {
      isEditingRef.current = false;
      // Update lastHtmlRef to prevent unnecessary DOM updates
      if (contentRef.current) {
        lastHtmlRef.current = contentRef.current.innerHTML;
      }
    }, 300);
  }, [onContentChange]);

  const handleInput = useCallback(() => {
    syncToMarkdown();
  }, [syncToMarkdown]);

  const handleClick = useCallback((e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href?.startsWith('#')) return;
    e.preventDefault();
    const id = href.slice(1);
    const target = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (target && scrollRef.current) {
      const containerRect = scrollRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      scrollRef.current.scrollBy({
        top: targetRect.top - containerRect.top - 16,
        behavior: 'smooth',
      });
    }
  }, []);

  const handleFocus = useCallback(() => {
    if (isEditable) {
      setShowToolbar(true);
    }
  }, [isEditable]);

  const handleBlur = useCallback((e) => {
    if (!contentRef.current || !onContentChange) return;

    // Don't hide toolbar if clicking on toolbar buttons
    if (e.relatedTarget?.closest('.preview-toolbar')) {
      return;
    }

    // Final conversion on blur
    const markdown = turndownService.turndown(contentRef.current.innerHTML);
    onContentChange(markdown);

    // Reset editing state
    isEditingRef.current = false;
    setShowToolbar(false);
  }, [onContentChange]);

  // Formatting commands
  const execCommand = useCallback((command, value = null) => {
    contentRef.current?.focus();
    document.execCommand(command, false, value);
    syncToMarkdown();
  }, [syncToMarkdown]);

  const formatBold = () => execCommand('bold');
  const formatItalic = () => execCommand('italic');
  const formatUnderline = () => execCommand('underline');
  const formatStrikethrough = () => execCommand('strikeThrough');

  const formatHeading = (level) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'Heading';

    const heading = document.createElement(`h${level}`);
    heading.textContent = selectedText;

    range.deleteContents();
    range.insertNode(heading);

    // Move cursor after the heading
    range.setStartAfter(heading);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    syncToMarkdown();
  };

  const formatList = (ordered) => {
    execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  const formatLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const formatCode = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'code';

    const code = document.createElement('code');
    code.textContent = selectedText;

    range.deleteContents();
    range.insertNode(code);

    syncToMarkdown();
  };

  const formatBlockquote = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'Quote';

    const blockquote = document.createElement('blockquote');
    const p = document.createElement('p');
    p.textContent = selectedText;
    blockquote.appendChild(p);

    range.deleteContents();
    range.insertNode(blockquote);

    syncToMarkdown();
  };

  const insertHR = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const hr = document.createElement('hr');

    range.deleteContents();
    range.insertNode(hr);

    // Move cursor after HR
    range.setStartAfter(hr);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    syncToMarkdown();
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <EyeIcon className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium text-gray-600">Preview</span>
        {isEditable && (
          <span className="ml-auto text-xs text-gray-400">
            Click to edit
          </span>
        )}
      </div>

      {/* Formatting Toolbar */}
      {isEditable && showToolbar && (
        <div className="preview-toolbar flex items-center gap-0.5 px-3 py-2 bg-gray-100 border-b border-gray-200 flex-wrap">
          {/* Text formatting */}
          <ToolbarButton onClick={formatBold} title="Bold (Ctrl+B)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={formatItalic} title="Italic (Ctrl+I)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={formatUnderline} title="Underline (Ctrl+U)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={formatStrikethrough} title="Strikethrough">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9.5c0-2.5-2.5-4-5-4s-5 1.5-5 4c0 1.5 1 2.5 2 3m-4 0h14m-5 1c1 .5 2 1.5 2 3 0 2.5-2.5 4-5 4s-5-1.5-5-4" />
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Headings */}
          <ToolbarButton onClick={() => formatHeading(1)} title="Heading 1">
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => formatHeading(2)} title="Heading 2">
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => formatHeading(3)} title="Heading 3">
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarButton onClick={() => formatList(false)} title="Bullet List">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="2" cy="6" r="1" fill="currentColor" />
              <circle cx="2" cy="12" r="1" fill="currentColor" />
              <circle cx="2" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => formatList(true)} title="Numbered List">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13" />
              <text x="1" y="8" fontSize="6" fill="currentColor" fontWeight="bold">1</text>
              <text x="1" y="14" fontSize="6" fill="currentColor" fontWeight="bold">2</text>
              <text x="1" y="20" fontSize="6" fill="currentColor" fontWeight="bold">3</text>
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Block elements */}
          <ToolbarButton onClick={formatBlockquote} title="Blockquote">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={formatCode} title="Inline Code">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={formatLink} title="Insert Link (Ctrl+K)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={insertHR} title="Horizontal Rule">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </ToolbarButton>
        </div>
      )}

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div
          ref={contentRef}
          className={`p-4 sm:p-8 prose-custom ${
            isEditable ? 'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset cursor-text' : ''
          }`}
          contentEditable={isEditable}
          suppressContentEditableWarning={true}
          onInput={isEditable ? handleInput : undefined}
          onFocus={handleFocus}
          onBlur={isEditable ? handleBlur : undefined}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}

export default Preview;
