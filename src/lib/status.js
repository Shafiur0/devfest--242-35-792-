/**
 * Status Engine
 * 
 * Determines the exact status of a required document.
 * Returns one of: 'ok', 'missing', 'expiry_needed', 'expired', 'not_provided'
 */

/**
 * Get the status of a document requirement
 * @param {object} requirement - The requirement object
 * @param {string|null} matchedFileId - The matched file ID, or null
 * @param {string|null} expiryDate - The expiry date string (YYYY-MM-DD), or null/empty
 * @param {string} submissionDeadline - The submission deadline (YYYY-MM-DD)
 * @returns {{ status: string, blocking: boolean }}
 */
export function getDocumentStatus(requirement, matchedFileId, expiryDate, submissionDeadline) {
  const hasFile = !!matchedFileId;
  const isMandatory = requirement.mandatory === true;
  const hasExpiry = requirement.has_expiry === true;

  // MISSING: mandatory + no file
  if (isMandatory && !hasFile) {
    return { status: 'missing', blocking: true };
  }

  // NOT PROVIDED: optional + no file
  if (!isMandatory && !hasFile) {
    return { status: 'not_provided', blocking: false };
  }

  // File is matched from here on

  // EXPIRY DATE NEEDED: has_expiry + file matched + no expiry date
  if (hasExpiry && (!expiryDate || expiryDate.trim() === '')) {
    return { status: 'expiry_needed', blocking: true };
  }

  // EXPIRED: has_expiry + file matched + expiry date < submission_deadline
  if (hasExpiry && expiryDate) {
    // Compare dates as strings (YYYY-MM-DD format allows lexicographic comparison)
    if (expiryDate < submissionDeadline) {
      return { status: 'expired', blocking: true };
    }
  }

  // OK: file matched AND (no expiry needed OR expiry >= deadline)
  return { status: 'ok', blocking: false };
}

/**
 * Check if there are any blocking problems across all requirements
 */
export function hasBlockingProblems(requirements, matches, submissionDeadline) {
  for (const req of requirements) {
    const match = matches.find(m => m.requirementId === req.id);
    const matchedFileId = match ? match.fileId : null;
    const expiryDate = match ? match.expiryDate : null;
    const { blocking } = getDocumentStatus(req, matchedFileId, expiryDate, submissionDeadline);
    if (blocking) return true;
  }
  return false;
}

/**
 * Get a summary of statuses
 */
export function getStatusSummary(requirements, matches, submissionDeadline) {
  let ok = 0;
  let missing = 0;
  let expiryNeeded = 0;
  let expired = 0;
  let notProvided = 0;
  let blocking = 0;

  for (const req of requirements) {
    const match = matches.find(m => m.requirementId === req.id);
    const matchedFileId = match ? match.fileId : null;
    const expiryDate = match ? match.expiryDate : null;
    const result = getDocumentStatus(req, matchedFileId, expiryDate, submissionDeadline);

    switch (result.status) {
      case 'ok': ok++; break;
      case 'missing': missing++; break;
      case 'expiry_needed': expiryNeeded++; break;
      case 'expired': expired++; break;
      case 'not_provided': notProvided++; break;
    }
    if (result.blocking) blocking++;
  }

  return { ok, missing, expiryNeeded, expired, notProvided, blocking };
}
