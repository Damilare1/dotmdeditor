# Markdown Editor

A free, open-source online Markdown editor with live preview, rich text editing, and export capabilities. No sign-up required.

**Website:** [https://dotmdeditor.dev](https://dotmdeditor.dev)

## Features

-   **Live Preview** - See your Markdown rendered in real-time as you type
-   **Dual Editing Modes** - Write in Markdown or edit directly in the rich text preview
-   **Formatting Toolbar** - Quick access to common formatting options (bold, italic, headings, lists, etc.)
-   **Export Options** - Download your document as PDF or Markdown (.md) file
-   **Share via URL** - Generate a shareable link that embeds your document (no server storage)
-   **Auto-save** - Content is automatically saved to local storage
-   **Mobile Responsive** - Works on desktop, tablet, and mobile devices
-   **Keyboard Shortcuts** - Boost productivity with common shortcuts
-   **XSS Protection** - Sanitized HTML output using DOMPurify
-   **PWA Ready** - Install as a Progressive Web App

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + K` | Insert Link |
| `Tab` | Insert 4 spaces |

## Tech Stack

-   **React 19** - UI framework
-   **Vite** - Build tool and dev server
-   **Tailwind CSS 4** - Styling
-   **marked** - Markdown parsing
-   **DOMPurify** - HTML sanitization
-   **Turndown** - HTML to Markdown conversion
-   **LZ-String** - URL compression for sharing
-   **html2pdf.js** - PDF export

## Getting Started

### Prerequisites

-   Node.js 18+
-   npm or yarn

### Installation

1.  Clone the repository:
    
    ```bash
    git clone https://github.com/yourusername/markdown-editor-and-viewer.git
    cd markdown-editor-and-viewer
    ```
    
2.  Install dependencies:
    
    ```bash
    npm install
    ```
    
3.  Create environment file:
    
    ```bash
    cp .env.example .env
    ```
    
4.  (Optional) Add your Google Analytics ID to `.env`:
    
    ```
    VITE_GA_ID=G-XXXXXXXXXX
    ```
    
5.  Start the development server:
    
    ```bash
    npm run dev
    ```
    
6.  Open [http://localhost:5173](http://localhost:5173) in your browser.
    

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready to deploy to any static hosting service.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
├── public/
│   ├── favicon.svg       # App favicon
│   ├── manifest.json     # PWA manifest
│   └── og-image.png      # Social sharing image
├── src/
│   ├── components/
│   │   ├── ConfirmModal.jsx    # Confirmation dialogs
│   │   ├── Editor.jsx          # Markdown editor with toolbar
│   │   ├── EditorToolbar.jsx   # Formatting toolbar
│   │   ├── ExportModal.jsx     # Export options (PDF, MD)
│   │   ├── Header.jsx          # App header with actions
│   │   ├── Icons.jsx           # SVG icon components
│   │   ├── Preview.jsx         # Live preview with rich editing
│   │   ├── ShareModal.jsx      # Share link generator
│   │   └── Toast.jsx           # Toast notifications
│   ├── App.jsx           # Main application component
│   ├── index.css         # Global styles and Tailwind
│   └── main.jsx          # App entry point
├── index.html            # HTML template with SEO meta tags
├── .env.example          # Environment variables template
└── package.json
```

## Environment Variables

| Variable | Description |
| --- | --- |
| `VITE_GA_ID` | Google Analytics 4 Measurement ID |

## Deployment

This is a static site that can be deployed to any hosting platform:

-   **Vercel**: Connect your repo for automatic deployments
-   **Netlify**: Drag and drop the `dist` folder or connect your repo
-   **GitHub Pages**: Use the `gh-pages` branch
-   **Cloudflare Pages**: Connect your repo

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## License

This project is open source and available under the [GNU GENERAL PUBLIC LICENSE](LICENSE).

## Acknowledgments

-   [marked](https://github.com/markedjs/marked) - Markdown parser
-   [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown converter
-   [DOMPurify](https://github.com/cure53/DOMPurify) - XSS sanitizer
-   [Tailwind CSS](https://tailwindcss.com) - CSS framework