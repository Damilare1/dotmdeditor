import { useCallback } from 'react';

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

function Editor({ content, setContent, charCount, wordCount }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const newContent =
          content.substring(0, start) + '    ' + content.substring(end);
        setContent(newContent);
        // Set cursor position after React re-renders
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = start + 4;
        }, 0);
      }
    },
    [content, setContent]
  );

  return (
    <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-0">
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
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 w-full p-4 sm:p-6 bg-transparent text-gray-100 resize-none font-mono text-sm leading-relaxed focus:outline-none placeholder-gray-600 scrollbar-thin"
        placeholder={PLACEHOLDER}
        spellCheck="false"
      />
    </div>
  );
}

export default Editor;
