/**
 * Calculate SHA-256 hash of an ArrayBuffer using Web Crypto API
 */
export async function calculateFileHash(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Detect duplicates among uploaded files.
 * Returns a Map of hash -> array of file IDs with that hash.
 * Files with the same hash are duplicates.
 */
export function detectDuplicates(files) {
  const hashGroups = new Map();

  for (const file of files) {
    if (!file.hash) continue;
    if (!hashGroups.has(file.hash)) {
      hashGroups.set(file.hash, []);
    }
    hashGroups.get(file.hash).push(file.id);
  }

  // Mark files as duplicate
  const duplicateFileIds = new Set();
  for (const [, ids] of hashGroups) {
    if (ids.length > 1) {
      ids.forEach(id => duplicateFileIds.add(id));
    }
  }

  return duplicateFileIds;
}

/**
 * Check if a file can be matched given duplicate restrictions.
 * If a file is a duplicate, only one file from the duplicate group
 * can be matched at a time.
 */
export function canMatchFile(fileId, files, matches) {
  const file = files.find(f => f.id === fileId);
  if (!file || !file.hash) return true;

  // Find all files with the same hash (duplicates)
  const duplicateFiles = files.filter(f => f.hash === file.hash && f.id !== fileId);

  // If any duplicate is already matched to a different requirement, block
  for (const dup of duplicateFiles) {
    const existingMatch = matches.find(m => m.fileId === dup.id);
    if (existingMatch) {
      return false; // A duplicate is already matched
    }
  }

  return true;
}
