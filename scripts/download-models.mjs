import { mkdir, writeFile, rename } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../public/models/', import.meta.url));
const base = 'https://raw.githubusercontent.com/ashemag/human-atlas/main/public';
const modelPath = /^\/models\/body-\d+\.bin(?:\.gz)?$/;

async function download(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const atlas = JSON.parse((await download('/models/atlas.json')).toString());
  if (!Array.isArray(atlas.chunks) || !atlas.chunks.length) throw new Error('Invalid anatomy manifest.');
  await mkdir(directory, { recursive: true });
  for (const [index, chunk] of atlas.chunks.entries()) {
    if (!modelPath.test(chunk.url) || (chunk.gzip && !modelPath.test(chunk.gzip))
      || !Number.isSafeInteger(chunk.bytes) || chunk.bytes <= 0) throw new Error('Invalid chunk metadata.');
    const payload = await download(chunk.gzip || chunk.url);
    const compressed = chunk.gzip && payload[0] === 0x1f && payload[1] === 0x8b;
    const buffer = compressed ? gunzipSync(payload) : payload;
    if (buffer.length !== chunk.bytes) throw new Error(`Incomplete chunk: ${chunk.url}`);
    await writeFile(directory + chunk.url.split('/').pop(), buffer);
    if (chunk.gzip) {
      if (compressed) await writeFile(directory + chunk.gzip.split('/').pop(), payload);
      else delete chunk.gzip;
    }
    console.log(`Downloaded ${index + 1}/${atlas.chunks.length}`);
  }
  await writeFile(directory + 'atlas.json.tmp', JSON.stringify(atlas));
  await rename(directory + 'atlas.json.tmp', directory + 'atlas.json');
  console.log(`Ready: ${atlas.parts.length} structures in public/models. Preserve public/ATTRIBUTION.md when deploying.`);
}

main().catch(error => {
  console.error('Model download failed:', error.message);
  process.exitCode = 1;
});
