# Pocket Chibi whole-character animation

The current art direction is style 07, Pocket Chibi, using the approved short, anchored Pyromancer as the reference. The active player is `public/frame-animation.js`; `public/art/frames/catalog.json` determines which sheet each unit uses. Original artwork is retained for history.

New sheets contain complete characters in one facing, not separated limbs or exports from skeletal rigs. `tools/register-pocket-chibi.py` registers newly generated sheets and validates transparency and nonempty cells. Six source rows supply idle, walk, action, hurt, death and spawn. Playback uses 2/4/6/3/4/4 poses respectively. Attack, shoot and thrust alias the action row. Durations are 1000/600/800/450/1100/600 ms. The approved Pyromancer source layout is preserved.

Whole-pose alpha masks exclude neighboring sprites without articulating individual pieces. Each pose uses a lower-torso anchor at x=160 and a feet baseline at y=198 in a 320x240 reference canvas. A common scale preserves proportions across poses. Anchors stay within 8% of cell width of the idle-body position so attached spell effects cannot drag the body anchor sideways. Nearest-neighbor rendering and direct frame changes preserve crisp pixels; there is no crossfade. Reduced motion holds the first pose. The battlefield draws one figure; squad selections show three copies.

Terrain uses `terrain-pocket-chibi.png`, an opaque, full-bleed 4x3 atlas. Hex clipping and a 1.015 tile scale cover shared edges. Forests remain upright. `objects-pocket-chibi.png` supplies 16 buildings and props. Two icon atlases supply 72 normalized icons through `pocket-icon-regions.json`, preserving complete silhouettes and accessible text. UI panels and controls share slate backgrounds, gold accents, hard borders and pixel art. Ground fire uses a four-frame pixel loop. Portraits, reserves and popups reuse current character sheets.

Registration status is recorded in `design/art-directions/pocket-chibi/validation.json`; animation coverage is in `animation-validation.json`. Run registration after adding or correcting sheets, then `node tools/pocket-roster.test.cjs --complete` to require all 112 entries (111 roster units and the Warlock bat form).

Validation commands, with the local server on port 4323:

- `node tools/pocket-roster.test.cjs --complete`
- `node tools/pocket-playback.test.cjs`
- `node tools/pocket-terrain.test.cjs`
- `node tools/pocket-menu.test.cjs`
- `node tools/current-art.test.cjs`
- `node tools/rig-pause.test.cjs`
- `node tools/illustrated-roster.test.cjs`

The former `frame-smoothing.test.cjs` tests legacy crossfaded art and is superseded by the direct-frame playback test for Pocket Chibi.

Preview: `/animation-preview.html`. Playable faction tests: `/?arttest=factions&faction=kingdom` (also iron, wilds, infernal, vamp, undead, arcane, raidboss).

Completed Pocket Chibi coverage: all 111 roster entries plus the Warlock bat alternate form, 112 sheets total. Built-in generation prompts and original output paths are recorded in `../art-directions/pocket-chibi/generation-record.json`; targeted corrections are listed in `production-notes.json`.

## Previous illustrated rollout (historical)

# Illustrated whole-character animation

The live game uses `public/frame-animation.js` and `public/art/frames/catalog.json`. The approved new Pyromancer establishes the Arcane Vanguard reference: crisp ink outlines, hard cel shadows, readable silhouettes, and faction colors.

The roster redraw uses newly generated, complete-character PNG sheets, not poses exported from the old skeletons. Each sheet has four columns and six rows: idle, walk, action, hurt, death and spawn. Attack/cast/shoot/thrust select the action row; idle plays a ping-pong loop. Each character keeps one facing. Existing gameplay timing and ability effects remain connected through the compatibility `HVRig` name.

`tools/register-illustrated-sheets.py` validates transparency and nonempty cells, updates clip timing and records validation results. `tools/whole-pose-regions.py` reads alpha islands to identify whole poses extending across nominal cell boundaries. The metadata clips neighbouring poses out and fits all poses using a common scale and ground line. It does not cut apart, rotate or animate limbs. Original PNGs remain unchanged.

The battlefield draws one complete figure; selection squads display three copies. Portraits, reserves and popups reuse the current sheet. The image cache retains visible units and evicts offscreen artwork.

Terrain uses `terrain-illustrated.png` (12 tiles; the game's ten terrain types are mapped), buildings use `objects-illustrated.png` (16 objects), and two 6-by-6 icon atlases supply 72 matching illustrations. `illustrated-ui.js` preserves icon text semantics and adds accessible names; `illustrated-ui.css` supplies the shared slate/gold interface palette. Forest art stays upright.

Preview: `/animation-preview.html`. Playable faction tests: `/?arttest=factions&faction=kingdom` (also iron, wilds, infernal, vamp, undead, arcane, raidboss).

Validation: `node tools/frame-animation.test.cjs`, `node tools/current-art.test.cjs`, `node tools/rig-pause.test.cjs`, and `node tools/illustrated-ui-smoke.cjs` with the local server on port 4323. Old rig files and legacy WebP exports remain historical authoring assets, but are not loaded by the game. The legacy exporter skips newly illustrated catalog entries.

Completed coverage: 111 playable roster entries plus the Warlock bat alternate form = 112 newly illustrated sheets, 24 complete poses per sheet (2,688 total). The existing approved Pyromancer is retained. Generation prompts and original output paths are recorded in `redraw/generation-record.json`; later image-generation corrections removed background remnants and changed wolves, bats and imps to single-creature frames.

Playback smoothing: idle cycles now last 1.2 seconds. Eased whole-pose crossfades soften frame boundaries, with shorter blend windows for walking and actions. A 64-pose canvas cache bounds memory; reduced-motion preference disables interpolation. This blends the existing painted frames rather than adding new drawn in-between poses. `node tools/frame-smoothing.test.cjs` verifies boundary continuity and reduced motion.
