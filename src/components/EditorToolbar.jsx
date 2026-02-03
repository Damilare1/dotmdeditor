import { useCallback } from 'react';

function EditorToolbar({ textareaRef, content, setContent }) {
  const insertText = useCallback((before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newContent =
      content.substring(0, start) +
      before +
      textToInsert +
      after +
      content.substring(end);

    setContent(newContent);

    // Set cursor position after React re-renders
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length + after.length;
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + textToInsert.length
        );
      } else {
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + placeholder.length
        );
      }
    }, 0);
  }, [textareaRef, content, setContent]);

  const insertLineStart = useCallback((prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;

    const newContent =
      content.substring(0, lineStart) +
      prefix +
      content.substring(lineStart);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [textareaRef, content, setContent]);

  const tools = [
    {
      group: 'text',
      items: [
        {
          icon: 'B',
          label: 'Bold',
          action: () => insertText('**', '**', 'bold text'),
          className: 'font-bold',
        },
        {
          icon: 'I',
          label: 'Italic',
          action: () => insertText('*', '*', 'italic text'),
          className: 'italic',
        },
        {
          icon: 'S',
          label: 'Strikethrough',
          action: () => insertText('~~', '~~', 'strikethrough'),
          className: 'line-through',
        },
      ],
    },
    {
      group: 'headings',
      items: [
        {
          icon: 'H1',
          label: 'Heading 1',
          action: () => insertLineStart('# '),
          className: 'text-xs font-bold',
        },
        {
          icon: 'H2',
          label: 'Heading 2',
          action: () => insertLineStart('## '),
          className: 'text-xs font-bold',
        },
        {
          icon: 'H3',
          label: 'Heading 3',
          action: () => insertLineStart('### '),
          className: 'text-xs font-bold',
        },
      ],
    },
    {
      group: 'lists',
      items: [
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ),
          label: 'Unordered List',
          action: () => insertLineStart('- '),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          ),
          label: 'Ordered List',
          action: () => insertLineStart('1. '),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
          label: 'Task List',
          action: () => insertLineStart('- [ ] '),
        },
      ],
    },
    {
      group: 'blocks',
      items: [
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          label: 'Code',
          action: () => insertText('`', '`', 'code'),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          label: 'Code Block',
          action: () => insertText('```\n', '\n```', 'code block'),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
          label: 'Blockquote',
          action: () => insertLineStart('> '),
        },
      ],
    },
    {
      group: 'insert',
      items: [
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
          label: 'Link',
          action: () => insertText('[', '](url)', 'link text'),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          label: 'Image',
          action: () => insertText('![', '](image-url)', 'alt text'),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          label: 'Table',
          action: () => insertText(
            '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |',
            '',
            ''
          ),
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          ),
          label: 'Horizontal Rule',
          action: () => insertText('\n---\n', '', ''),
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white/5 border-b border-white/10 overflow-x-auto scrollbar-thin">
      {tools.map((group, groupIndex) => (
        <div key={group.group} className="flex items-center">
          {groupIndex > 0 && (
            <div className="w-px h-5 bg-white/20 mx-1" />
          )}
          <div className="flex items-center gap-0.5">
            {group.items.map((tool) => (
              <button
                key={tool.label}
                onClick={tool.action}
                title={tool.label}
                className={`p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all ${tool.className || ''}`}
              >
                {typeof tool.icon === 'string' ? (
                  <span className="w-5 h-5 flex items-center justify-center text-sm">
                    {tool.icon}
                  </span>
                ) : (
                  tool.icon
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default EditorToolbar;
