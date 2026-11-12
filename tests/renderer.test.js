const assert = require('assert');
require('../js/core.js');
const Renderer = require('../js/renderer.js');
Renderer.init();
assert.strictEqual(Renderer.dust.length, 65);
console.log('renderer.test.js passed');
