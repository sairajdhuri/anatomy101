# Anatomy101

A Next.js anatomy study app for interactive 3D exploration, structure search, and revision.

## Run

Requires Node.js 22.13 or newer and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000.

Both references are bundled locally as compressed, system-based geometry. The opening male view downloads about 7.2 MB of geometry; the female composite downloads about 9.5 MB. Hidden systems load on demand, and validated geometry is cached for return visits. The original catalogue and online male reference remain compatibility fallbacks. See [loading and interaction notes](docs/atlas-performance.md) for measurements, reproduction and deployment details.

To install the complete anatomy assets locally:

```sh
npm run models:download
```

The downloader installs the original male source bundle for compatibility and full source-comparison checks. It verifies each chunk's decoded byte length and keeps compressed and uncompressed copies. After updating either source, run `npm run models:optimize` to regenerate the streaming bundles. Original male downloads are ignored by Git; optimized bundles are included.

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

The male source represents an adult male reference: 2,234 individual meshes and 3,432 named concepts. It does not represent every anatomical structure or human variation. Colors and system memberships are display conventions, not clinical classifications.

Eight organ guides cover the heart, lungs, kidneys, pancreas, diaphragm, spleen, trachea, and thyroid. Other structures retain their source names and show clearly labeled system context with a reference-search link. The authored summaries need clinician review before use in a formal teaching curriculum. This is an educational app, not a diagnostic or surgical planning tool.

There are no accounts, cloud synchronization, or patient records. Bookmarks and notes belong to the current browser and origin; switching between localhost and a deployed site does not transfer them. Quiz scores last for the current session.

## Female composite

Use the **Reference body** selector above the viewer to switch to **Female composite**. Every switch opens a disclaimer explaining the model's adaptations, schematic structures and gaps; a persistent banner lets you reopen it. The inspector identifies adapted male-reference geometry, fitted female-reference geometry, and schematic teaching pieces.

The bundled Female Anatomy Blast 2.2 model contains 2,353 meshes and 3,563 concepts: 2,195 reshaped BodyParts3D meshes, 76 fitted HRA female meshes and 82 authored schematics. All geometry is CC BY 4.0. See [attribution](public/ATTRIBUTION.md) and [upstream coverage](public/FEMALE-BLAST-MODEL-COVERAGE.md). It is not a female scan or clinically validated atlas: body shape, muscle attachments and cross-source alignment need specialist review. Fine branches, complete lymphatic drainage, microscopic anatomy and a complete skin envelope are missing.

Search, layers, isolation, separation, bookmarks, notes and quizzes work with either catalogue. Female mode opens with the skeleton, major organs, breast and reproductive anatomy visible; additional layers load when enabled. Female concept/mesh IDs use `FAB:` so notes never overlap with similarly named male structures. Switching clears the active selection and quiz. Notes saved for the former HRA-only female model remain in browser storage, but are not mapped onto different composite structures.

Female assets are included in `public/models/` and in static exports. Re-import the pinned revision with `npm run models:female`. The original male downloader continues to install only male assets. No additional deformation or simplification is applied during the female import.

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
npm run test:browser:female
npm run test:browser:streaming
```

The standard browser suite uses synthetic geometry only inside intercepted test requests. The female browser suite additionally renders the real bundled assets and checks switching, the disclaimer, reproductive search, saved notes and quizzes. They verify rendering and application behavior without downloading clinical anatomy. Screenshots are saved in `artifacts/`. Unit checks cover manifest validation, gzip decoding, search, visible-system quizzes, tap-versus-drag behavior, and nonoverlapping exploded layouts.

## Attribution

BodyParts3D: © The Database Center for Life Science, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Preserve [public/ATTRIBUTION.md](public/ATTRIBUTION.md) and [LICENSE](LICENSE) when redistributing.

Authored study notes link to NCBI Bookshelf / StatPearls chapters; they are brief original summaries rather than copied articles. Notes are in `src/atlas/study-notes.ts`.
