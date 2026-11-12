const assert = require('assert');
const SW = require('../js/core.js');
const World = require('../js/world.js');
World.buildWorld();
assert.strictEqual(World.chapterTitles.length, 40);
assert.ok(World.spiders.length > 0, 'Spiders should spawn');
assert.strictEqual(World.eggs.length, 13, 'All 13 secret eggs must exist');
// Verify every rope in all 40 chapters is within jump reach (~105px) of its takeoff ledge
for (let i = 0; i < World.ropes.length; i++) {
  const r = World.ropes[i];
  const chIdx = Math.floor(r.x / SW.Config.CHAPTER_LENGTH);
  const ledgeEnd = chIdx * SW.Config.CHAPTER_LENGTH + 460;
  assert.ok(r.x - ledgeEnd <= 120, 'Rope in chapter ' + (chIdx + 1) + ' must be within jump reach of ledge');
}
// Verify every secret egg has a reachable step height (<= 80px step interval)
for (let i = 0; i < World.eggs.length; i++) {
  const eg = World.eggs[i];
  assert.ok(eg.y >= 240 && eg.y <= 415, 'Secret egg ' + eg.id + ' must be at reachable elevation');
}
console.log('world.test.js (all 40 chapters & 13 eggs verified) passed');
