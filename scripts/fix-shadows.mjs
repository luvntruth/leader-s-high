import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Replace shadow-2xl with shadow-card for a cleaner light theme look
// Also fix other light-theme visual issues
const fixes = [
  [/shadow-2xl/g, 'shadow-card'],
  // Fix drop-shadow that uses old amber glow (acceptable - amber is still used)
  // Fix remaining hardcoded dark border/bg patterns that may have slipped through
  [/bg-navy-card\/80/g, 'bg-white/90'],
  [/bg-navy-card\/90/g, 'bg-white/95'],
  [/bg-navy-card\/95/g, 'bg-white'],
  [/bg-navy-deep\/80/g, 'bg-gray-50/80'],
  [/bg-navy-deep\/90/g, 'bg-gray-50/90'],
  // Fix remaining overlay patterns
  [/bg-black\/80/g, 'bg-gray-900/60'],
  [/bg-black\/60/g, 'bg-gray-900/50'],
  [/bg-black\/40/g, 'bg-gray-900/40'],
];

function processDir(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) { processDir(full); continue; }
    if (!e.name.endsWith('.tsx')) continue;
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
