import { SYSTEMS, type Atlas, type Concept, type Part, type SystemId } from './anatomy.ts';

export const REMOTE_ASSETS = 'https://raw.githubusercontent.com/ashemag/human-atlas/main/public';
export const MODEL_PATH = /^\/models\/(?:body|female)-\d+(?:\.bin(?:\.gz)?|-[a-f0-9]{12}\.meshopt\.gz)$/;

export function validateAtlas(value: unknown): Atlas {
  const atlas = value as Atlas;
  if (!atlas || !Array.isArray(atlas.parts) || !atlas.parts.length || !Array.isArray(atlas.concepts)
    || !Array.isArray(atlas.chunks) || !atlas.chunks.length) throw new Error('Invalid anatomy catalogue.');
  const systems = new Set(SYSTEMS.map(system => system.id));
  const ids = new Set<string>();
  const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
  for (const chunk of atlas.chunks) {
    if (!MODEL_PATH.test(chunk.url) || (chunk.gzip && !MODEL_PATH.test(chunk.gzip))
      || !integer(chunk.bytes) || !chunk.bytes) throw new Error('Invalid anatomy chunk.');
    if (chunk.streams) {
      let decoded = 0, encoded = 0;
      if (!Array.isArray(chunk.streams) || !chunk.streams.length || !integer(chunk.packedBytes!) || !chunk.packedBytes
        || !integer(chunk.downloadBytes!) || !chunk.downloadBytes) throw new Error('Invalid compressed anatomy.');
      for (const stream of chunk.streams) {
        if (!integer(stream.offset) || stream.offset !== decoded || !integer(stream.count) || !stream.count
          || !integer(stream.stride) || !integer(stream.size) || !stream.size
          || !['ATTRIBUTES', 'INDICES'].includes(stream.mode)
          || (stream.mode === 'ATTRIBUTES' ? stream.stride < 4 || stream.stride > 256 || stream.stride % 4 : stream.stride !== 4)) throw new Error('Invalid compressed anatomy.');
        decoded += stream.count * stream.stride; encoded += stream.size;
      }
      if (decoded !== chunk.bytes || encoded !== chunk.packedBytes) throw new Error('Invalid compressed anatomy.');
    }
  }
  for (const part of atlas.parts) {
    const chunk = atlas.chunks[part.chunk];
    if (!part.id || typeof part.name !== 'string' || typeof part.conceptId !== 'string' || ids.has(part.id)
      || !systems.has(part.system) || !integer(part.chunk) || !chunk
      || !integer(part.vertexCount) || !integer(part.indexCount) || part.indexCount % 3
      || !integer(part.positions) || part.positions % 4 || part.positions + part.vertexCount * 12 > chunk.bytes
      || !integer(part.normals) || part.normals % 2 || part.normals + part.vertexCount * 6 > chunk.bytes
      || !integer(part.indices) || part.indices % 4 || part.indices + part.indexCount * 4 > chunk.bytes
      || !Array.isArray(part.bounds) || part.bounds.length !== 2
      || !part.bounds.every(bound => Array.isArray(bound) && bound.length === 3 && bound.every(Number.isFinite))
      || part.bounds[0].some((n, axis) => n > part.bounds[1][axis])) throw new Error('Invalid anatomy structure.');
    ids.add(part.id);
  }
  for (const concept of atlas.concepts) {
    if (typeof concept.id !== 'string' || typeof concept.name !== 'string' || !Array.isArray(concept.elements)
      || !concept.elements.every(id => ids.has(id))) throw new Error('Invalid anatomy concept.');
  }
  return atlas;
}

export async function loadAtlas(signal: AbortSignal, sex: 'male' | 'female' = 'male'): Promise<{ atlas: Atlas; remote: boolean }> {
  let response: Response;
  try {
    // Prefer the system-based bundle; original catalogues remain a deployment fallback.
    const compressed = typeof DecompressionStream !== 'undefined';
    if (compressed && typeof WebAssembly !== 'undefined') {
      response = await fetch(`/models/${sex === 'female' ? 'atlas-female' : 'atlas'}-fast.json.gz`, { signal });
      if (response.ok) {
        const payload = await response.arrayBuffer(), signature = new Uint8Array(payload, 0, Math.min(2, payload.byteLength));
        const json = signature[0] === 0x1f && signature[1] === 0x8b
          ? await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
          : JSON.parse(new TextDecoder().decode(payload));
        const atlas = validateAtlas(json);
        if (sex === 'female' && atlas.sex !== 'female') throw new Error('Incorrect female anatomy catalogue.');
        return { atlas, remote: false };
      }
    }
    response = await fetch(sex === 'female' ? '/models/atlas-female.json' : '/models/atlas.json', { signal });
    if (!response.ok) throw new Error('Local anatomy files unavailable.');
    const atlas = validateAtlas(await response.json());
    if (sex === 'female' && atlas.sex !== 'female') throw new Error('Incorrect female anatomy catalogue.');
    return { atlas, remote: false };
  } catch (error) {
    if (signal.aborted) throw error;
    if (sex === 'female') throw new Error('The female reference files could not be loaded. Please retry or contact the site maintainer.');
  }
  response = await fetch(`${REMOTE_ASSETS}/models/atlas.json`, { signal });
  if (!response.ok) throw new Error('The anatomy catalogue could not be downloaded. Check your connection and retry.');
  const atlas = validateAtlas(await response.json());
  return {
    atlas: { ...atlas, chunks: atlas.chunks.map(chunk => ({
      ...chunk, url: REMOTE_ASSETS + chunk.url, gzip: chunk.gzip ? REMOTE_ASSETS + chunk.gzip : undefined,
    })) },
    remote: true,
  };
}

export function searchConcepts(concepts: Concept[], query: string): Concept[] {
  const term = query.trim().toLowerCase();
  return concepts.filter(concept => concept.elements.length > 0 && (concept.name.toLowerCase().includes(term)
    || concept.id.toLowerCase().includes(term)))
    .sort((a, b) => Number(b.name.toLowerCase() === term) - Number(a.name.toLowerCase() === term)
      || Number(b.name.toLowerCase().startsWith(term)) - Number(a.name.toLowerCase().startsWith(term))
      || a.name.length - b.name.length || a.name.localeCompare(b.name));
}

export interface Quiz { answer: Part; choices: string[] }

export function createQuiz(parts: Part[], visible: SystemId[], previous?: string): Quiz | null {
  const unique = [...new Map(parts.filter(part => visible.includes(part.system)).map(part => [part.name, part])).values()];
  if (unique.length < 2) return null;
  const pool = unique.filter(part => part.id !== previous);
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const others = unique.filter(part => part.name !== answer.name);
  const preferred = others.filter(part => part.system === answer.system);
  const distractors = [...preferred, ...others.filter(part => part.system !== answer.system)];
  // Shuffle within the same system first, keeping the options useful for anatomical revision.
  for (let i = preferred.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const choices = [answer.name, ...distractors.slice(0, 3).map(part => part.name)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { answer, choices };
}
