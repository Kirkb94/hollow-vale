KINGDOM FACTION — ARCANE VANGUARD 2D CUTOUTS

Coverage: Knight is the first representative, with six authored directional body atlases and separate directional sword/shield equipment. All 17 live Kingdom roster entries are recorded in roster.json. The other 16 units retain their existing art; this package does not claim to replace them.

Assets: public/art/rigs/kingdom/knight/{e,se,sw,w,nw,ne}.png, equipment.png and manifest.json. Each body atlas is RGBA 1086x1448 and contains 12 disconnected pieces. Equipment has 12 props. Original generator outputs are preserved without pixel modifications.

IMPORTANT EXTRACTION: use manifest.views[direction].parts[name].renderRect. Do not blindly slice the nominal 3x4 grid: some source pieces cross nominal row boundaries. The manifest analyzes the largest twelve disconnected alpha components across the whole atlas, orders them by row and column, and records tight source rectangles. Torso renderRect removes the duplicate skirt below the belt. Leg renderRect removes baked boot tips. The original full bounds remain in sourceRect. source alpha threshold64 removes antialiasing noise. The analyze_atlases.py script regenerates metadata, not imagery.

Pivots are normalized relative to each renderRect. They are integration guidance, not a substitute for sizing the rig. Anatomical right hand carries sword; anatomical left carries shield. Screen positions reverse for rear views. Independent rightBoot flipX on SW/W/NW corrects generated toe orientation without swapping equipment or whole-character mirroring. Equipment pivots are at sword grip / shield strap; sword pixels remain separate from hands.

Review: public/art/rigs/kingdom/knight/review.html loads only this package, demonstrates idle, walk, sword attack, hit reaction, death and pause, and does not change live gameplay. Open through the game server /art/rigs/kingdom/knight/review.html. Browser validation found six loaded canvases and no JS errors. Screenshot: rig-review.png.

Art limitations: this is a first rig integration pass. Armor ornamentation varies slightly across generated angles. Profile shields are intentionally broad readable faces, rather than strict edge-on views; the runtime may narrow their width. Some armor pauldrons overlap the torso and require the normal near/far layer ordering. Squad, mount, wing and boss silhouettes still need their own authored cutouts, not scaled copies of this Knight. The final shared runtime integration and game-state triggers are owned by the parent task.

Generation: built-in image-generation tool, with the selected Arcane Vanguard sheet as visual reference. Exact prompts are saved in prompts.txt. No API fallback or paid third-party asset pack used.

KNIGHT VFX: vfx.png + vfx.json contain 32 alpha frames in an 8-column, 4-row atlas. Rows: sword slash (400ms), melee hit spark (320ms), shield/armor impact (450ms), spawn shimmer (700ms). These are separate from the body and equipment. Slash rotates toward the struck hex; impact anchors at the hit; spawn anchors at feet. Shield impact is only cosmetic feedback for actual existing mitigation, not an invented active block skill. All clips are non-looping. VFX prompt is in vfx-prompt.txt. Animation preview: vfx-review.html.
