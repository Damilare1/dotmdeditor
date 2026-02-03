export const sampleDocumentation = `# Markdown Editor Documentation

Welcome to **Markdown Editor** — a free, powerful, and easy-to-use online markdown editor with live preview.

---

## Features

### Live Preview
See your markdown rendered in real-time as you type. The preview panel updates instantly, showing exactly how your document will look.

### Export Options
Export your documents in multiple formats:
- **Markdown (.md)** — Plain text with formatting
- **PDF (.pdf)** — Best for printing and sharing
- **Word (.docx)** — Editable in Microsoft Word

### Share Instantly
Share your documents with anyone using a unique URL. No sign-up required!
1. Click the **Share** button
2. Copy the generated link
3. Optionally shorten it with TinyURL
4. Send it to anyone!

### Auto-Save
Your work is automatically saved to your browser's local storage. Never lose your progress!

---

## Markdown Syntax Guide

### Text Formatting

| Style | Syntax | Result |
|-------|--------|--------|
| Bold | \`**text**\` | **bold text** |
| Italic | \`*text*\` | *italic text* |
| Strikethrough | \`~~text~~\` | ~~strikethrough~~ |
| Code | \`\\\`code\\\`\` | \`inline code\` |

### Headings

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
\`\`\`

### Lists

**Unordered List:**
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

**Ordered List:**
1. First step
2. Second step
3. Third step

**Task List:**
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

### Links and Images

\`\`\`markdown
[Link Text](https://example.com)
![Alt Text](image-url.jpg)
\`\`\`

Example: [Visit GitHub](https://github.com)

### Blockquotes

> "The best way to predict the future is to create it."
>
> — Peter Drucker

### Code Blocks

Inline code: \`const greeting = "Hello World";\`

Code block with syntax highlighting:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

### Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Live Preview | ✅ | Real-time rendering |
| Export PDF | ✅ | High quality output |
| Export DOCX | ✅ | Preserves formatting |
| Share Links | ✅ | URL-encoded content |
| Auto-save | ✅ | Local storage |

### Horizontal Rules

Use three dashes to create a horizontal rule:

---

### Math Equations (Extended)

Some markdown editors support LaTeX:

\`\`\`
E = mc²
∑(i=1 to n) = n(n+1)/2
\`\`\`

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + B\` | Bold |
| \`Ctrl/Cmd + I\` | Italic |
| \`Ctrl/Cmd + K\` | Insert Link |
| \`Tab\` | Insert 4 spaces |

---

## Tips & Tricks

1. **Use the toolbar** — Click formatting buttons to quickly insert markdown syntax
2. **Select text first** — Highlight text before clicking a format button to wrap it
3. **Preview on mobile** — Use the Editor/Preview toggle on smaller screens
4. **Export for sharing** — PDF is best for read-only sharing, DOCX for collaboration

---

## About

**Markdown Editor** is a free, open-source tool built with:
- ⚛️ React
- 🎨 Tailwind CSS
- 📝 Marked.js
- 📄 html2pdf.js
- 📑 docx

---

*Happy writing!* ✨
`;

export const quickStartGuide = `# Quick Start Guide

## Getting Started

1. **Start typing** in the editor panel on the left
2. **See the preview** update in real-time on the right
3. **Use the toolbar** to format your text quickly

## Basic Formatting

**Bold text** — Select text and press \`Ctrl+B\` or click **B**

*Italic text* — Select text and press \`Ctrl+I\` or click *I*

## Create a List

- Item one
- Item two
- Item three

## Add a Link

[Click here](https://example.com) to visit a website.

## Insert Code

\`\`\`javascript
console.log("Hello, Markdown!");
\`\`\`

---

Ready to create something amazing? Clear this and start writing!
`;
