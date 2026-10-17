# Female model source assessment

Checked 2026-10-17. The user subsequently accepted partial coverage with a switch-time disclaimer. The HRA assembly was initially included and has since been replaced at the user's explicit request; it has not been independently approved for teaching use.

The existing male atlas contains 2,234 meshes and 3,432 concepts across 15 display systems. A female addition must retain search, selection, system visibility, isolation, separation, views, bookmarks, notes, and quizzes. Sharing those controls does not establish equivalent anatomical coverage.

## Open candidate: Human Reference Atlas

Kristen Browne and Heidi Schlehlein, *3D Reference Organ Set for Female, v1.10* (2026), HuBMAP. DOI: https://doi.org/10.48539/HBM637.DWBM.744.

- Official metadata, including creators, reviewers, Visible Human Dataset provenance and CC BY 4.0 license: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/metadata.json
- Original geometry: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/assets/3d-vh-f-united.glb
- Anatomical naming crosswalk: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/assets/crosswalk.csv
- Library: https://humanatlas.io/3d-reference-library

The official crosswalk has 875 rows (nodes, not a mesh count). It includes female reproductive and mammary structures, organs, and selected musculoskeletal anatomy. It does not provide the full skeleton and musculature of the current male atlas: for example, the crosswalk contains no humerus, rib, or skull entries. This is a legitimate attributable source, but not a full-coverage replacement. The existing public/ATTRIBUTION.md also records partial coverage in the earlier v1.5 assembly.

If selected, preserve source identifiers and citations, explicitly label coverage gaps, and distinguish pregnancy reference structures from the nonpregnant reference. Validate the converted geometry and labels and arrange anatomical review before treating the integrated viewer as a reviewed teaching resource.

## Full-body commercial candidate: SciePro

- Product: https://library.sciepro.com/en/3d-models/complete-female-anatomy-9070311787690
- License: https://www.sciepro.com/library/terms-conditions

The publisher advertises 3,692 separate anatomical structures, major organ systems, and medical-advisory-board review. These are publisher claims; the actual asset has not been obtained, inspected, or checked against the male atlas's coverage. Price was not verified.

Its Realtime license covers interactive applications, including WebGL, subject to payment and its other terms. Sections 1, 3.4, 4, 6.3 and 7 restrict source-file exposure and require protection against extraction. A purchase would not authorize committing the source model to a public repository. Confirm the intended deployment and asset packaging with the vendor before integration; obtain a custom agreement if necessary.

## Rejected shortcut

The third-party Female Atlas repository advertises full coverage but combines HRA organs with male BodyParts3D anatomy modified by custom scaling and shape formulas:

- https://github.com/HiMahendraBeniwal/female-atlas/blob/main/public/ATTRIBUTION.md
- https://github.com/HiMahendraBeniwal/female-atlas/blob/main/scripts/build-perfect-female-atlas.mjs

The inspected script reshapes shoulders, rib cage, waist, pelvis and limbs and alters the male skin surface. No validation of those transformations was established during this review. It is therefore not accepted as a verified female reference for this task.

## Earlier integration constraints

The user initially required both zero asset cost and full anatomical coverage. Commercial acquisition remains outside scope; partial coverage was subsequently accepted with a clear disclaimer. No ready-to-integrate source meeting all requirements has been verified.

## Additional free sources checked

- University of Denver, Visible Human Female: https://digitalcommons.du.edu/visiblehuman/1/. CC BY 4.0; published methods: https://doi.org/10.1038/s41597-022-01905-2. Provides lower-extremity musculoskeletal geometry, including 76 muscle geometries per subject. This could extend HRA coverage, but does not supply the missing whole-body musculature. Combining sources also requires checking alignment, overlap and anatomical relationships; shared specimen provenance alone does not establish registration.
- National Library of Medicine, Visible Human Project: https://www.nlm.nih.gov/research/visible/visible_human.html. Publicly available female imaging provides a potential basis for creating missing structures. It is not a ready-made, individually labeled mesh atlas equivalent to this app. Producing missing meshes requires segmentation, labeling and anatomical validation.

Free source data exists for further development, but this review does not establish a free, complete, validated female asset ready for integration. Source legitimacy, anatomical completeness and validation of the final assembly are separate requirements.

## Implemented choice

Added the pinned HRA v1.10/v1.5 conversion (964 meshes), excluding fitted male bones and donor muscles. Preserved study controls and added a switch-time coverage dialog and persistent reminder. See public/ATTRIBUTION.md and scripts/download-female.mjs for provenance and reproduction.

## Current choice: Female Anatomy Blast composite

The user explicitly requested replacement with https://github.com/ThaddeusMercy/female-anatomy-blast after reviewing its limitations. Revision fe9fa411909502d8c3fee957fc0827c0239184a8 is included: 2,353 meshes / 3,563 concepts, comprising 2,195 adapted male-reference meshes, 76 fitted HRA meshes, and 82 authored schematics. All geometry is distributed under CC BY 4.0. The switch dialog, persistent banner and per-selection provenance explain these distinctions. Upstream attribution and coverage are preserved in public/FEMALE-BLAST-*.md. This changes the accepted illustration, not the outstanding need for anatomical validation.
