const assert = require('assert');
const CU = require('../js/canvas-utils.js');
const dims = CU.resizeCanvas(null);
assert.strictEqual(dims.width, 960);
console.log('canvas-utils.test.js passed');
