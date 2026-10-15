import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createQuiz, loadAtlas, searchConcepts, validateAtlas } from '../src/atlas/catalogue.ts';
import { createExplosionLayout, stageHeight } from '../src/atlas/explosion-layout.ts';
import { decodeModelResponse } from '../src/atlas/model-download.ts';
import { PointerTap } from '../src/atlas/pointer-tap.ts';
import { getStudyNote } from '../src/atlas/study-notes.ts';
import type { Atlas, Part } from '../src/atlas/anatomy.ts';

// Tiny metadata fixture exercises contracts without presenting test geometry as anatomy.
const part = (id: string, name: string, system: Part['system'] = 'cardiac'): Part => ({
  id, name, conceptId: 'concept-' + id, system, chunk: 0,
  positions: 0, normals: 36, indices: 56, vertexCount: 3, indexCount: 3,
  bounds: [[-.1, .5, -.1], [.1, .8, .1]],
});
const parts = [part('heart', 'heart'), part('valve', 'aortic valve'), part('atrium', 'left atrium'),
  part('ventricle', 'right ventricle'), part('brain', 'brain', 'nervous')];
test('plate stays below separated feet and ignores hidden meshes', () => {
  const foot = { ...part('foot', 'foot', 'skeletal'), bounds: [[0, 0, 0], [.1, .08, .2]] } as Part;
  for (const displacement of [0, -.04, -.12, -.24]) {
    const state = new Float32Array([0, displacement, 0, 1, 0, -10, 0, 0]);
    const height = stageHeight([foot, foot], state);
    assert.ok(height + .001 < displacement, 'plate and rings must clear the foot');
    assert.ok(height > displacement - .01, 'hidden geometry must not lower the plate');
  }
});
const atlas: Atlas = {
  version: 'test', parts, concepts: parts.map(p => ({ id: p.conceptId, name: p.name, elements: [p.id] })),
  chunks: [{ url: '/models/body-0.bin', bytes: 68 }], triangles: 5,
};

test('catalogue rejects malformed geometry and broken concept membership', () => {
  assert.equal(validateAtlas(atlas), atlas);
  assert.throws(() => validateAtlas({ ...atlas, parts: [{ ...parts[0], positions: 3 }] }), /Invalid anatomy structure/);
  assert.throws(() => validateAtlas({ ...atlas, parts: [{ ...parts[0], indexCount: 300 }] }), /Invalid anatomy structure/);
  assert.throws(() => validateAtlas({ ...atlas, parts: [parts[0], parts[0]] }), /Invalid anatomy structure/);
  assert.throws(() => validateAtlas({ ...atlas, concepts: [{ id: 'bad', name: 'unknown', elements: ['missing'] }] }), /Invalid anatomy concept/);
  assert.throws(() => validateAtlas({ ...atlas, chunks: [{ url: '/other.bin', bytes: 68 }] }), /Invalid anatomy chunk/);
});

test('search handles source identifiers, case, and exact name priority', () => {
  const concepts = [...atlas.concepts, { id: 'group', name: 'chamber of heart', elements: ['heart'] }];
  assert.equal(searchConcepts(concepts, ' HEART ')[0].name, 'heart');
  assert.equal(searchConcepts(concepts, 'CONCEPT-BRAIN')[0].name, 'brain');
  assert.deepEqual(searchConcepts(concepts, 'no-such-structure'), []);
});

test('quiz respects visible systems and avoids repeats and duplicate options', () => {
  for (let i = 0; i < 50; i++) {
    const quiz = createQuiz([...parts, parts[0]], ['cardiac'], 'heart');
    assert.ok(quiz);
    assert.equal(quiz.answer.system, 'cardiac');
    assert.notEqual(quiz.answer.id, 'heart');
    assert.equal(quiz.choices.length, 4);
    assert.equal(new Set(quiz.choices).size, 4);
    assert.ok(quiz.choices.includes(quiz.answer.name));
  }
  assert.equal(createQuiz(parts, []), null);
  assert.equal(createQuiz(parts, ['nervous']), null);
});

test('exploded pieces have nonoverlapping cells across screen aspect ratios', () => {
  for (const aspect of [.38, .75, 1, 1.7, 2.4]) {
    const layout = createExplosionLayout(parts, aspect);
    const cells = [...layout.cells.values()];
    assert.equal(cells.length, parts.length);
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i], b = cells[j];
      assert.ok(Math.abs(a.x - b.x) >= (a.width + b.width) / 2 - 1e-9
        || Math.abs(a.y - b.y) >= (a.height + b.height) / 2 - 1e-9);
    }
  }
});

test('tap detection rejects drag, multitouch, and canceled gestures', () => {
  const tap = new PointerTap();
  tap.down(1, 10, 10, 5); assert.equal(tap.up(1, 12, 12), true);
  tap.down(1, 10, 10, 5); tap.move(1, 30, 10); assert.equal(tap.up(1, 10, 10), false);
  tap.down(1, 10, 10, 5); tap.down(2, 10, 10, 5);
  assert.equal(tap.up(2, 10, 10), false); assert.equal(tap.up(1, 10, 10), false);
  tap.down(1, 10, 10, 5); tap.cancel(1); assert.equal(tap.up(1, 10, 10), false);
});

test('geometry decoder handles gzip files and already decoded HTTP responses', async () => {
  const bytes = Buffer.from('geometry-buffer');
  assert.deepEqual(Buffer.from(await decodeModelResponse(new Response(bytes), bytes.length, true)), bytes);
  assert.deepEqual(Buffer.from(await decodeModelResponse(new Response(gzipSync(bytes)), bytes.length, true)), bytes);
  await assert.rejects(decodeModelResponse(new Response(bytes), bytes.length + 1, false), /incomplete/);
  await assert.rejects(decodeModelResponse(new Response('', { status: 404 }), 0, false), /could not be loaded/);
});

test('atlas uses local assets first, falls back to remote, and respects cancellation', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async input => { calls.push(String(input)); return new Response(JSON.stringify(atlas)); };
    const local = await loadAtlas(new AbortController().signal);
    assert.equal(local.remote, false); assert.equal(calls.length, 1);
    calls.length = 0;
    globalThis.fetch = async input => {
      calls.push(String(input));
      return calls.length === 1 ? new Response('', { status: 404 }) : new Response(JSON.stringify(atlas));
    };
    const remote = await loadAtlas(new AbortController().signal);
    assert.equal(remote.remote, true);
    assert.match(remote.atlas.chunks[0].url, /^https:\/\/raw.githubusercontent.com/);
    const controller = new AbortController(); controller.abort(); calls.length = 0;
    globalThis.fetch = async input => { calls.push(String(input)); throw new DOMException('Aborted', 'AbortError'); };
    await assert.rejects(loadAtlas(controller.signal), { name: 'AbortError' });
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = original; }
});

test('study note lookup does not label a substructure with a whole-organ note', () => {
  assert.equal(getStudyNote(' HEART ')?.title, 'Heart');
  assert.equal(getStudyNote('right kidney')?.title, 'Kidneys');
  assert.equal(getStudyNote('right coronary artery'), undefined);
});
