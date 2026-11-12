const assert = require('assert');
require('../js/core.js');
const World = require('../js/world.js');
World.buildWorld();
assert.strictEqual(World.chapterTitles.length, 40);
assert.ok(World.spiders.length > 0, 'Spiders should spawn');
assert.ok(World.eggs.length === 13, 'All 13 secret eggs must exist');
console.log('world.test.js passed');
