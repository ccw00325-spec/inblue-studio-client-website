import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const pages = readdirSync(root).filter((name) => name.endsWith('.html'));
const read = (name) => readFileSync(path.join(root, name), 'utf8');

function localRefs(html) {
  const refs = new Set();
  for (const match of html.matchAll(/(?:src|href|data-lb)="([^"]+)"/g)) {
    const ref = match[1].split('#')[0].split('?')[0];
    if (!ref || /^(https?:|mailto:|tel:|data:|\/\/)/.test(ref)) continue;
    refs.add(ref);
  }
  return [...refs];
}

test('every local file referenced by a page exists', () => {
  const missing = [];
  for (const page of pages) {
    for (const ref of localRefs(read(page))) {
      if (!existsSync(path.join(root, ref))) missing.push(`${page} -> ${ref}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('before & after photos stay light enough for mobile', () => {
  const dir = path.join(root, 'assets/img/ba');
  const heavy = readdirSync(dir)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .filter((name) => statSync(path.join(dir, name)).size > 400 * 1024);
  assert.deepEqual(heavy, []);
});

test('before & after filter covers every case card', () => {
  const html = read('before-after.html');
  const cards = [...html.matchAll(/<article class="acard" data-cat="([^"]+)"/g)].map((m) => m[1].split(' '));
  const filters = new Set([...html.matchAll(/data-filter="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(cards.length > 0);
  for (const cats of cards) {
    for (const cat of cats) assert.ok(filters.has(cat), `unknown category: ${cat}`);
  }
});

test('instructors are listed at the right branch', () => {
  // 2026-10 기준: 신승현 대표 = 장안점, 임도영 대표 = 성내점
  const expected = { 신승현: '장안점', 임도영: '성내점' };
  const wrong = [];
  for (const page of pages) {
    const html = read(page);
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    for (const m of text.matchAll(/(신승현|임도영)[^가-힣]{0,4}(?:대표)?[^가-힣]{0,6}(장안점|성내점)/g)) {
      if (expected[m[1]] !== m[2]) wrong.push(`${page}: ${m[1]} · ${m[2]}`);
    }
    for (const m of html.matchAll(/(SHIN SEUNG HYUN|LIM DO YOUNG) · (JANGAN|SEONGNAE)/g)) {
      const ok = (m[1] === 'SHIN SEUNG HYUN') === (m[2] === 'JANGAN');
      if (!ok) wrong.push(`${page}: ${m[0]}`);
    }
  }
  assert.deepEqual(wrong, []);
});
