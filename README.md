# Tender Document Package Builder

🏆 **39th Position - AI Dev Fest 2026 Vibe Coding Contest (Score: 84.0)**

![AI Dev Fest 2026 Score](screenshots/score.png)

A browser-based application to validate and package compliant tender submissions securely and accurately.

Author: Shafiur Rahman Shafim
Registration Number: [REGISTRATION NUMBER PLACEHOLDER]
Live Demo: [LIVE DEMO URL PLACEHOLDER]
Repository: https://github.com/Shafiur0/devfest--242-35-792-

## 1. OVERVIEW

Tender Document Package Builder is a browser-based tender document validation and packaging application. It allows users to:
- load tender requirements from `requirements.json`
- upload PDF documents
- match documents to requirements
- detect duplicates
- validate expiry dates
- identify blocking issues
- generate an ordered final tender PDF

All document processing happens locally in the browser, ensuring data privacy and quick performance.

## 2. PROBLEM

Tender submission preparation often requires manually checking multiple documents, expiry dates, duplicate files, required documents, document ordering, and final PDF packaging. 

Manual processing can lead to:
- missing mandatory documents
- expired documents
- duplicate submissions
- incorrect document order
- incomplete final packages

## 3. SOLUTION

This application automates the tedious validation checks associated with tender preparation. By parsing a strictly structured `requirements.json` file, the system acts as an interactive checklist. It forces users to align uploaded PDFs with required entries, automatically calculates deadlines, strictly restricts duplicates based on file content, and guarantees the final merged PDF aligns perfectly with the tender's exact requested order. 

## 4. CORE FEATURES

| Feature | Description |
|---|---|
| Requirements Loading | Loads and validates requirements.json |
| PDF Upload | Upload up to 30 PDFs / 50 MB |
| Page Counting | Detects PDF page counts |
| Duplicate Detection | SHA-256 content-based duplicate detection |
| Document Matching | One-to-one requirement/document matching |
| Expiry Validation | Validates expiry against submission deadline |
| Status Engine | OK / Missing / Expiry Date Needed / Expired / Not Provided |
| Blocking Logic | Prevents generation when blocking issues exist |
| PDF Generation | Creates a combined ordered package |
| Cover Page | Generates English tender cover |
| Page Footer | Adds Tender ID and Page X of Y |
| Mixed Page Sizes | Preserves source content while fitting package pages |
| Bilingual UI | English and Bangla |

## 5. BONUS FEATURES

- Auto-Match (predicts matches based on filenames)
- CSV Export of final tender status
- Clear All Matches functionality
- Fully responsive design

## 6. WORKFLOW

**Requirements**
Users begin by uploading a `requirements.json` file that defines the tender's core information, deadline, and a list of required documents.

**Upload Documents**
Users bulk upload the PDF files they intend to submit. The app enforces file-size/count constraints, rejects non-PDFs, and calculates page counts.

**Match & Validate**
Users map the uploaded files to specific requirements. The system automatically enforces expiry date needs and blocks duplicate mappings.

**Resolve Blocking Issues**
A live dashboard provides an instant overview of blocking issues (e.g., missing mandatory files, missing expiry dates, or expired documents). Users resolve these before proceeding.

**Generate Package**
Once 0 blocking issues remain, the application is unlocked to merge all assigned documents in the precise order specified.

**Download Final PDF**
The user downloads a single, monolithic PDF containing a cover page, a table of contents, and all preserved tender documents properly numbered.

## 7. PDF GENERATION

The final PDF package includes an automated English cover page outlining the bidder and procuring entity. The application perfectly arranges the documents according to the required `order` attribute, intentionally omitting optional documents that were not provided. Every source PDF page is preserved—mixed source page-size handling ensures that the original layout remains intact while safely stamping a custom footer containing the Tender ID and "Page X of Y" on every generated page. 

## 8. ARCHITECTURE

```text
requirements.json
        ↓
Requirements Parser
        ↓
PDF Upload & Validation
        ↓
SHA-256 Duplicate Detection
        ↓
Document Matching
        ↓
Status / Expiry Engine
        ↓
Readiness Validator
        ↓
PDF Package Generator
        ↓
Final PDF
```

Processing is executed entirely client-side. See [ARCHITECTURE.md](ARCHITECTURE.md) for deeper implementation details.

## 9. TECHNOLOGY STACK

- **Frontend:** React 19, Tailwind CSS v4, Lucide React (Icons)
- **PDF Processing:** `pdf-lib` (merge & annotate), `pdfjs-dist` (parsing/validation)
- **Security/Browser APIs:** Web Crypto API (`crypto.subtle` for SHA-256 hashing)
- **Build/Deployment:** Vite 6, Vercel ready
- **Testing:** Playwright

## 10. PRIVACY

Tender documents are processed locally in the browser. File contents are processed via in-memory ArrayBuffers to generate hashes and stitch PDFs without transmitting sensitive documents to an external server.

## 11. RUN LOCALLY

Clone the repository and install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Build the application for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 12. DEPLOYMENT

The application is deployed on Vercel as a Vite Single Page Application, leveraging continuous deployment connected directly to the GitHub repository.

## 13. TESTING

The following scenarios have been covered and verified in the Quality Assurance process:
- valid document
- missing mandatory document
- missing expiry date
- expired document
- same-day expiry
- optional document absent
- duplicate PDF
- non-PDF rejection
- final PDF ordering
- footer/page numbering

## 14. CONTEST REQUIREMENT COVERAGE

| Requirement | Implementation |
|---|---|
| requirements.json | Implemented via `validation.js` ensuring correct schema |
| PDF-only upload | File extension and MIME type validation in `pdf.js` |
| 30 files / 50 MB | Enforced within dropzone logic |
| duplicate detection | SHA-256 Web Crypto hashing on upload |
| expiry validation | Client-side strict string comparison against deadline |
| blocking generation | Handled via `hasBlockingProblems` boolean state lock |
| ordered PDF | Sorted based on `requirement.order` using `pdf-lib` |
| English cover | Automatically generated via `package.js` `drawText` |
| footer | Embedded via `pdf-lib` on all output pages |
| local processing | ArrayBuffers processed directly in browser memory |

## 15. SCREENSHOTS

1. Landing page: [SCREENSHOT PLACEHOLDER]
2. Tender workspace: [SCREENSHOT PLACEHOLDER]
3. Document matching: [SCREENSHOT PLACEHOLDER]
4. Validation/status dashboard: [SCREENSHOT PLACEHOLDER]
5. Final package generation: [SCREENSHOT PLACEHOLDER]

## 16. LICENSE

MIT License

Copyright (c) 2026 Shafiur Rahman Shafim

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.