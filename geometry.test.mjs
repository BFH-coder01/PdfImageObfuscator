import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectangle, obfuscate } from './geometry.mjs';
test('reverse drag is clamped and never reveals partially selected pixels', () => {
  assert.deepEqual(rectangle({x:90.8,y:120},{x:-4,y:10.2},100,100),{x:0,y:11,w:90,h:89});
});
test('output starts opaque black and copies only selected regions', () => {
  const calls = [], image = {width:100,height:200};
  const context = {fillRect(...args){calls.push(['fill',this.fillStyle,...args]);},drawImage(...args){calls.push(['copy',...args]);}};
  obfuscate(context,image,[{x:10,y:20,w:30,h:40}]);
  assert.deepEqual(calls,[['fill','#000',0,0,100,200],['copy',image,10,20,30,40,10,20,30,40]]);
});
test('no selections produces only black', () => {
  let copies = 0, fills = 0;
  obfuscate({fillRect(){fills++;},drawImage(){copies++;}},{width:1,height:1},[]);
  assert.equal(fills,1); assert.equal(copies,0);
});
