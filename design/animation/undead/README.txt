UNDEAD FACTION — ARCANE VANGUARD CUTOUT PILOT

Scope completed: Necromancer body cutouts in six independent directions, each
with twelve isolated movable pieces; separately attachable skull staff in six
views. Parent agent owns shared game renderer integration. This folder does not
replace the art for the other fourteen Undead roster entries.

Open preview.html in a browser for assembled idle/walk/cast demonstrations.
The Separate pieces slider and Show joints checkbox expose the actual layered
parts. preview.png records a six-view assembly check. All six canvases loaded
without browser errors.

Game-facing manifest: public/art/rigs/undead/necromancer.rig.json
Use exact sourceRect/renderRect values, not equal-grid slicing. Source atlases
are original generated PNGs kept unchanged. build-manifest.py reads their alpha
to identify connected component bounds; it does not edit artwork. Pivots are
normalized coordinates within renderRect. Torso rendering omits the duplicated
lower skirt area, which has a separate pelvis piece.

Directions: e, se, sw, w, nw, ne. Head/clothing rear views are independently
drawn; no mirrored front image is used for backs. Equipment is not baked into
the hands. Minor buckle and bone-decoration differences between independently
generated views remain and may need a later final-art consistency pass.

Effects: death-bolt projectile, necrotic impact, Raise-the-Slain resurrection
rune and casting aura. These are visual assets for the actual Necromancer kit,
not additional mechanics. See the effects manifest for playback metadata.

Roster.json was extracted from the running game's H data and includes fifteen
Undead entries, including skeleton squads, mounted and flying units, elites,
and later additions. Those forms require separate rigs; they are not disguised
as recolored humanoids. Their current game art is retained.

Generation used the built-in image-generation tool. prompts.txt and
effects-prompts.txt record the final prompt set. No paid external tool,
commit, push, or shared game code change was made by this agent.
