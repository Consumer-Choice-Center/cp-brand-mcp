import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,render,validateSvg,outlineSvg,createOnePager,validateFile,auditAssets} from '../src/brand.mjs';
const example=JSON.parse(fs.readFileSync(path.join(root,'examples/one-pager.json'),'utf8'));
test('CP assets and exact brand fonts are available',()=>assert.equal(auditAssets().ok,true));
test('clean draft is valid, complete and editable',()=>{
 const {svg,content}=render(example);assert.equal(validateSvg(svg,content).ok,true);
 assert.ok(svg.includes('ProximaNova-Regular'));assert.ok(svg.includes('Futura-Medium'));
 assert.ok(!/Montserrat|Anton|Hind|DM Mono|#E95C1F|#22264E/i.test(svg.replace(/data:image\/[^"]+/g,'')));
 const outlined=outlineSvg(svg);assert.ok(!/<text\b/.test(outlined));assert.ok(outlined.includes('<path'));
});
test('validator rejects foreign palette, fonts, scripts, missing logo and geometry edits',()=>{
 const {svg,content}=render(example);
 for(const changed of [svg.replace('#1D6379','#22264E'),svg.replace('Futura-Medium','Arial'),svg.replace('</svg>','<script>alert(1)</script></svg>'),svg.replace('data-cp-logo','data-removed-logo'),svg.replace('width="1186.5"','width="1080"')])assert.equal(validateSvg(changed,content).ok,false);
});
test('long or unbreakable text fails instead of clipping',()=>{
 assert.throws(()=>render({...example,headline:'W'.repeat(100)}),/overflow/);
 assert.throws(()=>render({...example,cards:example.cards.map(c=>({...c,body:'Very long words repeated many times. '.repeat(6)}))}));
});
test('final mode blocks unverified claims, missing imagery and missing sources',()=>{
 assert.throws(()=>render({...example,mode:'final'}),/Final output requires/);
 assert.throws(()=>render({...example,mode:'final',factsVerified:true,sources:[]}),/Final output requires/);
 assert.throws(()=>render({...example,mode:'final',factsVerified:true,heroImage:undefined}),/Final output requires/);
 assert.equal(validateSvg(...(()=>{const r=render({...example,mode:'final',factsVerified:true});return [r.svg,r.content];})()).ok,true);
});
test('HTML in copy is inert escaped text',()=>{
 const r=render({...example,headline:'<script>TEXT</script>'});assert.ok(r.svg.includes('&lt;script&gt;'));assert.equal(validateSvg(r.svg,r.content).ok,true);
});
test('path traversal and external source imagery are rejected',()=>{
 assert.throws(()=>createOnePager(example,'../escape.svg'),/plain SVG/);
 assert.throws(()=>render({...example,heroImage:'../README.md'}),/inside this CP/);
 assert.equal(validateFile('../README.md').ok,false);
});
test('files validate by path; mutation and overwrites are rejected',()=>{
 const a=createOnePager(example,`test-${Date.now()}.svg`);
 try {
  assert.equal(validateFile(a.filePath).ok,true);
  assert.throws(()=>createOnePager(example,path.basename(a.filePath)),/overwrite/);
  fs.appendFileSync(a.filePath,'<broken>');assert.equal(validateFile(a.filePath).ok,false);
 } finally {for(const p of [a.filePath,a.contentPath,a.outlinedPath])fs.unlinkSync(p);}
});

test('missing imagery requests context-driven generation and writes no artifact',()=>{
 const before=fs.readdirSync(path.join(root,'deliverables'));
 const tax=createOnePager({...example,heroImage:undefined,topic:'Tax design for regulated products',centralVisual:{concept:'A receipt and coins on a desk'}});
 const age=createOnePager({...example,heroImage:undefined,topic:'Retail age verification',centralVisual:{concept:'An adult customer at an age-check counter'}});
 assert.equal(tax.status,'needs_generated_visuals');assert.equal(tax.filePath,undefined);
 assert.ok(tax.visuals[0].prompt.includes('A receipt and coins on a desk'));
 assert.ok(age.visuals[0].prompt.includes('An adult customer at an age-check counter'));
 assert.notEqual(tax.visuals[0].prompt,age.visuals[0].prompt);
 assert.deepEqual(fs.readdirSync(path.join(root,'deliverables')),before);
});
test('central container is mandatory, filled, and cannot be disabled',()=>{
 assert.throws(()=>render({...example,centralVisual:{}}),/Reference imagery is not a default/);
 assert.throws(()=>render({...example,centralVisual:{useReferenceImage:true,frame:'none'}}));
 const r=render(example);
 assert.match(r.svg,/<circle id="central-container"[^>]+fill="#EFEDE0"[^>]+stroke="#EA5265"/);
 assert.equal(validateSvg(r.svg.replace('id="central-container"','id="removed"'),r.content).ok,false);
});
test('each callout has an image above its heading and an outward connector',()=>{
 const r=render(example);
 for(let i=0;i<3;i++) {
  assert.ok(r.svg.includes(`id="callout-${i}-image"`));assert.ok(r.svg.includes(`id="connector-${i}"`));
  const image=r.svg.match(new RegExp(`<image id="callout-${i}-image"[^>]+`))[0];
  const iw=Number(image.match(/ width="([^"]+)"/)[1]);
  assert.ok(iw>=[194,236,194][i]);
  const y=Number(image.match(/ y="([^"]+)"/)[1]),h=Number(image.match(/ height="([^"]+)"/)[1]);
  const slot=r.svg.match(new RegExp(`<g id="callout-${i}-title"[^>]*><text[^>]+`))[0];
  assert.ok(y+h<Number(slot.match(/ y="([^"]+)"/)[1]));
 }
});
test('missing callout returns targeted prompt and duplicate images fail',()=>{
 const incomplete={...example,callouts:example.callouts.map((p,i)=>i===1?{...p,image:undefined}:p)};
 const plan=createOnePager(incomplete);
 assert.deepEqual(plan.missingSlots,['callouts[1].image']);assert.equal(plan.visuals.length,4);
 assert.ok(plan.visuals[2].prompt.includes(example.callouts[1].title));
 assert.equal(plan.filePath,undefined);
 assert.throws(()=>render({...incomplete,mode:'final',factsVerified:true}),/Final output requires/);
 assert.throws(()=>render({...example,callouts:example.callouts.map(p=>({...p,image:example.heroImage}))}),/four distinct images/);
});

test('official symbol watermark spans both backgrounds behind foreground content',()=>{
 const r=render(example);
 assert.match(r.svg,/<g id="cp-page-watermark"[^>]+opacity="0.07"/);
 assert.ok(r.svg.includes('watermark-hero-clip'));
 assert.ok(r.svg.includes('watermark-paper-clip'));
 assert.ok(r.svg.indexOf('id="cp-page-watermark"')<r.svg.indexOf('id="headline"'));
 assert.equal(validateSvg(r.svg.replace('opacity="0.07"','opacity="0.7"'),r.content).ok,false);
 assert.equal(validateSvg(r.svg.replace('id="cp-page-watermark"','id="missing-watermark"'),r.content).ok,false);
});
