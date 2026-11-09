import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {root,outputRoot} from '../src/brand.mjs';
import {createSocial,renderSocial,validateSocial,templates} from '../src/social.mjs';
const fixture=path.join(root,'inputs',`scene-test-${process.pid}.png`);fs.mkdirSync(path.dirname(fixture),{recursive:true});
fs.writeFileSync(fixture,new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#a0c9ff"/><path d="M0 440 H200 V340 H450 V500 H800 V1000 H0 Z" fill="#767364"/><circle cx="400" cy="580" r="80" fill="#ac7240"/></svg>').render().asPng());
const base={template:'scene_top_strips',headline:'Real people.\nReal experiences.',imageFile:fixture,imageAlt:'Synthetic geometry for a renderer test, not a production photograph.',imageProvenance:'provided_photo',visualRelevanceConfirmed:true,cropPolygon:[[0,.44],[.25,.44],[.25,.34],[.5625,.34],[.5625,.5],[1,.5],[1,1],[0,1]]};
test.after(()=>fs.rmSync(fixture,{force:true}));
test('two scene templates render geometry, strips and paired verified files',()=>{
 assert.equal(templates.length,7);
 for(const template of ['scene_top_strips','scene_overlay_strips']){
  const r=createSocial({...base,template},`test-${template}-${Date.now()}`);
  try {
   assert.equal(r.artifacts.length,2);const records=r.artifacts.map(a=>JSON.parse(fs.readFileSync(a.contentPath)));
   assert.equal(records[0].image.sha256,records[1].image.sha256);assert.notEqual(records[0].image.renderedSha256,records[1].image.renderedSha256);
   for(const a of r.artifacts){assert.equal(validateSocial(a.filePath).ok,true);const svg=fs.readFileSync(a.filePath,'utf8');assert.match(svg,/id="scene-photo"/);assert.doesNotMatch(svg,/data-strip-background/);assert.doesNotMatch(svg,/linearGradient|radialGradient|portrait-shade|x="50" y="36"|y="1195"/);assert.ok(a.layout.every(b=>b.size>=64));}
  }finally{for(const a of r.artifacts)for(const p of [a.filePath,a.pngPath,a.outlinedPath,a.contentPath])fs.unlinkSync(p);}
 }
});
test('scene controls change placement and preserve color-independent geometry',()=>{
 const a=renderSocial(base),b=renderSocial({...base,scene:{scale:1.2,offsetX:40,offsetY:-60,textY:150,accent:'diagonal'}});
 assert.notEqual(a.svg,b.svg);assert.match(b.svg,/scene-strip-0/);
 const mono=renderSocial(base,'greyscale');assert.deepEqual(a.layout,mono.layout);assert.equal(a.image.scene.width,mono.image.scene.width);
});
test('background replacement rejects unmasked opaque photos while keep works',()=>{
 assert.throws(()=>renderSocial({...base,cropPolygon:undefined}),/Background replacement/);
 assert.doesNotThrow(()=>renderSocial({...base,cropPolygon:undefined,scene:{backgroundMode:'keep'}}));
 const missing=createSocial({...base,imageFile:undefined});assert.equal(missing.status,'needs_real_photo');assert.ok(missing.workflow.some(s=>s.includes('create_photo_scene_post')));
});
test('Swedish strips, overflow and schema restrictions',()=>{
 assert.doesNotThrow(()=>renderSocial({...base,language:'sv',headline:'Människor möts.\nRöster blir hörda.'}));
 assert.throws(()=>renderSocial({...base,headline:'W'.repeat(230)}),/overflow/);
 assert.throws(()=>renderSocial({...base,body:'This must not disappear'}),/headline strips/);
 assert.throws(()=>renderSocial({...base,scene:{scale:99}}));
 assert.throws(()=>renderSocial({template:'social_editorial',headline:'Hello',scene:{scale:1}}),/require a scene/);
});
test('damaged raster with a valid header is rejected before export',()=>{
 const p=path.join(root,'inputs',`bad-jpeg-${process.pid}.jpg`);fs.writeFileSync(p,Buffer.from('ffd8ffc00011080190019003012200021101031101ffd9','hex'));
 try{assert.throws(()=>renderSocial({...base,imageFile:p}),/cannot be decoded/);}finally{fs.unlinkSync(p);}
});
