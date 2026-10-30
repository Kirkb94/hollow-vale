Arcane Vanguard archer

Built-in image_gen created body, equipment and VFX atlases. See prompts.json.
Six directional sets with 12 independently animated body pieces. Equipment is
separate and follows the hand or back; source PNGs remain unchanged.
All eight checks pass in tools/wilds-scouts.test.cjs; 42 runtime poses were
visually reviewed and no clipping was detected. VFX use measured cell boundaries.
Generated head and torso touched in the source; explicit rectangles separate them at the neck. Southwest head flips to face correctly. Bow/quiver preserve source aspect ratios, including the thin edge view.
