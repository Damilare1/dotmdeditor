export const sampleDocumentation = `# Markdown Editor Documentation

Welcome to **Markdown Editor** — a free, powerful, and easy-to-use online markdown editor with live preview, math equations, diagrams, and more.

---

## Features

### Live Preview
See your markdown rendered in real-time as you type. The preview panel updates instantly, showing exactly how your document will look.

### Math Equations
Write beautiful mathematical expressions using LaTeX syntax — inline with \`$...$\` or as centred display blocks with \`$$...$$\`. Powered by **KaTeX**.

### Diagrams
Embed flowcharts, sequence diagrams, Gantt charts, and UML diagrams using **Mermaid** (client-side) or **PlantUML** (via plantuml.com).

### Undo / Redo
Full editor history with keyboard shortcuts and toolbar buttons. Every toolbar action and typing burst is its own undo step.

### Export Options
Export your documents in multiple formats:
- **Markdown (.md)** — Plain text with formatting
- **PDF (.pdf)** — Best for printing and sharing, with fully rendered math and diagrams

### Share Instantly
Share your documents with anyone using a unique URL. No sign-up required!
1. Click the **Share** button
2. Copy the generated link
3. Send it to anyone

### Auto-Save
Your work is automatically saved to your browser's local storage. Never lose your progress!

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + Z\` | Undo |
| \`Ctrl/Cmd + Y\` | Redo |
| \`Ctrl/Cmd + Shift + Z\` | Redo (alternative) |
| \`Ctrl/Cmd + B\` | Bold |
| \`Ctrl/Cmd + I\` | Italic |
| \`Ctrl/Cmd + K\` | Insert Link |
| \`Tab\` | Insert 4 spaces |

---

## Markdown Syntax Guide

### Text Formatting

| Style | Syntax | Result |
|-------|--------|--------|
| Bold | \`**text**\` | **bold text** |
| Italic | \`*text*\` | *italic text* |
| Strikethrough | \`~~text~~\` | ~~strikethrough~~ |
| Code | \`\\\`code\\\`\` | \`inline code\` |

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

### Blockquotes

> "The best way to predict the future is to create it."
>
> — Peter Drucker

### Code Blocks

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

### Tables

| Feature | Status |
|---------|--------|
| Live Preview | ✅ |
| Export PDF | ✅ |
| Share Links | ✅ |
| Auto-save | ✅ |
| Math (LaTeX) | ✅ |
| Mermaid Diagrams | ✅ |
| PlantUML Diagrams | ✅ |
| Undo / Redo | ✅ |

---

## Math Equations

Write LaTeX using \`$...$\` for inline math and \`$$...$$\` for display blocks. Click the **∑** toolbar button to insert an inline template, or **∫** for a display block.

### Inline Math

Wrap an expression in single dollar signs to embed it in a sentence:

\`\`\`
The energy-mass equation $E = mc^2$ is the most famous in physics.
A circle has area $A = \\pi r^2$ and circumference $C = 2\\pi r$.
The quadratic formula gives $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.
\`\`\`

**Rendered:** The energy-mass equation $E = mc^2$ is the most famous in physics. A circle has area $A = \\pi r^2$ and circumference $C = 2\\pi r$.

The quadratic formula gives $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

### Display Math

Wrap an expression in double dollar signs for a centred display equation:

\`\`\`
$$
\\int_0^\\infty e^{-x^2}\\, dx = \\frac{\\sqrt{\\pi}}{2}
$$
\`\`\`

$$
\\int_0^\\infty e^{-x^2}\\, dx = \\frac{\\sqrt{\\pi}}{2}
$$

More examples:

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

$$
\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax+by \\\\ cx+dy \\end{pmatrix}
$$

$$
\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
$$

---

## Diagrams

### Mermaid

Use a \`\`\`mermaid code fence to embed diagrams. Mermaid renders entirely in the browser — no internet required. Click the flowchart toolbar button to insert a template.

**Flowchart:**

\`\`\`mermaid
graph TD
    A[Write Markdown] --> B{Preview OK?}
    B -->|Yes| C[Export / Share]
    B -->|No| D[Edit & Refine]
    D --> B
    C --> E[Done!]
\`\`\`

**Sequence diagram:**

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Editor
    participant Preview
    User->>Editor: Types markdown
    Editor->>Preview: Parses & renders
    Preview-->>User: Shows live result
    User->>Editor: Presses Ctrl+Z
    Editor-->>User: Restores previous state
\`\`\`

**Supported diagram types:** flowchart, sequence, class, state, ER, Gantt, pie, git graph, and more. See the [Mermaid docs](https://mermaid.js.org) for full syntax.

### PlantUML

Use a \`\`\`plantuml code fence to embed UML diagrams. PlantUML diagrams are rendered via **plantuml.com** and require an internet connection. Click the sequence diagram toolbar button to insert a template.

\`\`\`plantuml
@startuml
actor User
participant "Markdown Editor" as Editor
participant "KaTeX" as Math
participant "Mermaid" as Diag

User -> Editor: Writes $$E=mc^2$$
Editor -> Math: Renders equation
Math --> Editor: Returns SVG
User -> Editor: Writes mermaid block
Editor -> Diag: Renders diagram
Diag --> Editor: Returns SVG
Editor --> User: Shows live preview
@enduml
\`\`\`

---

## Tips & Tricks

1. **Use the toolbar** — Buttons for bold, italic, headings, math, diagrams, and more
2. **Select text first** — Highlight text before clicking a format button to wrap it
3. **Undo freely** — Every toolbar action and typing burst is its own undo step
4. **Inline vs display math** — Use \`$...$\` inside sentences, \`$$...$$\` for standalone equations
5. **PDF includes math** — The exporter waits for KaTeX fonts to load before capturing
6. **PlantUML needs internet** — Diagrams are rendered server-side via plantuml.com

---

## About

**Markdown Editor** is a free tool built with:
- ⚛️ React + Vite
- 🎨 Tailwind CSS
- 📝 Marked.js
- 🔢 KaTeX
- 📊 Mermaid
- 🔷 PlantUML
- 📄 html2pdf.js

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

## Undo & Redo

Made a mistake? Press \`Ctrl+Z\` to undo or \`Ctrl+Y\` to redo. The undo/redo buttons are also in the toolbar.

## Math Equations

Inline math with single dollar signs: $a^2 + b^2 = c^2$

Display math with double dollar signs:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Click **∑** in the toolbar to insert an inline math template, or **∫** for a display block.

## Diagrams

\`\`\`mermaid
graph LR
    A[Start here] --> B[Write markdown]
    B --> C[See live preview]
    C --> D[Export or share]
\`\`\`

Click the flowchart toolbar button to insert a Mermaid template.

## Insert Code

\`\`\`javascript
console.log("Hello, Markdown!");
\`\`\`

---

Ready to create something amazing? Clear this and start writing!
`;
