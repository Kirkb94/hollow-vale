Inferno Witch art and actual mechanics validation

Six-view layered body and independent wand; hellfire projectile, burn, casting seal and spawn clips.
The burn effect is dispatched only on actual positive HP loss from the recorded burn source.

Known existing gameplay discrepancy (unchanged in this art task):
The description says Hellfire lasts 3 turns and deals 2 damage per turn.
Core bossHit initially sets those values, but the later generic Infernal burn assignment in core act overwrites them to 2 turns and 1 damage in the isolated test.
Scorched Earth can add a separate point of ground fire damage; the regression test clears that ground fire to distinguish it from the burn status tick.
Changing this balance/ordering behavior requires a separate mechanics decision. The new visuals reflect actual events.
