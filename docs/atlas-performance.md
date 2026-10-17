# Atlas interaction and loading

The opening scene shows the skeleton, heart, lungs, digestive and urinary systems. The female composite additionally shows breast and reproductive anatomy. Every other system is available in the library and the full-body preset. Selecting or isolating a search result also loads the chunks it needs.

## Why the original load was slow

The original viewer fetched all chunks with three concurrent requests, even for hidden layers. Chunks mixed systems, so a skeleton view still required much of the complete download. An opaque loading screen stayed up until all geometry was ready. The male model was missing from the local repository and fell back to GitHub.

## Changes

- Bundled both references locally as small chunks containing one system each. Two concurrent requests prioritize selected structures, then smaller chunks, and re-evaluate the queue when layers change.
- Applied lossless meshoptimizer compression plus gzip. No further simplification or quantization. The optimizer asserts byte-for-byte reconstruction; the regression test additionally compares every position, normal, index, structure record and concept with the original bundles.
- Compressed the catalogues and start fetching the viewer module alongside the catalogue after the user opens the atlas.
- Display geometry as each chunk arrives. Later progress appears in a small notice that allows interaction.
- Cache validated geometry in Cache Storage under content-hashed URLs. Storage failure falls back to the network; invalid cached data is discarded. Newly deployed hashes cannot reuse stale geometry. Older browsers without gzip decompression or WebAssembly use the original catalogue/loading format.
- Use a smaller canvas pixel ratio on compact displays. Keep rendering demand-driven and keep expensive model hover checks below 13 per second.

| Geometry transfer | Male | Female composite |
| --- | ---: | ---: |
| Original complete bundle | 32.96 MB | 36.97 MB |
| Optimized complete bundle | 30.65 MB | 32.55 MB |
| New opening view | 7.22 MB | 9.52 MB |

These are compressed geometry bytes, excluding JavaScript, fonts, and catalogues. Initial savings mainly come from fetching fewer systems. Opening all systems still downloads the complete optimized bundle. Cache eviction, a new deployment, or private browsing can require downloading again. Actual times depend on the network and device; this is not a promise of instant loading.

## Rebuild and deploy

The optimized catalogues and `.meshopt.gz` files are included in `public/models` and copied by the static export. Keep them together. When updating source models, run:

```sh
npm run models:download
npm run models:female
npm run models:optimize
npm run test
npm run build
```

The original male download is ignored in Git; fetch it before running the optimizer or full byte-comparison tests in a clean checkout. Without that optional download, regression checks still validate the bundled male geometry, chunk hashes, structure count, bounds and indices. Existing female source bundles remain for attribution and regression checks. This increases repository size, but users only fetch the optimized chunks they request.

For a static server serving `out`, set `TEST_BASE_URL` and run `npm run test:browser`, `npm run test:browser:female`, and `npm run test:browser:streaming`. The streaming check uses real geometry with a simulated 4 Mbps connection and 100 ms latency, checks on-demand requests and cached revisits, and writes local measurements to `artifacts/atlas-loading-metrics.json`.

The atlas uses native CSS transitions, reduced-motion support, throttled geometry hover labels, and eased Three.js camera movement. Mobile selections have a direct link to their details. Focus view hides both sidebars on wide displays; structure selection restores the study panel.

The landing page and atlas are separate routes (`/` and `/atlas/`). Route links disable automatic prefetching to avoid downloading multiple query variants and landing-page resources alongside geometry. The atlas warms its viewer module while fetching the catalogue. URL changes for body, systems, mode and search use the router's native history integration, so these controls survive reload without restarting the model. Skip links move focus and replace their hash through the same history integration, keeping Back and Forward consistent.
