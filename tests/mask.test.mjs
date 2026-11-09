import test from 'node:test';
import assert from 'node:assert/strict';
import {contourPath,applyContourMask} from '../src/mask.mjs';
const polygon=[[.2,.15],[.8,.2],[.75,.8],[.2,.75]];
test('curved contour mode is bounded and optional',()=>{
 assert.match(contourPath(polygon,100,100),/ C/);assert.ok(!contourPath(polygon,100,100,0).includes(' C'));
});
test('edge feathering changes alpha only and preserves photograph detail',()=>{
 const raw=Buffer.alloc(100*100*4);for(let i=0;i<raw.length;i+=4){raw[i]=71;raw[i+1]=133;raw[i+2]=211;raw[i+3]=255;}
 const hard=applyContourMask(raw,100,100,{cropPolygon:polygon,maskSmoothing:0,edgeFeather:0});
 const soft=applyContourMask(raw,100,100,{cropPolygon:polygon,maskSmoothing:.65,edgeFeather:.65});
 let changed=0,partial=0;for(let i=0;i<raw.length;i+=4){assert.deepEqual([...soft.subarray(i,i+3)],[71,133,211]);if(soft[i+3]!==hard[i+3])changed++;if(soft[i+3]>0&&soft[i+3]<255)partial++;}
 assert.ok(changed>0);assert.ok(partial>0);assert.equal(soft[(50*100+50)*4+3],255);assert.equal(soft[3],0);
 assert.deepEqual(applyContourMask(raw,100,100,{}),raw);
});
test('holes remain clear after smoothing',()=>{
 const raw=Buffer.alloc(100*100*4,255),out=applyContourMask(raw,100,100,{cropPolygon:[[0,0],[1,0],[1,1],[0,1]],cropHoles:[[[.3,.3],[.7,.3],[.7,.7],[.3,.7]]]});
 assert.equal(out[(50*100+50)*4+3],0);assert.equal(out[(10*100+10)*4+3],255);
});
