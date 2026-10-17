import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { validateAtlas } from '../src/atlas/catalogue.ts';

// Pin the reviewed composite; retain upstream geometry and structure provenance.
const revision = 'fe9fa411909502d8c3fee957fc0827c0239184a8';
const base = `https://raw.githubusercontent.com/ThaddeusMercy/female-anatomy-blast/${revision}/public`;
const directory = new URL('../public/models/', import.meta.url);
async function download(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const original = JSON.parse(await download('/models/atlas.json'));
assert.equal(original.parts.length, 2353);
assert.equal(original.sex, 'female');
// Male and composite FMA identifiers overlap: namespace study IDs, preserve sourceId.
const prefix = 'FAB:';
const parts = original.parts.map(p => ({ ...p, id: prefix + p.id, conceptId: prefix + p.conceptId }));
const concepts = original.concepts.map(c => ({ ...c, id: prefix + c.id, elements: c.elements.map(id => prefix + id) }));
const chunks = original.chunks.map((c, i) => ({ ...c, url: `/models/female-${i}.bin`, gzip: `/models/female-${i}.bin.gz` }));
const atlas = validateAtlas({ ...original, source: 'https://github.com/ThaddeusMercy/female-anatomy-blast',
  conversionRevision: revision, parts, concepts, chunks });
await mkdir(directory, { recursive: true });
for (const [ci, source] of original.chunks.entries()) {
  assert.match(source.gzip, /^\/models\/refined-\d+-[a-f0-9]+\.bin\.gz$/);
  const compressed = await download(source.gzip), buffer = gunzipSync(compressed);
  assert.equal(buffer.length, source.bytes);
  assert.equal(compressed.length, source.gzipBytes);
  for (const p of parts.filter(p => p.chunk === ci)) {
    const positions = new Float32Array(buffer.buffer, buffer.byteOffset + p.positions, p.vertexCount * 3);
    const indices = new Uint32Array(buffer.buffer, buffer.byteOffset + p.indices, p.indexCount);
    assert.ok(positions.every(Number.isFinite));
    assert.ok(indices.every(i => i < p.vertexCount));
  }
  await writeFile(new URL(`female-${ci}.bin`, directory), buffer);
  await writeFile(new URL(`female-${ci}.bin.gz`, directory), compressed);
  chunks[ci].sha256 = createHash('sha256').update(buffer).digest('hex');
  console.log(`Verified chunk ${ci + 1}/${chunks.length}`);
}
for (const name of ['ATTRIBUTION.md', 'MODEL-COVERAGE.md']) {
  await writeFile(new URL(`../FEMALE-BLAST-${name}`, directory), await download('/' + name));
}
await writeFile(new URL('atlas-female.json', directory), JSON.stringify(atlas));
console.log(`Included ${parts.length} composite meshes and ${concepts.length} concepts with upstream provenance.`);
