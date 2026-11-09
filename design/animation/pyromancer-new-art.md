# Newly illustrated Pyromancer

Created with the built-in image generation tool using `design/art-directions/05-cel.png` as the Arcane Vanguard style/design reference. This is new complete-character artwork, not exported skeletal poses.

Asset: `public/art/frames/mage-original-v2.png`. Transparent 1024 × 1536 PNG, four columns and six rows. Rows: idle, walk, cast, hurt, death, spawn. The runtime aliases physical/ranged attack clips to the cast row for this mage. Idle reuses the four poses in a ping-pong sequence. No bones or separate limb images are used. Cell offsets align the illustrated feet to the ground without deforming the artwork.

Generation prompt: Create a new production sheet of the reference's crimson-hooded Pyromancer, with gold-trimmed robe, dark boots, red cape, bare casting hands and orange flame. Match Arcane Vanguard's clean outlines and two-tone cel shading. Draw 24 complete full-body poses in a four-column, six-row grid. Maintain one three-quarter front facing toward screen right, matching character scale, consistent outfit and face, full padding, no labels or ground shadows, and actual transparency. Rows show four sequential poses for idle breathing, walking, gathering/raising/releasing/recovering fire cast, hit recoil/recovery, staggering/kneeling/collapsing/lying death, and kneeling/rising/flaring/ready spawn. Redraw complete characters rather than detachable parts.

Final cleanup prompt: Background removal only. Preserve every character, pose, grid position, dimension and fire effect exactly; replace the brown/orange backdrop with actual transparent alpha, including gaps between body and arms. No painted checkerboard, no recoloring, no rearrangement.

The returned PNG's RGB channels contain backdrop colors in fully transparent pixels; alpha inspection and browser rendering confirm those pixels are invisible. Do not flatten this PNG onto an opaque background.

Test with `node tools/pyromancer-frames.test.cjs`. Preview `/animation-preview.html?unit=mage`, play `/?arttest=pyromancer`. Other characters retain the earlier converted artwork. The batch conversion script preserves this new mage entry.
