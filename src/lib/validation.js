/**
 * Validate the requirements.json structure
 * Returns { valid: boolean, error: string|null, data: object|null }
 */
export function validateRequirements(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.tender || typeof data.tender !== 'object') {
      return { valid: false, error: 'missingTender', data: null };
    }

    const { tender_id, title, procuring_entity, bidder, submission_deadline } = data.tender;
    if (!tender_id || !title || !procuring_entity || !bidder || !submission_deadline) {
      return { valid: false, error: 'missingTenderFields', data: null };
    }

    if (!Array.isArray(data.requirements) || data.requirements.length === 0) {
      return { valid: false, error: 'missingRequirements', data: null };
    }

    for (const req of data.requirements) {
      if (!req.id || req.order === undefined || !req.title_en) {
        return { valid: false, error: 'invalidRequirement', data: null };
      }
    }

    // Sort requirements by order ASC
    const sortedRequirements = [...data.requirements].sort((a, b) => a.order - b.order);

    return {
      valid: true,
      error: null,
      data: {
        tender: data.tender,
        requirements: sortedRequirements,
      },
    };
  } catch (e) {
    return { valid: false, error: 'invalidJSON', data: null };
  }
}
