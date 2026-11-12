const assert = require('assert');
const SW = require('../js/core.js');
const Input = require('../js/input.js');
const Player = require('../js/player.js');
const World = require('../js/world.js');

World.buildWorld();
Player.spawn(550, 250);
const rope = World.ropes[0];
Player.attachedRope = rope;
Input.jumpJustPressed = true;
Player.update(0.016, World);
assert.strictEqual(Player.attachedRope, null, 'Player MUST release rope on jump');
assert.ok(Player.ropeCooldown > 0, 'Rope cooldown must prevent immediate re-grab');
World.update(0.016, Player);
assert.strictEqual(Player.attachedRope, null, 'World must NOT re-attach rope during cooldown');
console.log('player.test.js (including rope release & cooldown) passed');
