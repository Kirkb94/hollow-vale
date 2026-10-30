MARSHAL -- Arcane Vanguard modular rig
Built-in imagegen source artwork, unmodified PNG alpha.
Public assets: body.png, equipment.png, manifest.json, vfx.png, vfx.json.
Prompt history: prompts.txt. Actual live kit: kit.json.
Six directions E SE SW W NW NE. Twelve independent runtime body layers per direction plus independent equipment.
Single character.
Explicit sourceRect and renderRect crop duplicated generated tunic hems, sleeves and boots without altering artwork. See shared owned builder ../footmen/build-batch.py.
The generated source has eleven distinct pieces per facing; left/right boots use the same source region as two independently animated layers, right flipped. Targeted generation retry did not repair missing boot so existing source was retained.

Bindings use actual attacks and Lookout flare only; armor-contact, charge-dust and Momentum clips are provided as available art but not hooked to unconfirmed proc events.
Shared runtime handles fog, reduced motion, pause and group rendering. No gameplay stats modified by this pack.
Preview all five: /art/rigs/kingdom/footmen/preview.html. Runtime sampling 1350 combinations (5units*6facings*9states*5timestamps) passed without exceptions. Full assembly screenshot in ../footmen/assembly.png.
