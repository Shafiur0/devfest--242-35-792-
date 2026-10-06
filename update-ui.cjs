const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

app = app.replace(
  /<div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">.*?<\/div>\s*<\/div>/s,
  `{(() => {
                      const readyCount = requirements.length - summary.blocking;
                      const readyPercentage = requirements.length > 0 ? (readyCount / requirements.length * 100) : 0;
                      return (
                        <>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: \`\${readyPercentage}%\` }}></div>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-400 flex justify-between">
                            <span>{readyCount} of {requirements.length} requirements ready</span>
                            <span>{readyPercentage.toFixed(0)}%</span>
                          </div>
                        </>
                      );
                    })()}`
);

app = app.replace(
  /<div className="p-5">\s*<label \s*className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all/s,
  `<div className={uploadedFiles.length > 0 ? "p-3" : "p-5"}>
                    <label 
                      className={\`block w-full border-2 border-dashed rounded-xl text-center cursor-pointer transition-all
                        \${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                        \${uploadedFiles.length > 0 ? 'p-4' : 'p-8'}
                      \`}`
);

app = app.replace(
  /<Upload size=\{24\} className="mx-auto text-slate-400 mb-3" \/>\s*<p className="text-sm font-semibold text-slate-700">Drop PDF files here<\/p>\s*<p className="text-xs text-slate-500 mt-1">or click to browse<\/p>/s,
  `<div className={\`flex items-center justify-center \${uploadedFiles.length > 0 ? 'gap-3 flex-row' : 'flex-col gap-3'}\`}>
                        <Upload size={uploadedFiles.length > 0 ? 20 : 24} className="text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Drop PDF files here {uploadedFiles.length > 0 ? 'to add more' : ''}</p>
                          {uploadedFiles.length === 0 && <p className="text-xs text-slate-500 mt-1">or click to browse</p>}
                        </div>
                      </div>`
);

app = app.replace(/className="p-4 sm:p-5 sm:w-5\/12/g, 'className="p-3 sm:p-4 sm:w-5/12');
app = app.replace(/className="p-4 sm:p-5 sm:w-7\/12/g, 'className="p-3 sm:p-4 sm:w-7/12');
app = app.replace(/<div className="mt-4 ml-8">/g, '<div className="mt-2 ml-8">');

fs.writeFileSync('src/App.jsx', app);
console.log('App.jsx updated');
