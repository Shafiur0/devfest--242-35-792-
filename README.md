# Tender Document Package Builder

## Contest
AI DevFest 2026 AI Vibe-Coding Contest

## Author
[PARTICIPANT NAME]

## Registration Number
[REGISTRATION NUMBER]

## Live Demo
[DEPLOYED URL]

## Features

### Core Features (All Implemented)
- ✅ **Load requirements.json** — Parse and validate tender requirements with comprehensive error handling
- ✅ **Tender Information Display** — Shows Tender ID, title, procuring entity, bidder, and deadline
- ✅ **Multi-PDF Upload** — Upload up to 30 PDF files (50 MB total) with drag-and-drop support
- ✅ **PDF Page Counting** — Accurate page count using pdfjs-dist
- ✅ **Duplicate Detection** — SHA-256 hash-based duplicate detection using Web Crypto API
- ✅ **Document Matching** — One-to-one matching of PDFs to requirements with dropdown selectors
- ✅ **Duplicate Match Prevention** — Duplicate files cannot be matched to different requirements
- ✅ **Expiry Date Management** — Date input for documents requiring expiry validation
- ✅ **Status Engine** — Deterministic status calculation: OK, Missing, Expiry Date Needed, Expired, Not Provided
- ✅ **Blocking Logic** — Generate button disabled when blocking problems exist
- ✅ **Status Summary** — Visual summary of document statuses with blocking problem count
- ✅ **Package Generation** — Combined PDF with cover page, ordered documents, and page footers
- ✅ **English Cover Page** — Professional cover with tender details and document list
- ✅ **Correct Document Order** — Documents ordered by requirement.order ASC
- ✅ **Page Footer** — "Tender ID | Page X of Y" on every page (two-pass strategy)
- ✅ **Footer Safety** — Content scaled to fit with reserved footer area, no overlap
- ✅ **Mixed Page Size Handling** — Source PDFs scaled to fit A4 while preserving aspect ratio
- ✅ **PDF Download** — Direct browser download as `<tender_id>_Package.pdf`
- ✅ **Bilingual UI** — Full English/Bangla translation with language switch
- ✅ **Error Handling** — Graceful handling of invalid JSON, corrupt PDFs, password-protected files
- ✅ **Step Indicator** — Visual workflow progress indicator
- ✅ **Responsive Design** — Works on desktop and tablet screens

### Bonus Features
- ✅ **Auto-Match** — Suggests file-to-requirement matches based on filename keywords
- ✅ **CSV Export** — Export document status report as CSV
- ✅ **Clear All Matches** — Quick action to reset all matches

## Technology

- **React 19** — UI framework
- **Vite 6** — Build tool and dev server
- **JavaScript (JSX)** — Language (chosen over TypeScript for development speed)
- **Tailwind CSS 4** — Utility-first CSS framework
- **pdf-lib** — PDF creation, page import, and footer generation
- **pdfjs-dist** — PDF parsing and page count
- **lucide-react** — Icon library
- **Web Crypto API** — SHA-256 hashing for duplicate detection

## How It Works

All PDF processing happens entirely in the browser:

1. **Requirements Loading** — User uploads `requirements.json`, which is parsed and validated client-side
2. **PDF Upload** — Files are read into ArrayBuffers using the File API
3. **Duplicate Detection** — SHA-256 hashes computed via `crypto.subtle.digest()` 
4. **Page Counting** — pdfjs-dist reads PDF structure to count pages
5. **Package Generation** — pdf-lib creates a new PDF with cover page, imports document pages, and adds footers
6. **Download** — Generated PDF is served as a Blob URL for direct download

**No data leaves the browser. No backend. No API calls.**

## How to Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in Chrome.

## Build

```bash
npm run build
```

Output goes to `dist/` directory.

## Deployment

Deploy the `dist/` folder to any static hosting service:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

## AI Tools Used

- Google Antigravity (Gemini-based AI coding assistant)

## Most Useful Prompt

> Build a "Tender Document Package Builder" — a frontend-only React application that loads requirements.json, handles multi-PDF upload with duplicate detection, implements one-to-one document matching, calculates document statuses with a deterministic status engine, and generates a combined PDF package with cover page, ordered documents, and page numbering footers. All processing must happen in the browser using pdf-lib and pdfjs-dist.

## Known Problems

No known issues.

## Privacy

**Uploaded documents are processed locally in the browser and are not uploaded to any server or backend.** All PDF processing, hashing, and package generation happens entirely client-side using browser APIs (File API, Web Crypto API, ArrayBuffer).
