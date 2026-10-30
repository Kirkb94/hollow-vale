BOWMEN -- Arcane Vanguard modular rig
Built-in imagegen source artwork, unmodified PNG alpha.
Public assets: body.png, equipment.png, manifest.json, vfx.png, vfx.json.
Prompt history: prompts.txt. Actual live kit: kit.json.
Six directions E SE SW W NW NE. Twelve independent runtime body layers per direction plus independent equipment.
Actual squad count 3 retained; atlas represents one member.
Explicit sourceRect and renderRect crop duplicated generated tunic hems, sleeves and boots without altering artwork. See shared owned builder ../footmen/build-batch.py.
Twelve distinct source pieces per facing.
SW/NE panels were reversed by generator; semantic mapping reverses each3-cellrow. Those skirt slots have a hand fragment, excluded by renderRect. Quiver hand:back is supported by parent renderer.
Bindings use actual attacks and Lookout flare only; armor-contact, charge-dust and Momentum clips are provided as available art but not hooked to unconfirmed proc events.
Shared runtime handles fog, reduced motion, pause and group rendering. No gameplay stats modified by this pack.
Preview all five: /art/rigs/kingdom/footmen/preview.html. Runtime sampling 1350 combinations (5units*6facings*9states*5timestamps) passed without exceptions. Full assembly screenshot in ../footmen/assembly.png.
