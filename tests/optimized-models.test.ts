import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateAtlas } from '../src/atlas/catalogue.ts';
import { decodePackedResponse } from '../src/atlas/model-download.ts';

for (const name of ['atlas', 'atlas-female']) test(`${name}: streaming bundle preserves all structures and every geometry byte`, async () => {
  const sourcePath = `public/models/${name}.json`;
  const source = existsSync(sourcePath) ? validateAtlas(JSON.parse(readFileSync(sourcePath, 'utf8'))) : null;
  const fast = validateAtlas(JSON.parse(readFileSync(`public/models/${name}-fast.json`, 'utf8')));
  assert.equal(fast.parts.length, name === 'atlas' ? 2234 : 2353);
  if (source) {
    assert.equal(fast.triangles, source.triangles);
    assert.deepEqual(fast.concepts, source.concepts);
    assert.equal(fast.parts.length, source.parts.length);
  }
  const input = source?.chunks.map(c => readFileSync('public' + c.url));
  let completeBytes = 0, openingBytes = 0;
  for (const [ci, chunk] of fast.chunks.entries()) {
    const parts = fast.parts.filter(p => p.chunk === ci);
    assert.equal(new Set(parts.map(p => p.system)).size, 1, 'A hidden system must be independently loadable');
    const payload = readFileSync('public' + chunk.url);
    assert.ok(chunk.url.includes(createHash('sha256').update(payload).digest('hex').slice(0, 12)));
    completeBytes += payload.length;
    if (['skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary'].includes(parts[0].system)) openingBytes += payload.length;
    const raw = Buffer.from(await decodePackedResponse(new Response(payload), chunk));
    for (const part of parts) {
      const positions = new Float32Array(raw.buffer, raw.byteOffset + part.positions, part.vertexCount * 3);
      const indices = new Uint32Array(raw.buffer, raw.byteOffset + part.indices, part.indexCount);
      assert.ok(positions.every((n, axis) => Number.isFinite(n) && n >= part.bounds[0][axis % 3] - .00001 && n <= part.bounds[1][axis % 3] + .00001), part.id);
      assert.ok(indices.every(i => i < part.vertexCount), part.id);
      const original = source?.parts.find(p => p.id === part.id);
      if (!original || !input) continue;
      const sourceBytes = input[original.chunk];
      assert.deepEqual({ ...part, chunk: 0, positions: 0, normals: 0, indices: 0 }, { ...original, chunk: 0, positions: 0, normals: 0, indices: 0 });
      for (const [offset, length] of [['positions', part.vertexCount * 12], ['normals', part.vertexCount * 6], ['indices', part.indexCount * 4]] as const) {
        assert.deepEqual(raw.subarray(part[offset], part[offset] + length), sourceBytes.subarray(original[offset], original[offset] + length), `${part.id}: ${offset}`);
      }
    }
  }
  assert.ok(openingBytes < completeBytes * .3, 'Opening must avoid downloading the complete model');
  assert.throws(() => validateAtlas({ ...fast, chunks: [{ ...fast.chunks[0], packedBytes: 1 }, ...fast.chunks.slice(1)] }), /Invalid compressed anatomy/);
});
