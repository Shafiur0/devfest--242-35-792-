import { validateRequirements } from './src/lib/validation.js';
import { detectDuplicates, canMatchFile } from './src/lib/duplicate.js';
import { getDocumentStatus, hasBlockingProblems, getStatusSummary } from './src/lib/status.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- TESTING VALIDATION LOGIC ---');
  const validJson = JSON.stringify({
    tender: { tender_id: 'T1', title: 'Test', procuring_entity: 'A', bidder: 'B', submission_deadline: '2026-10-20' },
    requirements: [
      { id: 'R1', order: 1, title_en: 'Doc 1', mandatory: true, has_expiry: true },
      { id: 'R2', order: 2, title_en: 'Doc 2', mandatory: false, has_expiry: false }
    ]
  });
  
  const validationResult = validateRequirements(validJson);
  assert(validationResult.valid === true, 'Valid requirements.json is accepted');
  
  const invalidJson = '{}';
  const invalidResult = validateRequirements(invalidJson);
  assert(invalidResult.valid === false, 'Invalid requirements.json is rejected');

  console.log('\n--- TESTING DUPLICATE LOGIC ---');
  const files = [
    { id: 'F1', hash: 'hash1', name: 'a.pdf' },
    { id: 'F2', hash: 'hash1', name: 'b.pdf' }, // Duplicate of F1
    { id: 'F3', hash: 'hash2', name: 'c.pdf' },
  ];
  
  const duplicates = detectDuplicates(files);
  assert(duplicates.has('F1') && duplicates.has('F2'), 'F1 and F2 are marked as duplicates');
  assert(!duplicates.has('F3'), 'F3 is not a duplicate');

  // Test duplicate matching restrictions
  const matches = [{ requirementId: 'R1', fileId: 'F1' }];
  const canMatchF2 = canMatchFile('F2', files, matches);
  assert(canMatchF2 === false, 'Cannot match F2 because its duplicate F1 is already matched');
  
  const canMatchF3 = canMatchFile('F3', files, matches);
  assert(canMatchF3 === true, 'Can match F3 because it has no matched duplicates');

  console.log('\n--- TESTING STATUS ENGINE LOGIC ---');
  const reqMandatoryExpiry = { id: 'R1', mandatory: true, has_expiry: true };
  const reqOptionalNoExpiry = { id: 'R2', mandatory: false, has_expiry: false };
  const deadline = '2026-10-20';

  // Case 1: Mandatory + no file -> Missing
  let status = getDocumentStatus(reqMandatoryExpiry, null, null, deadline);
  assert(status.status === 'missing' && status.blocking === true, 'Mandatory missing file is blocking');

  // Case 2: Optional + no file -> Not provided
  status = getDocumentStatus(reqOptionalNoExpiry, null, null, deadline);
  assert(status.status === 'not_provided' && status.blocking === false, 'Optional missing file is not provided and non-blocking');

  // Case 3: Expiry required + file + no expiry -> Expiry date needed
  status = getDocumentStatus(reqMandatoryExpiry, 'F1', null, deadline);
  assert(status.status === 'expiry_needed' && status.blocking === true, 'Missing expiry date is blocking');

  // Case 4: Expiry date < deadline -> Expired
  status = getDocumentStatus(reqMandatoryExpiry, 'F1', '2026-10-19', deadline);
  assert(status.status === 'expired' && status.blocking === true, 'Expired document is blocking');

  // Case 5: Expiry date === deadline -> OK
  status = getDocumentStatus(reqMandatoryExpiry, 'F1', '2026-10-20', deadline);
  assert(status.status === 'ok' && status.blocking === false, 'Expiry exactly on deadline is OK');

  // Case 6: Expiry date > deadline -> OK
  status = getDocumentStatus(reqMandatoryExpiry, 'F1', '2026-12-31', deadline);
  assert(status.status === 'ok' && status.blocking === false, 'Expiry after deadline is OK');

  console.log('\n--- SUMMARY ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
