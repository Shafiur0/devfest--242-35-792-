import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

test('E2E QA Test', async ({ page }) => {
  const packPath = 'D:/problem-pack/sample-pack';
  
  await page.goto('http://localhost:4173');
  
  // Load requirements
  const reqInput = await page.locator('input[type="file"]').first();
  await reqInput.setInputFiles(path.join(packPath, 'requirements.json'));
  
  // Wait for Tender title to appear
  await expect(page.locator('text=Supply of IT Equipment')).toBeVisible();
  
  // Verify order of requirements
  const reqTitles = await page.locator('h4').allTextContents();
  // Ensure the top ones match
  expect(reqTitles.some(t => t.includes('Trade License'))).toBeTruthy();
  
  // Get upload input
  const fileInput = await page.locator('input[type="file"][accept="application/pdf"]');
  
  // Upload files
  const docsPath = path.join(packPath, 'documents');
  const filesToUpload = [
    '01_financial_proposal.pdf',
    '02_technical_proposal.pdf',
    '03_tin_certificate.pdf',
    '04_vat_certificate.pdf',
    'bank_solvency.pdf',
    'company_logo.png', // Should be rejected
    'experience_cert.pdf',
    'experience_cert (1).pdf', // Duplicate
    'scan_0042.pdf',
    'trade_license_2025.pdf',
    'trade_license_2026.pdf'
  ].map(f => path.join(docsPath, f));
  
  page.on('dialog', dialog => dialog.accept()); // Just in case
  
  await fileInput.setInputFiles(filesToUpload);
  await page.waitForTimeout(4000); // Wait for PDF parsing
  
  // Verify error for PNG
  await expect(page.locator('p[title="company_logo.png"]')).toBeHidden();
  await expect(page.locator('text=is not a PDF file')).toBeVisible();
  
  // Duplicate verification
  await expect(page.locator('text=Duplicate documents detected')).toBeVisible();
  
  // Manual Matching via select options
  const matchDocument = async (reqText, filename) => {
    // Find the requirement card
    const card = page.locator('div.bg-white.rounded-xl').filter({ has: page.locator(`h4:has-text("${reqText}")`) }).first();
    const select = card.locator('select');
    
    // We need the value of the option that matches the filename
    const optionValue = await select.locator(`option:has-text("${filename}")`).first().getAttribute('value');
    await select.selectOption(optionValue);
  };
  
  await matchDocument('Trade License', 'trade_license_2025.pdf');
  await matchDocument('TIN Certificate', '03_tin_certificate.pdf');
  await matchDocument('VAT Registration Certificate', '04_vat_certificate.pdf');
  await matchDocument('Bank Solvency Certificate', 'bank_solvency.pdf');
  await matchDocument('Experience Certificate', 'experience_cert.pdf');
  await matchDocument('Technical Proposal', '02_technical_proposal.pdf');
  await matchDocument('Financial Proposal', '01_financial_proposal.pdf');
  await matchDocument('Signed Declaration', 'scan_0042.pdf');
  
  // Expiry dates
  const setExpiry = async (reqText, date) => {
    const card = page.locator('div.bg-white.rounded-xl').filter({ has: page.locator(`h4:has-text("${reqText}")`) }).first();
    await card.locator('input[type="date"]').fill(date);
  };
  
  // Enter 2025 date for trade license
  await setExpiry('Trade License', '2025-06-30');
  
  // Enter future date for bank solvency
  await setExpiry('Bank Solvency Certificate', '2027-12-31');
  
  // Verify Generate is disabled because 2025 is expired
  const generateBtn = page.locator('button', { hasText: 'Generate Package' });
  await expect(generateBtn).toBeDisabled();
  
  // Change Trade License to 2026
  const tlCard = page.locator('div.bg-white.rounded-xl').filter({ has: page.locator(`h4:has-text("Trade License")`) }).first();
  await tlCard.locator('button:has-text("Change")').click();
  await matchDocument('Trade License', 'trade_license_2026.pdf');
  await setExpiry('Trade License', '2027-06-30');
  
  // Verify Generate is now enabled (0 blocking)
  await expect(generateBtn).toBeEnabled();
  
  // Generate and Download
  const downloadPromise = page.waitForEvent('download');
  await generateBtn.click();
  
  // Wait for success screen
  await expect(page.locator('text=Package is ready')).toBeVisible({ timeout: 15000 });
  const downloadBtn = page.locator('button', { hasText: 'Download Package' });
  await downloadBtn.click();
  
  const download = await downloadPromise;
  const downloadPath = await download.path();
  
  console.log('Downloaded to:', downloadPath);
  
  // Inspect PDF
  const pdfBytes = fs.readFileSync(downloadPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  
  console.log('PDF Page Count:', pageCount);
  expect(pageCount).toBe(16);
});
