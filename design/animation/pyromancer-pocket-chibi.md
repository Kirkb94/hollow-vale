# Pocket Chibi Pyromancer pilot

Style 07 from the user's concept choice. Only the Pyromancer changes style. Other character entries stay unchanged.

`mage-pocket-chibi-v1.png` contains 72 newly generated whole-character poses: 12 each for idle, walk, cast, hurt, death and spawn. Playback uses those frames directly, with interpolation disabled and nearest-neighbor drawing. Idle runs at 12 fps, walk about 16.7 fps, and cast at 15 fps. Attack/shoot/thrust use the cast animation. `mage-pocket-chibi-fire.png` supplies a matching eight-frame projectile and eight-frame impact.

Pose metadata aligns the feet and crops whole sprites without altering the PNG or manipulating separate limbs. Detached cast effects are assigned to their originating cell. Existing Pyromancer artwork and `pyromancer-before-chibi.json` are retained for comparison or rollback.

Test at `http://localhost:4323/?arttest=pyromancer` or `http://localhost:4323/animation-preview.html?unit=mage`. `node tools/pyromancer-chibi.test.cjs` checks 72 distinct frames, no crossfades, pixel rendering, and a playable cast. Pause/resume and the remaining roster's blending have separate regression checks.

Revision after playtest: playback now selects 2 idle, 4 walk, 6 cast, 3 hurt, 4 death and 4 spawn frames from the original sheet. Whole poses are aligned to their lower-torso center at canvas x=160 instead of the nominal cell center, removing source-sheet horizontal drift. The unused original poses remain available in the PNG.
