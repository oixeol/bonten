const fs = require('fs');
const p = 'apps/web/src/app/(app)/servidores/[id]/page.tsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');
console.log('total lines', lines.length);

// Find where the real imports end: first line that is NOT an import/blank/comment.
let firstNonImport = -1;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === '') continue;
  if (l.startsWith('import ')) continue;
  firstNonImport = i;
  break;
}
console.log('first non-import line index', firstNonImport, '=>', JSON.stringify(lines[firstNonImport]));

// Dedupe import lines: keep first occurrence of each unique line, drop the rest.
const seen = new Set();
const kept = [];
let removed = 0;
for (let i = 0; i < firstNonImport; i++) {
  const l = lines[i];
  const t = l.trim();
  if (t.startsWith('import ')) {
    if (seen.has(t)) { removed++; continue; }
    seen.add(t);
  }
  kept.push(l);
}
const out = [...kept, ...lines.slice(firstNonImport)].join('\n');
fs.writeFileSync(p, out);
console.log('removed dup import lines:', removed);

// Report unique imports now present.
const imports = out.split('\n').filter((l) => l.trim().startsWith('import '));
console.log('unique imports:', imports.length);
for (const im of imports) console.log('  ', im.trim());