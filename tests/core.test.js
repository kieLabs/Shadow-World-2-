const assert = require('assert');
const SW = require('../js/core.js');
assert.strictEqual(SW.Config.TOTAL_CHAPTERS, 40, 'Must have 40 chapters');
assert.strictEqual(SW.Config.GAME_TITLE, 'SHADOW WORLD 2', 'Title must be SHADOW WORLD 2');
assert.strictEqual(SW.Math.clamp(50, 0, 40), 40);
console.log('core.test.js passed');
