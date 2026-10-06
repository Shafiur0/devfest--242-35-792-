# Architecture of Tender Document Package Builder

This document provides a high-level overview of the application architecture, the technologies used, and the responsibilities of the core modules.

## Overview
The **Tender Document Package Builder** is a client-side web application designed to help users prepare compliant tender submissions. It allows users to upload a `requirements.json` file detailing required documents, upload PDF files, match them to requirements, enforce business rules (such as expiry dates and duplicates), and finally merge them into a single comprehensive PDF package.

The application operates entirely within the user's browser, ensuring sensitive documents do not leave the local environment.

## Technology Stack
- **Framework:** React 19
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4
- **PDF Generation & Manipulation:**
  - `pdf-lib`: For creating cover pages, merging multiple PDF files, and adding metadata.
  - `pdfjs-dist`: For reading PDF files locally to parse page counts and validate file integrity.
- **Testing:** Playwright for E2E user flow tests.
- **Hashing:** Web Crypto API (`crypto.subtle`) for SHA-256 hash generation.

## Application Structure

```text
src/
├── App.jsx                 # Main application component & state management
├── index.css               # Global styling and Tailwind directives
├── main.jsx                # React application entry point
├── i18n/                   
│   └── translations.js     # Multilingual dictionaries (English, Bengali)
└── lib/                    # Core business logic modules
    ├── duplicate.js        # File hashing and duplicate detection
    ├── package.js          # Final PDF merging and cover page generation
    ├── pdf.js              # PDF parsing (page counts and magic bytes)
    ├── status.js           # Status engine for document readiness
    └── validation.js       # JSON schema validation for requirements
```

## Core Modules & Responsibilities

### 1. User Interface (`src/App.jsx`)
Acts as the central orchestrator of the application. It handles:
- **State Management:** Tracks uploaded files, matched documents, tender requirements, and potential errors.
- **User Flow:** Manages the sequential flow (Load Requirements → Upload Documents → Match Documents → Generate Package).
- **Drag & Drop:** File handling interactions.
- **Component rendering:** Displays progress, warning messages, and the summary dashboard.

### 2. Validation Engine (`src/lib/validation.js`)
Validates the structural integrity of the uploaded `requirements.json`. It guarantees that the JSON contains valid `tender` and `requirements` objects and prevents malformed data from breaking the application.

### 3. PDF Parsing (`src/lib/pdf.js`)
To ensure uploaded files are valid and to provide the user with metadata (like page counts), this module leverages the `pdfjs-dist` library via a CDN-hosted web worker. It reads the raw array buffers and checks for parsing errors or password protection.

### 4. Duplicate Detection (`src/lib/duplicate.js`)
Prevents users from uploading or mapping identical content multiple times by calculating a SHA-256 hash using the native browser Web Crypto API. Identical files are grouped, and the system restricts mapping duplicate files to distinct mandatory requirements.

### 5. Status Engine (`src/lib/status.js`)
Computes the exact readiness status of every individual requirement.
- Checks if mandatory fields are met.
- Validates expiry dates against the submission deadline.
- Emits states: `ok`, `missing`, `expiry_needed`, `expired`, and `not_provided`.
- Tracks "blocking" conditions that disable package generation until resolved.

### 6. Package Generator (`src/lib/package.js`)
Once all blocking problems are resolved, this module constructs the final Tender Package using `pdf-lib`.
- Generates an automated cover page containing tender details and a table of contents.
- Appends the matched PDFs sequentially according to the required `order`.
- Triggers a browser-side file download.

## Data Flow
1. **Requirements Loading:** JSON parsed → `validateRequirements()` → State updated.
2. **File Upload:** File read as ArrayBuffer → `isPdfFile()` → `calculateFileHash()` → `getPdfPageCount()` → Added to `uploadedFiles` state.
3. **Matching:** User assigns a file to a requirement → `canMatchFile()` checks duplicates → Updates `matches` state.
4. **Validation:** React re-renders → `getStatusSummary()` and `hasBlockingProblems()` compute readiness based on current matches.
5. **Generation:** User triggers generation → `generatePackage()` constructs PDF → `downloadPdf()` triggers save prompt.
