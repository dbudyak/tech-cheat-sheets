// Validates content/*.md used by platform.html: balanced code fences,
// non-empty answers, unique questions, and every registered topic file exists.
// Usage: node scripts/check-content.mjs
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('platform.html', 'utf8');
const topics = [...html.matchAll(/\{ id: '([\w-]+)',.*?sheet: (true|false),\s*cards: (true|false) \}/g)]
  .map(m => ({ id: m[1], sheet: m[2] === 'true', cards: m[3] === 'true' }));

let errors = 0, total = 0;
const fail = (f, msg) => { console.error(`✗ ${f}: ${msg}`); errors++; };

for (const t of topics) {
  for (const kind of ['sheet', 'cards']) {
    if (!t[kind]) continue;
    const f = `content/${t.id}.${kind}.md`;
    if (!existsSync(f)) { fail(f, 'missing'); continue; }
    const text = readFileSync(f, 'utf8');
    const fences = text.split('\n').filter(l => /^(A: )?```/.test(l)).length;
    if (fences % 2) fail(f, `unbalanced code fences (${fences})`);
    if (kind === 'sheet') continue;

    // strip code blocks, then split into cards
    const plain = text.replace(/```[\s\S]*?```/g, '[code]');
    const cards = plain.split(/^Q: /m).slice(1);
    const seen = new Set();
    for (const c of cards) {
      const q = c.split('\n')[0].trim();
      if (seen.has(q)) fail(f, `duplicate question: ${q}`);
      seen.add(q);
      const a = c.split(/^A: ?/m)[1];
      if (!a || !a.replace(/^##.*$/gm, '').trim()) fail(f, `empty answer: ${q}`);
    }
    total += cards.length;
    console.log(`${String(cards.length).padStart(4)}  ${f}`);
  }
}
console.log(`${String(total).padStart(4)}  cards total`);
process.exit(errors ? 1 : 0);
