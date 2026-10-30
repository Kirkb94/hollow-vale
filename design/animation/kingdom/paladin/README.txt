Paladin Arcane Vanguard cutout pack

Six direction character body: body.png (1254 x 1254 RGBA). Twelve independently movable layers per view. Equipment: equipment.png with explicit directional source rectangles, anatomical hands and grip pivots. Effect sheet: vfx.png (1774 x 887 RGBA), four clips of eight frames. Timing, anchors and actual game event bindings in vfx.json.

Prompts in prompts.json. Existing game kit captured in game-kit.json. Originals preserved in Codex generated_images. No raster pixels were repainted or programmatically substituted. Analyzer only reads alpha to produce metadata.

Body source uses six 3x4 cutout panels in a3x2 arrangement. Use explicit source rectangles, never regular-cell slicing.
All six views are independently drawn; weapons remain in anatomical hands.

Shared review: /art/rigs/kingdom/cleric/batch-review.html. Effect review: this unit folder/vfx-review.html.
Limitations: Directional props retain painted perspective rather than physically exact 3D rotation.

VFX alpha valleys define inter-frame boundaries to prevent neighboring frame slivers. Reviewed all four clips per unit on dark slate backgrounds: no rectangular opaque haze. Shared renderer weapon ordering corrected by parent.
