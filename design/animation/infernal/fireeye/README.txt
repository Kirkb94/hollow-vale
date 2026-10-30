Eye of Ruin — Arcane Vanguard layered art

Production uses built-in image generation. The source atlas contains six
directional sets of detached casing, eyeball, left wing and right wing.
The original game identity is a burning eye on wings, with a ranged attack
and a one-mana scouting Flare. No humanoid body or equipment is appropriate.

Generation prompt: transparent landscape 1536x1024 atlas, 3x2 panels in order
east, southeast, southwest, west, northwest, northeast. Each panel contains
four detached components in a 2x2 arrangement: fiery armored casing, eyeball,
left wing, right wing. Clean cel-shaded fantasy paint and ink contours.
No assembled creature, ground, labels, particles or background.

Correction prompt: remove all background and haze to actual alpha zero;
preserve the 24 cutouts and positions; correct the west eyeball to look left.

All eight release flags pass in tools/infernal-fireeye.test.cjs. Real attacks,
one-mana Flare, pause, fog and zoom verified; 42 poses visually reviewed.
Original generated atlas retained; correction image was rejected for rearranging
the layout. West eyeball is mirrored to look left, rear eye is layered behind
the opaque casing. VFX frames have measured transparent separators.
