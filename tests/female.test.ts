import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { validateAtlas, loadAtlas, createQuiz, searchConcepts } from '../src/atlas/catalogue.ts';
import { DEFAULT_VISIBLE } from '../src/atlas/anatomy.ts';

test('bundled female reference has valid geometry, composite provenance and searchable reproductive anatomy', () => {
  const atlas = validateAtlas(JSON.parse(readFileSync('public/models/atlas-female.json', 'utf8')));
  assert.equal(atlas.sex, 'female');
  assert.equal(atlas.parts.length, 2353);
  assert.equal(new Set(atlas.concepts.map(c => c.id)).size, atlas.concepts.length);
  assert.equal(atlas.parts.filter(p => p.provenance === 'adapted').length, 2195);
  assert.equal(atlas.parts.filter(p => p.provenance === 'female-reference').length, 76);
  assert.equal(atlas.parts.filter(p => p.provenance === 'schematic').length, 82);
  assert.ok(DEFAULT_VISIBLE.includes('breast'));
  assert.ok(atlas.parts.every(p => p.id.startsWith('FAB:') && p.conceptId.startsWith('FAB:') && p.sourceUrl));
  assert.ok(atlas.concepts.every(c => c.id.startsWith('FAB:')));
  for (const term of ['uterus', 'ovary', 'mammary']) assert.ok(searchConcepts(atlas.concepts, term).length, term);
  const buffers = atlas.chunks.map(chunk => {
    const bytes = readFileSync('public' + chunk.url);
    assert.equal(bytes.length, chunk.bytes);
    assert.deepEqual(gunzipSync(readFileSync('public' + chunk.gzip)), bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), (chunk as typeof chunk & {sha256: string}).sha256);
    return bytes;
  });
  for (const p of atlas.parts) {
    const b = buffers[p.chunk];
    const positions = new Float32Array(b.buffer, b.byteOffset + p.positions, p.vertexCount * 3);
    const indices = new Uint32Array(b.buffer, b.byteOffset + p.indices, p.indexCount);
    assert.ok(positions.every((n, i) => Number.isFinite(n) && n >= p.bounds[0][i % 3] - .00001 && n <= p.bounds[1][i % 3] + .00001), p.id);
    assert.ok(indices.every(i => i < p.vertexCount), p.id);
  }
  const quiz = createQuiz(atlas.parts, ['reproductive']);
  assert.equal(quiz?.answer.system, 'reproductive');
});

test('female loading never falls back to the male model', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async input => { calls.push(String(input)); return new Response('', { status: 404 }); };
    await assert.rejects(loadAtlas(new AbortController().signal, 'female'), /female reference/);
    assert.deepEqual(calls, ['/models/atlas-female-fast.json.gz', '/models/atlas-female.json']);
    globalThis.fetch = async () => new Response(readFileSync('public/models/atlas-female.json', 'utf8'));
    const result = await loadAtlas(new AbortController().signal, 'female');
    assert.equal(result.atlas.sex, 'female');
    assert.equal(result.remote, false);
  } finally { globalThis.fetch = original; }
});
