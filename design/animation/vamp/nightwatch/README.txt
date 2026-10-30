nightwatch — Arcane Vanguard Vampire rig

Six facings: E, SE, SW, W, NW, NE. Twelve independently movable body layers per facing plus independent equipment. Source rectangles and pivots in manifest.json are authoritative; atlas grids vary. part.isolate uses the runtime cached alpha-island extractor without modifying original PNGs.

Generated source paths are in provenance.json; exact generation prompts in prompts.txt; live kit evidence in kit.json. VFX metadata supplies 5 clips / 30 alpha frames with actual attack and ability bindings. All visual assets are presentation only.

QA: 42 runtime poses inspected, no sampled clipping or console errors. All body/equipment/effect rectangles are in bounds and contain alpha pixels. VFX composite: ../nightwatch/effects.png. Actual gameplay QA passed using temporary browser registration (catalog unchanged): attacks, native abilities/status hooks, pause/resume, enemy fog exclusion, and board zoom. Evidence: validation.json and tools/vamp-casters.test.cjs.

Known source-layout compromises: Some upper-arm source pieces are shared between independently animated arms. Connected head/torso and cape regions use explicit crops.
