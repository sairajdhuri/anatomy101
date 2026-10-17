# Anatomy data attribution

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.
- License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (updated 2025-02-27)
- Dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- License terms: https://creativecommons.org/licenses/by/4.0/
- Source geometry: `isa_BP3D_4.0_obj_99.zip`, BodyParts3D 4.0.
- English names and relationships: IS-A and PART-OF concept, element, and inclusion tables from the same archive.
- Publication: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. https://doi.org/10.1093/nar/gkn613
Adaptations: axes and units converted from millimeters/Z-up to meters/Y-up; translated to rest at the stage; geometry simplified using meshoptimizer with 0.2% relative error limit per structure; normals quantized to signed 16-bit; packed into binary chunks; curated display system groupings and colors. The source contains 2,234 individual OBJ meshes; all remain represented. The combined hierarchy contains 3,432 named FMA concepts, which may reference multiple meshes.
Original source identity is preserved in the manifest.
Source OBJ comments mention an older CC BY-SA 2.1 Japan license. The official current database license linked above supersedes that legacy text and explicitly permits redistribution and adaptation under CC BY 4.0.

BodyParts3D represents an adult male reference anatomy based on TARO MRI and anatomical illustration refinements. It is not a complete model of every possible human anatomical structure or variation. This interface is educational and is not a clinical tool.
## Included female composite illustration

Mercy Thaddeus, **Female Anatomy Blast 2.2** (2026), CC BY 4.0. Source: https://github.com/ThaddeusMercy/female-anatomy-blast/tree/fe9fa411909502d8c3fee957fc0827c0239184a8.

The composite includes 2,195 adapted BodyParts3D meshes, 76 fitted HRA female-reference meshes, and 82 original schematic pieces. The upstream author reshaped the male reference, fitted female anatomy, and authored approximate teaching geometry. It is not a female scan or a clinically validated atlas.

- BodyParts3D: copyright The Database Center for Life Science; CC BY 4.0, as above.
- HRA female reference: Kristen Browne and Heidi Schlehlein (2023), *3D Reference Organ Set for Female v1.5*, HuBMAP; CC BY 4.0. https://doi.org/10.48539/HBM352.BTSQ.586
- Authored schematic geometry and composite adaptations: Mercy Thaddeus (2026), CC BY 4.0.
- License: https://creativecommons.org/licenses/by/4.0/
- Full upstream construction and attribution notes, preserved verbatim: [FEMALE-BLAST-ATTRIBUTION.md](FEMALE-BLAST-ATTRIBUTION.md).
- Full upstream coverage and limitations: [FEMALE-BLAST-MODEL-COVERAGE.md](FEMALE-BLAST-MODEL-COVERAGE.md).

Our changes: renamed binary assets for the existing loader, retained compressed and decoded copies, and prefixed mesh/concept identifiers with `FAB:` to keep study data separate from the male model. Geometry, normals, upstream source identifiers, provenance labels, and transformation metadata are preserved. The viewer uses its own rendering, colors and study controls. Reproduce the import with `npm run models:female`.

The previous HRA-only female assembly has been replaced at the user's request. Existing saved study data is not deleted or silently reassigned to the new model. Former HRA bookmarks/notes remain in browser storage but are not shown against the composite's different identifiers.

Streaming bundles: both references have additionally been regrouped by anatomical system and losslessly compressed with meshoptimizer and gzip. This packaging preserves every position, normal, triangle index, identifier and provenance record from the imported bundles; it does not add anatomical detail or establish clinical validation. Reproduce with `npm run models:optimize` after downloading both sources.
