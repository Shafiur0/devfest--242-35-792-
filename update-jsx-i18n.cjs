const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

const replacements = [
  ['Tender Package Workspace', '{t.workspace}'],
  ['>Tender Document Package Builder</', '>{t.appName}</'],
  ['Prepare compliant tender submissions faster, with automatic document validation, expiry checks and PDF packaging.', '{t.appTagline}'],
  ['> Validate requirements<', '> {t.featValidate}<'],
  ['> Detect duplicates<', '> {t.featDuplicates}<'],
  ['> Check expiry dates<', '> {t.featExpiry}<'],
  ['> Generate final package<', '> {t.featPackage}<'],
  ['>Drop requirements.json here<', '>{t.dropOrClick}<'],
  ['>or browse from your computer<', '>{t.orBrowse}<'],
  ['Load Tender Requirements', '{t.loadRequirements}'],
  ['Your documents are processed locally in your browser.', '{t.privacyNotice}'],
  ['>Tender Package Builder<', '>{t.appName}<'],
  ['>AI DevFest 2026<', '>{t.devfest}<'],
  ['>Workspace Active<', '>{t.workspaceActive}<'],
  ['>Tender ID<', '>{t.tenderId}<'],
  ['>Submission Deadline<', '>{t.submissionDeadline}<'],
  ['>Procuring Entity<', '>{t.procuringEntity}<'],
  ['>Bidder<', '>{t.bidder}<'],
  ['>\\s*Document Readiness\\s*<', '> {t.docReadiness} <'],
  ['>issues require attention<', '>{t.issuesRequireAttention}<'],
  ['>All mandatory documents are ready for packaging.<', '>{t.allReady}<'],
  ['requirements ready<', '{t.reqsReady}<'],
  ['>OK<', '>{t.statusOk}<'],
  ['>Missing<', '>{t.statusMissing}<'],
  ['>Expiry<', '>{t.statusExpiryNeeded}<'],
  ['>Optional<', '>{t.statusNotProvided}<'],
  ['> Upload Documents\\s*<', '> {t.uploadDocuments}<'],
  ['>Up to 30 files • 50 MB total<', '>{t.uploadDesc}<'],
  ['>Drop PDF files here', '>{t.dropPDFs}'],
  ["'to add more'", "t.toAddMore"],
  ['>or click to browse<', '>{t.orBrowse}<'],
  ['>Uploaded Files \\(', '>{t.uploadedFiles} ('],
  ['>MATCHED<', '>{t.matched}<'],
  ['>UNMATCHED<', '>{t.unmatched}<'],
  ['> DUPLICATE\\s*<', '> {t.duplicate}<'],
  ['>Duplicate documents detected<', '>{t.duplicateWarningTitle}<'],
  ['>\\s*Files with identical content have been detected. The system will prevent matching the same duplicate content to multiple requirements.\\s*<', '>{t.duplicateWarningDesc}<'],
  ['> Match Documents\\s*<', '> {t.matchDocuments}<'],
  ['> Auto-Match\\s*<', '> {t.autoMatch}<'],
  ['>\\s*Expiry Req\\s*<', '>{t.expiryRequired}<'],
  ['>Select document...<', '>{t.selectFile2}<'],
  ['>Change<', '>{t.changeMatch}<'],
  ['>Expiry:<', '>{t.expiryDate}:<'],
  ['>Package Readiness<', '>{t.packageReadiness}<'],
  ['> Resolve all blocking issues before generating.<', '> {t.cannotGenerate}<'],
  ['> All mandatory documents are valid and ready.<', '> {t.allReady}<'],
  ['> Export CSV\\s*<', '> {t.exportCSV}<'],
  ['> Generate Package\\s*<', '> {t.generatePackage}<'],
  ['> Generating...<', '> {t.generating}<'],
  ['>Package Generated!<', '>{t.packageReady}<'],
  ['> Download PDF Package\\s*<', '> {t.downloadPackage}<']
];

for (const [search, replace] of replacements) {
  if (search.startsWith('>\\s*') || search.includes('\\s*')) {
    const regex = new RegExp(search, 'g');
    app = app.replace(regex, replace);
  } else {
    app = app.split(search).join(replace);
  }
}

fs.writeFileSync('src/App.jsx', app);
console.log('App.jsx translations updated');
