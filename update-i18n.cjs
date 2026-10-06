const fs = require('fs');
let code = fs.readFileSync('src/i18n/translations.js', 'utf8');

const newEn = `
  workspace: 'Tender Package Workspace',
  featValidate: 'Validate requirements',
  featDuplicates: 'Detect duplicates',
  featExpiry: 'Check expiry dates',
  featPackage: 'Generate final package',
  orBrowse: 'or browse from your computer',
  privacyNotice: 'Your documents are processed locally in your browser.',
  devfest: 'AI DevFest 2026',
  workspaceActive: 'Workspace Active',
  docReadiness: 'Document Readiness',
  issuesRequireAttention: 'issues require attention',
  allReady: 'All mandatory documents are ready for packaging.',
  reqsReady: 'requirements ready',
  toAddMore: 'to add more',
  duplicateWarningTitle: 'Duplicate documents detected',
  duplicateWarningDesc: 'Files with identical content have been detected. The system will prevent matching the same duplicate content to multiple requirements.',
  packageReadiness: 'Package Readiness',
`;

const newBn = `
  workspace: 'দরপত্র প্যাকেজ ওয়ার্কস্পেস',
  featValidate: 'প্রয়োজনীয়তা যাচাই করুন',
  featDuplicates: 'প্রতিলিপি শনাক্ত করুন',
  featExpiry: 'মেয়াদের তারিখ চেক করুন',
  featPackage: 'চূড়ান্ত প্যাকেজ তৈরি করুন',
  orBrowse: 'বা আপনার কম্পিউটার থেকে ব্রাউজ করুন',
  privacyNotice: 'আপনার নথিগুলি আপনার ব্রাউজারে স্থানীয়ভাবে প্রক্রিয়া করা হয়।',
  devfest: 'এআই ডেভফেস্ট ২০২৬',
  workspaceActive: 'ওয়ার্কস্পেস সক্রিয়',
  docReadiness: 'নথির প্রস্তুতি',
  issuesRequireAttention: 'টি সমস্যা মনোযোগ প্রয়োজন',
  allReady: 'প্যাকেজিংয়ের জন্য সমস্ত বাধ্যতামূলক নথি প্রস্তুত।',
  reqsReady: 'প্রয়োজনীয়তা প্রস্তুত',
  toAddMore: 'আরও যোগ করতে',
  duplicateWarningTitle: 'প্রতিলিপি নথি শনাক্ত করা হয়েছে',
  duplicateWarningDesc: 'একই বিষয়বস্তু সহ ফাইল শনাক্ত করা হয়েছে। সিস্টেম একই প্রতিলিপি বিষয়বস্তুকে একাধিক প্রয়োজনীয়তার সাথে মেলাতে বাধা দেবে।',
  packageReadiness: 'প্যাকেজ প্রস্তুতি',
`;

code = code.replace(/export const en = \\{/, 'export const en = {' + newEn);
code = code.replace(/export const bn = \\{/, 'export const bn = {' + newBn);
fs.writeFileSync('src/i18n/translations.js', code);
console.log('Translations updated.');
