import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker - use CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Read a PDF file and return its page count.
 * Returns { pages: number } on success or { error: string } on failure.
 */
export async function getPdfPageCount(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer.slice(0), // Use a copy to avoid detached buffer issues
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    const pages = pdf.numPages;
    pdf.destroy();
    return { pages, error: null };
  } catch (e) {
    console.warn('PDF parsing error:', e.message);
    return { pages: 0, error: 'corruptPDF' };
  }
}

/**
 * Validate that a file is a PDF by checking magic bytes
 */
export function isPdfFile(file) {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return false;
  }
  // Also check MIME type if available
  if (file.type && file.type !== 'application/pdf' && file.type !== '') {
    return false;
  }
  return true;
}
