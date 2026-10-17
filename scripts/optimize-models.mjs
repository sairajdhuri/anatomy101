import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'meshoptimizer/decoder';

// Repackage complete meshes by system; never simplify, quantize, or remove anatomy.
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const root = new URL('../public/models/', import.meta.url);
const reports = [];
for (const sex of ['male', 'female']) {
  const name = sex === 'male' ? 'atlas' : 'atlas-female';
  const source = JSON.parse(await readFile(new URL(`${name}.json`, root), 'utf8'));
  const buffers = await Promise.all(source.chunks.map(c => readFile(new URL(c.url.split('/').pop(), root))));
  const atlas = structuredClone(source);
  atlas.version += '-stream-v1';
  atlas.chunks = [];
  const groups = [];
  for (const system of new Set(source.parts.map(p => p.system))) {
    let group = [], size = 0;
    for (const part of atlas.parts.filter(p => p.system === system)) {
      const bytes = part.vertexCount * 18 + part.indexCount * 4;
      if (group.length && size + bytes > 1_500_000) { groups.push(group); group = []; size = 0; }
      group.push(part); size += bytes;
    }
    if (group.length) groups.push(group);
  }
  for (const group of groups) {
    const positionBytes = group.reduce((sum, p) => sum + p.vertexCount * 12, 0);
    const normalBytes = group.reduce((sum, p) => sum + Math.ceil(p.vertexCount * 6 / 4) * 4, 0);
    const indexBytes = group.reduce((sum, p) => sum + p.indexCount * 4, 0);
    const raw = Buffer.alloc(positionBytes + normalBytes + indexBytes);
    let pos = 0, norm = positionBytes, idx = positionBytes + normalBytes;
    for (const part of group) {
      const input = buffers[part.chunk];
      input.copy(raw, pos, part.positions, part.positions + part.vertexCount * 12);
      input.copy(raw, norm, part.normals, part.normals + part.vertexCount * 6);
      input.copy(raw, idx, part.indices, part.indices + part.indexCount * 4);
      Object.assign(part, { chunk: atlas.chunks.length, positions: pos, normals: norm, indices: idx });
      pos += part.vertexCount * 12; norm += Math.ceil(part.vertexCount * 6 / 4) * 4; idx += part.indexCount * 4;
    }
    const specs = [[0, positionBytes / 12, 12, 'ATTRIBUTES'], [positionBytes, normalBytes / 4, 4, 'ATTRIBUTES'], [positionBytes + normalBytes, indexBytes / 4, 4, 'INDICES']];
    const encoded = [], streams = [];
    const decoded = new Uint8Array(raw.length);
    for (const [offset, count, stride, mode] of specs) {
      const input = raw.subarray(offset, offset + count * stride);
      const bytes = MeshoptEncoder.encodeGltfBuffer(input, count, stride, mode);
      MeshoptDecoder.decodeGltfBuffer(decoded.subarray(offset, offset + input.length), count, stride, bytes, mode);
      encoded.push(bytes); streams.push({ offset, count, stride, mode, size: bytes.length });
    }
    assert.deepEqual(Buffer.from(decoded), raw, 'Compression must preserve every geometry byte');
    const packed = Buffer.concat(encoded), gzip = gzipSync(packed, { level: 9 });
    const hash = createHash('sha256').update(gzip).digest('hex').slice(0, 12);
    const filename = `${sex === 'male' ? 'body' : 'female'}-${atlas.chunks.length}-${hash}.meshopt.gz`;
    await writeFile(new URL(filename, root), gzip);
    atlas.chunks.push({ url: '/models/' + filename, bytes: raw.length, packedBytes: packed.length, downloadBytes: gzip.length, streams });
  }
  const json = JSON.stringify(atlas);
  await writeFile(new URL(`${name}-fast.json`, root), json);
  await writeFile(new URL(`${name}-fast.json.gz`, root), gzipSync(json, { level: 9 }));
  const opening = ['skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary', ...(sex === 'female' ? ['breast', 'reproductive'] : [])];
  const initial = new Set(atlas.parts.filter(p => opening.includes(p.system)).map(p => p.chunk));
  const report = { sex, parts: atlas.parts.length, triangles: atlas.triangles, originalBytes: source.chunks.reduce((n, c) => n + (c.gzipBytes || c.bytes), 0), completeBytes: atlas.chunks.reduce((n, c) => n + c.downloadBytes, 0), openingBytes: atlas.chunks.reduce((n, c, i) => n + (initial.has(i) ? c.downloadBytes : 0), 0), chunks: atlas.chunks.length };
  reports.push(report); console.log(report);
}
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
await writeFile(new URL('../artifacts/model-optimization.json', import.meta.url), JSON.stringify(reports, null, 2));
