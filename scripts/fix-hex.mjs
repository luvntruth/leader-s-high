import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const fixes = [
  // Dark gradients → light gradient equivalents
  [/bg-gradient-to-br from-\[#161D2F\] to-\[#0A0F1D\]/g, 'bg-gradient-to-br from-gray-50 to-white'],
  [/bg-gradient-to-br from-\[#161D2F\] to-\[#0D1525\]/g, 'bg-gradient-to-br from-gray-50 to-white'],
  [/bg-gradient-to-br from-accent-neon\/10 to-\[#161D2F\]/g, 'bg-gradient-to-br from-primary/5 to-white'],
  // Dark inline bg
  [/bg-\[#161D2F\]/g, 'bg-gray-100'],
  [/bg-\[#0A0F1D\]/g, 'bg-gray-50'],
  [/bg-\[#0D1525\]/g, 'bg-gray-50'],
  // SVG fill colors
  [/fill="#0A0F1D"/g, 'fill="#FFFFFF"'],
  [/fill="#161D2F"/g, 'fill="#F9FAFB"'],
];

function processDir(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) { processDir(full); continue; }
    if (!e.name.endsWith('.tsx') && !e.name.endsWith('.ts')) continue;
    let text = readFileSync(full, 'utf8');
    const orig = text;
    for (const [pat, rep] of fixes) {
      text = text.replace(pat, rep);
    }
    if (text !== orig) {
      writeFileSync(full, text, 'utf8');
      console.log('  updated:', full);
    }
  }
}

processDir('screens');
processDir('components');
console.log('Done.');
