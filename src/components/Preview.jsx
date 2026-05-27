import { useRef, useCallback, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import mermaid from 'mermaid';
import { renderMath } from './renderMath';
import { EyeIcon } from './Icons';

// Configure turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndownService.use(gfm);

turndownService.addRule('mermaid-diagram', {
  filter: (node) => node.nodeName === 'DIV' && node.classList.contains('mermaid-diagram'),
  replacement: (content, node) => {
    const source = decodeURIComponent(node.getAttribute('data-source') || '');
    return source ? `\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n` : content;
  },
});

turndownService.addRule('plantuml-diagram', {
  filter: (node) => node.nodeName === 'DIV' && node.classList.contains('plantuml-diagram'),
  replacement: (content, node) => {
    const source = decodeURIComponent(node.getAttribute('data-source') || '');
    return source ? `\n\n\`\`\`plantuml\n${source}\n\`\`\`\n\n` : content;
  },
});

turndownService.addRule('math-block', {
  filter: (node) => node.nodeName === 'DIV' && node.classList.contains('math-block'),
  replacement: (content, node) => {
    const src = decodeURIComponent(node.getAttribute('data-math') || '');
    return src ? `\n\n$$\n${src}\n$$\n\n` : content;
  },
});

turndownService.addRule('math-inline', {
  filter: (node) => node.nodeName === 'SPAN' && node.classList.contains('math-inline'),
  replacement: (content, node) => {
    const src = decodeURIComponent(node.getAttribute('data-math') || '');
    return src ? `$${src}$` : content;
  },
});

function setupMermaidZoom(container) {
  container.querySelectorAll('.mermaid-diagram:not([data-zoom])').forEach(diagram => {
    const svg = diagram.querySelector('svg');
    if (!svg) return;

    diagram.setAttribute('data-zoom', '1');

    const mermaidEl = svg.parentElement;
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, ox = 0, oy = 0;

    const inner = document.createElement('div');
    inner.className = 'mermaid-pan-area';
    diagram.insertBefore(inner, mermaidEl);
    inner.appendChild(mermaidEl);

    const ctrl = document.createElement('div');
    ctrl.className = 'mermaid-controls';
    ctrl.innerHTML = `
      <button data-a="in" title="Zoom in">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
      </button>
      <button data-a="fit" title="Fit diagram">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 3,3 6,3"/><polyline points="10,3 13,3 13,6"/><polyline points="13,10 13,13 10,13"/><polyline points="6,13 3,13 3,10"/></svg>
      </button>
      <button data-a="out" title="Zoom out">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="8" x2="13" y2="8"/></svg>
      </button>
    `;
    diagram.appendChild(ctrl);

    function apply() {
      mermaidEl.style.transformOrigin = '0 0';
      mermaidEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    function fit() {
      const aw = inner.clientWidth || 600;
      const svgRect = svg.getBoundingClientRect();
      const sw = svgRect.width || parseFloat(svg.getAttribute('width')) || 600;
      const sh = svgRect.height || parseFloat(svg.getAttribute('height')) || 300;
      scale = Math.min(1, (aw - 32) / sw);
      tx = Math.max(8, (aw - sw * scale) / 2);
      ty = 8;
      inner.style.height = `${Math.max(Math.min(sh * scale + 56, 560), 120)}px`;
      apply();
    }

    inner.addEventListener('wheel', e => {
      e.preventDefault();
      const r = inner.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const ns = Math.min(Math.max(scale * f, 0.08), 10);
      tx = cx - (cx - tx) * (ns / scale);
      ty = cy - (cy - ty) * (ns / scale);
      scale = ns;
      apply();
    }, { passive: false });

    inner.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      dragging = true;
      ox = e.clientX - tx;
      oy = e.clientY - ty;
      inner.setPointerCapture(e.pointerId);
      inner.style.cursor = 'grabbing';
    });

    inner.addEventListener('pointermove', e => {
      if (!dragging) return;
      tx = e.clientX - ox;
      ty = e.clientY - oy;
      apply();
    });

    ['pointerup', 'pointercancel'].forEach(ev =>
      inner.addEventListener(ev, () => {
        dragging = false;
        inner.style.cursor = 'grab';
      })
    );

    ctrl.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      if (a === 'fit') { fit(); return; }
      const cx = inner.clientWidth / 2, cy = inner.clientHeight / 2;
      const f = a === 'in' ? 1.3 : 1 / 1.3;
      const ns = Math.min(Math.max(scale * f, 0.08), 10);
      tx = cx - (cx - tx) * (ns / scale);
      ty = cy - (cy - ty) * (ns / scale);
      scale = ns;
      apply();
    });

    inner.style.cursor = 'grab';
    requestAnimationFrame(fit);
  });
}

async function runMermaid(container) {
  const nodes = Array.from(container.querySelectorAll('.mermaid'));
  if (nodes.length > 0) {
    await mermaid.run({ nodes, suppressErrors: true }).catch(() => {});
    setupMermaidZoom(container);
  }
}

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
      renderMath(contentRef.current);
      runMermaid(contentRef.current);
    }
  }, [html]);

  // Set initial HTML on mount
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = html;
      renderMath(contentRef.current);
      runMermaid(contentRef.current);
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
