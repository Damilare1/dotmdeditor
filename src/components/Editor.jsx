import { useCallback, useRef, useEffect, useState } from 'react';
import EditorToolbar from './EditorToolbar';

const PLACEHOLDER = `# Start writing your markdown here...

## Features
- **Bold** and *italic* text
- [Links](https://example.com)
- \`inline code\`

\`\`\`javascript
// Code blocks with syntax
const greeting = 'Hello, Markdown!';
\`\`\`

> Blockquotes for emphasis

| Tables | Are | Supported |
|--------|-----|-----------|
| Row 1  | A   | B         |
| Row 2  | C   | D         |
`;

const MAX_HISTORY = 100;

function Editor({ content, setContent, charCount, wordCount }) {
  const textareaRef = useRef(null);

  // History state stored in refs (not state) to avoid re-render loops
  const historyRef = useRef([content]);
  const indexRef = useRef(0);
  const latestRef = useRef(content);   // always tracks the latest content value
  const isInternalRef = useRef(false); // true when this component caused the change
  const debounceRef = useRef(null);

  // Reactive flags so toolbar buttons can enable/disable
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  // When content changes from outside (clear, load sample, URL load) reset history
  useEffect(() => {
    if (isInternalRef.current) {
      isInternalRef.current = false;
      return;
    }
    historyRef.current = [content];
    indexRef.current = 0;
    latestRef.current = content;
    setCanUndo(false);
    setCanRedo(false);
  }, [content]);

  // Commit a value to history immediately (used by toolbar and shortcuts)
  const commitImmediate = useCallback((value) => {
    clearTimeout(debounceRef.current);
    const history = historyRef.current;
    const idx = indexRef.current;
    const cur = latestRef.current;

    // Persist unsaved typing state before adding new entry
    let base = history;
    let baseIdx = idx;
    if (base[baseIdx] !== cur) {
      base = base.slice(0, baseIdx + 1);
      base.push(cur);
      if (base.length > MAX_HISTORY) base.shift();
      baseIdx = base.length - 1;
    }

    if (base[baseIdx] === value) {
      historyRef.current = base;
      indexRef.current = baseIdx;
      refreshFlags();
      return;
    }

    const next = base.slice(0, baseIdx + 1);
    next.push(value);
    if (next.length > MAX_HISTORY) next.shift();
    historyRef.current = next;
    indexRef.current = next.length - 1;
    latestRef.current = value;
    isInternalRef.current = true;
    setContent(value);
    refreshFlags();
  }, [setContent, refreshFlags]);

  // Restore a history entry (shared by undo and redo)
  const applyHistoryEntry = useCallback((value) => {
    latestRef.current = value;
    isInternalRef.current = true;
    setContent(value);
    refreshFlags();
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(value.length, value.length);
      }
    }, 0);
  }, [setContent, refreshFlags]);

  const undo = useCallback(() => {
    clearTimeout(debounceRef.current);
    // Flush any unsaved typing into history so redo can come back to it
    const cur = latestRef.current;
    const idx = indexRef.current;
    let history = historyRef.current;
    if (history[idx] !== cur) {
      history = history.slice(0, idx + 1);
      history.push(cur);
      if (history.length > MAX_HISTORY) history.shift();
      historyRef.current = history;
      indexRef.current = history.length - 1;
    }
    if (indexRef.current > 0) {
      indexRef.current--;
      applyHistoryEntry(historyRef.current[indexRef.current]);
    }
  }, [applyHistoryEntry]);

  const redo = useCallback(() => {
    clearTimeout(debounceRef.current);
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++;
      applyHistoryEntry(historyRef.current[indexRef.current]);
    }
  }, [applyHistoryEntry]);

  // Regular textarea onChange — debounce history writes so each keypress isn't a separate undo step
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    latestRef.current = value;
    isInternalRef.current = true;
    setContent(value);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const history = historyRef.current;
      const idx = indexRef.current;
      if (history[idx] === value) return;
      const next = history.slice(0, idx + 1);
      next.push(value);
      if (next.length > MAX_HISTORY) next.shift();
      historyRef.current = next;
      indexRef.current = next.length - 1;
      refreshFlags();
    }, 500);
  }, [setContent, refreshFlags]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = latestRef.current.substring(0, start) + '    ' + latestRef.current.substring(end);
      commitImmediate(value);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
      return;
    }

    // Undo: Ctrl/Cmd+Z
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    // Redo: Ctrl/Cmd+Y  or  Ctrl/Cmd+Shift+Z
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      redo();
      return;
    }

    // Formatting shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const cur = latestRef.current;
      const selectedText = cur.substring(start, end);

      let before = '';
      let after = '';
      let handled = false;

      switch (e.key.toLowerCase()) {
        case 'b': before = '**'; after = '**'; handled = true; break;
        case 'i': before = '*';  after = '*';  handled = true; break;
        case 'k': before = '[';  after = '](url)'; handled = true; break;
        default: break;
      }

      if (handled) {
        e.preventDefault();
        const newContent =
          cur.substring(0, start) +
          before +
          (selectedText || 'text') +
          after +
          cur.substring(end);
        commitImmediate(newContent);
        setTimeout(() => {
          textarea.focus();
          if (selectedText) {
            textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
          } else {
            textarea.setSelectionRange(start + before.length, start + before.length + 4);
          }
        }, 0);
      }
    }
  }, [undo, redo, commitImmediate]);

  return (
    <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-sm font-medium text-gray-400 ml-2">markdown</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">{charCount} chars</span>
          <span className="text-gray-600">|</span>
          <span className="text-xs text-gray-500">{wordCount} words</span>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <EditorToolbar
        textareaRef={textareaRef}
        content={content}
        setContent={commitImmediate}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="flex-1 w-full p-4 sm:p-6 bg-transparent text-gray-100 resize-none font-mono text-sm leading-relaxed focus:outline-none placeholder-gray-600 scrollbar-thin"
        placeholder={PLACEHOLDER}
        spellCheck="false"
      />
    </div>
  );
}

export default Editor;
