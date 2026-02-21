import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const replacements = [
  ['bg-[#0A0F1D]/80',  'bg-white/80'],
  ['bg-[#0A0F1D]/90',  'bg-white/90'],
  ['bg-[#0A0F1D]',     'bg-gray-50'],
  ['bg-gray-900',       'bg-white'],
  ['bg-gray-800',       'bg-gray-100'],
  ['bg-slate-900',      'bg-white'],
  ['bg-slate-800',      'bg-gray-100'],
  ['bg-white/5',        'bg-gray-100'],
  ['bg-white/10',       'bg-gray-100'],
  ['bg-white/20',       'bg-gray-200'],
  ['bg-white/30',       'bg-gray-200'],
  ['border-white/5',    'border-gray-200'],
  ['border-white/10',   'border-gray-200'],
  ['border-white/20',   'border-gray-300'],
  ['border-white/30',   'border-gray-300'],
  ['text-white/90',     'text-gray-800'],
  ['text-white/80',     'text-gray-700'],
  ['text-white/60',     'text-gray-500'],
  ['text-white/50',     'text-gray-400'],
  ['text-white/40',     'text-gray-400'],
  ['text-white',        'text-gray-900'],
  ['text-slate-100',    'text-gray-700'],
  ['text-slate-200',    'text-gray-600'],
  ['text-slate-300',    'text-gray-600'],
  ['text-slate-400',    'text-gray-500'],
  ['text-slate-500',    'text-gray-400'],
  ['text-slate-600',    'text-gray-400'],
  ['text-slate-700',    'text-gray-500'],
  ['backdrop-blur-2xl', 'backdrop-blur-sm'],
  ['backdrop-blur-xl',  'backdrop-blur-sm'],
];

const skip = new Set(['components/Navigation.tsx']);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) { processDir(full); continue; }
    if (!e.name.endsWith('.tsx')) continue;
    if (skip.has(full)) continue;
    let text = readFileSync(full, 'utf8');
    const orig = text;
    for (const [from, to] of replacements) {
      text = text.replace(new RegExp(escapeRegex(from), 'g'), to);
    }
    if (text !== orig) {
      writeFileSync(full, text, 'utf8');
      console.log('  updated:', full);
    }
  }
}

processDir('screens');
processDir('components');
console.log('Batch color replacement done.');
