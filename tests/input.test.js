const assert = require('assert');
const Input = require('../js/input.js');
Input.keys.ArrowRight = true;
Input.syncState();
assert.strictEqual(Input.right, true);
console.log('input.test.js passed');
