# Anatomy101

A Next.js anatomy study app for interactive 3D exploration, structure search, and revision.

## Run

Requires Node.js 22.13 or newer and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000.

The app first looks for `public/models/atlas.json`. Without local model files, it loads the anatomy catalogue and geometry online. An internet connection is required for this first model load; there is no placeholder anatomy model.

To install the complete anatomy assets locally:

```sh
npm run models:download
```

The downloader verifies each chunk's decoded byte length and keeps both compressed and uncompressed geometry for browser compatibility. Downloads include approximately 33 MB of compressed geometry. Local files are ignored by Git but are included in a subsequent static build. Downloading requires network access to the anatomy model host.

## Study workflow

- Search named concepts or source identifiers; select individual meshes directly on the model.
- Combine 15 system layers, or use full-body, skeleton, and organ presets.
- Rotate, zoom, choose front/side/back views, and isolate selected anatomy.
- Use **Separate anatomy** to move from assembled anatomy through separated systems to an inventory of every visible mesh.
- Read structure identifiers, system context, included meshes, and authored organ notes with reference links.
- Save bookmarks and personal notes in browser storage. Nothing is sent to a server.
- Switch to **Revise** to identify isolated structures from visible systems. Names and notes stay hidden until an answer is chosen.

Keyboard: `/` focuses search; `Escape` closes the library or source dialog. Focus the canvas and use left/right arrows to orbit and `+`/`-` to zoom. Separation respects reduced-motion preferences.

## Scope

The source represents an adult male reference: 2,234 individual meshes and 3,432 named concepts. It does not represent every anatomical structure or human variation. Colors and system memberships are display conventions, not clinical classifications.

Eight organ guides cover the heart, lungs, kidneys, pancreas, diaphragm, spleen, trachea, and thyroid. Other structures retain their source names and show clearly labeled system context with a reference-search link. The authored summaries need clinician review before use in a formal teaching curriculum. This is an educational app, not a diagnostic or surgical planning tool.

There are no accounts, cloud synchronization, or patient records. Bookmarks and notes belong to the current browser and origin; switching between localhost and a deployed site does not transfer them. Quiz scores last for the current session.

## Checks and build

```sh
npm run check
npm test
npm run build
```

`npm run build` produces a static Next.js export in `out/`. Serve this directory with a static host. `next start` is not used for static exports.

To run browser checks, install the matching Playwright Chromium browser, start the development server on port 3000, then run:

```sh
npx playwright install chromium
npm run test:browser
```

Browser tests use synthetic geometry only inside intercepted test requests. They verify rendering and application behavior without downloading clinical anatomy. Screenshots are saved in `artifacts/`. Unit checks cover manifest validation, gzip decoding, search, visible-system quizzes, tap-versus-drag behavior, and nonoverlapping exploded layouts.

## Attribution

BodyParts3D: © The Database Center for Life Science, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Preserve [public/ATTRIBUTION.md](public/ATTRIBUTION.md) and [LICENSE](LICENSE) when redistributing.

Authored study notes link to NCBI Bookshelf / StatPearls chapters; they are brief original summaries rather than copied articles. Notes are in `src/atlas/study-notes.ts`.
