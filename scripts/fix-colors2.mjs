import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const fixes = [
  [/rgba\(0, 242, 255,/g, 'rgba(49, 130, 246,'],
  [/rgba\(0,242,255,/g, 'rgba(49,130,246,'],
  [/#00F2FF/g, '#3182F6'],
  [/#00C2CC/g, '#1B64DA'],
  [/background=00F2FF&color=0A0F1D/g, 'background=3182F6&color=FFFFFF'],
  [/background=00C2CC&color=0A0F1D/g, 'background=3182F6&color=FFFFFF'],
  // text-navy-deep on interactive elements should be text-white when on colored bg
  // We'll do a targeted replace: on bg-primary and bg-green-500 buttons
  [/bg-primary text-gray-900/g, 'bg-primary text-white'],
  [/bg-green-500 text-gray-900/g, 'bg-green-500 text-white'],
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
processDir('services');
console.log('Done.');
