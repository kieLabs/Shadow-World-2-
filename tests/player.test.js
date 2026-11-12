const assert = require('assert');
require('../js/core.js');
const Player = require('../js/player.js');
Player.spawn(100, 200);
assert.strictEqual(Player.dead, false);
assert.strictEqual(Player.x, 100);
console.log('player.test.js passed');
