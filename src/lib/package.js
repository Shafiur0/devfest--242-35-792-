import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Format a date string YYYY-MM-DD to human readable
 */
function formatDate(dateStr) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

/**
 * Generate the tender document package PDF.
 * 
 * Strategy:
 * 1. Create cover page
 * 2. Import all matched document pages in requirement.order ASC
 * 3. Calculate total page count
 * 4. Add footer to every page: "<tender_id> | Page X of Y"
 * 
 * Footer safety: We create each output page at a fixed size (A4),
 * scale the source page to fit within the content area (leaving footer space),
 * and draw the footer in the reserved area.
 */
export async function generatePackage(tender, requirements, matches, files) {
  const pdfDoc = await PDFDocument.create();

  // Standard A4 dimensions in points
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const FOOTER_HEIGHT = 40;
  const FOOTER_MARGIN = 20;
  const CONTENT_AREA_HEIGHT = PAGE_HEIGHT - FOOTER_HEIGHT - FOOTER_MARGIN;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  // Embed standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const footerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Build ordered list of documents to include
  const orderedDocs = [];
  const sortedReqs = [...requirements].sort((a, b) => a.order - b.order);

  for (const req of sortedReqs) {
    const match = matches.find(m => m.requirementId === req.id);
    if (!match) continue; // Skip unmatched (optional or otherwise)

    const file = files.find(f => f.id === match.fileId);
    if (!file || !file.arrayBuffer) continue;

    orderedDocs.push({
      requirement: req,
      file: file,
    });
  }

  // === PASS 1: Create cover page ===
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Draw cover content
  let y = PAGE_HEIGHT - 80;

  // Title
  coverPage.drawText('TENDER DOCUMENT PACKAGE', {
    x: MARGIN,
    y: y,
    size: 22,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  y -= 10;
  // Underline
  coverPage.drawLine({
    start: { x: MARGIN, y: y },
    end: { x: PAGE_WIDTH - MARGIN, y: y },
    thickness: 2,
    color: rgb(0.15, 0.3, 0.55),
  });

  y -= 40;

  // Helper to draw label-value pairs
  const drawField = (label, value) => {
    coverPage.drawText(label + ':', {
      x: MARGIN,
      y: y,
      size: 11,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 18;

    // Handle long values by splitting into lines
    const maxCharsPerLine = 70;
    const lines = [];
    let remaining = value || '';
    while (remaining.length > maxCharsPerLine) {
      lines.push(remaining.substring(0, maxCharsPerLine));
      remaining = remaining.substring(maxCharsPerLine);
    }
    lines.push(remaining);

    for (const line of lines) {
      coverPage.drawText(line, {
        x: MARGIN + 10,
        y: y,
        size: 13,
        font: helvetica,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 20;
    }
    y -= 10;
  };

  drawField('Tender ID', tender.tender_id);
  drawField('Tender Title', tender.title);
  drawField('Procuring Entity', tender.procuring_entity);
  drawField('Bidder', tender.bidder);
  drawField('Submission Deadline', formatDate(tender.submission_deadline));

  // Package prepared date
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  drawField('Package Prepared', formatDate(todayStr));

  // Separator
  y -= 5;
  coverPage.drawLine({
    start: { x: MARGIN, y: y },
    end: { x: PAGE_WIDTH - MARGIN, y: y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 25;

  // Included Documents
  coverPage.drawText('Included Documents:', {
    x: MARGIN,
    y: y,
    size: 13,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  y -= 25;

  orderedDocs.forEach((doc, index) => {
    const text = `${index + 1}. ${doc.requirement.title_en}`;
    coverPage.drawText(text, {
      x: MARGIN + 15,
      y: y,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;

    // Check if we're running out of space
    if (y < FOOTER_HEIGHT + 30) {
      // For very long lists we'd need a second cover page
      // For now, reduce spacing
      y += 3;
    }
  });

  // === PASS 2: Import document pages ===
  for (const doc of orderedDocs) {
    try {
      const sourcePdf = await PDFDocument.load(doc.file.arrayBuffer, {
        ignoreEncryption: true,
      });

      const pageIndices = sourcePdf.getPageIndices();
      const copiedPages = await pdfDoc.copyPages(sourcePdf, pageIndices);

      for (const copiedPage of copiedPages) {
        // Create a new A4 page in the output document
        const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // Get the source page dimensions
        const { width: srcWidth, height: srcHeight } = copiedPage.getSize();

        // Calculate scale to fit in content area while preserving aspect ratio
        const availableWidth = PAGE_WIDTH - 2 * MARGIN;
        const availableHeight = CONTENT_AREA_HEIGHT - MARGIN;

        const scaleX = availableWidth / srcWidth;
        const scaleY = availableHeight / srcHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

        const scaledWidth = srcWidth * scale;
        const scaledHeight = srcHeight * scale;

        // Center horizontally, align to top of content area
        const x = (PAGE_WIDTH - scaledWidth) / 2;
        const yPos = FOOTER_HEIGHT + FOOTER_MARGIN + (availableHeight - scaledHeight);

        // Embed the page as form XObject
        const embeddedPage = await pdfDoc.embedPage(copiedPage);

        newPage.drawPage(embeddedPage, {
          x: x,
          y: yPos,
          width: scaledWidth,
          height: scaledHeight,
        });
      }
    } catch (e) {
      console.error(`Error importing document: ${doc.requirement.title_en}`, e);
      // Add a placeholder error page
      const errorPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      errorPage.drawText(`Error: Could not import "${doc.requirement.title_en}"`, {
        x: MARGIN,
        y: PAGE_HEIGHT / 2,
        size: 14,
        font: helvetica,
        color: rgb(0.8, 0.1, 0.1),
      });
    }
  }

  // === PASS 3: Add footer to every page ===
  const totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNum = i + 1;
    const footerText = `${tender.tender_id} | Page ${pageNum} of ${totalPages}`;

    // Draw separator line above footer
    page.drawLine({
      start: { x: MARGIN, y: FOOTER_HEIGHT + 10 },
      end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_HEIGHT + 10 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });

    // Draw footer text centered
    const textWidth = footerFont.widthOfTextAtSize(footerText, 9);
    page.drawText(footerText, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y: FOOTER_HEIGHT - 5,
      size: 9,
      font: footerFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Save and return
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Trigger download of the generated PDF
 */
export function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
