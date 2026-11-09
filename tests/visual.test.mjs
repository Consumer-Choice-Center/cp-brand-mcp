import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {DOMParser} from '@xmldom/xmldom';
import {root} from '../src/brand.mjs';
import {renderSocial,createSocial,validateSocial} from '../src/social.mjs';
import {auditVisualSVG} from '../src/visual-qa.mjs';
const editorial={template:'social_editorial',headline:'Clear information',body:'Ask questions and share your experience.',backgroundGrain:0};
const photo=path.join(root,'inputs',`visual-fixture-${process.pid}.png`);
fs.mkdirSync(path.dirname(photo),{recursive:true});
const write=svg=>fs.writeFileSync(photo,new Resvg(svg).render().asPng());
test.after(()=>fs.rmSync(photo,{force:true}));

test('independent visual audit rejects low contrast, covering artwork and text collisions',()=>{
 const r=renderSocial(editorial);assert.equal(auditVisualSVG(r.svg).ok,true);
 const low=r.svg.replace(/(<g id="headline">[\s\S]*?<text[^>]*fill=")#[A-Fa-f0-9]{6}/,'$1#EFEDE0');
 assert.ok(auditVisualSVG(low).violations.some(v=>v.includes('contrast')));
 const hidden=r.svg.replace('</svg>','<rect width="1080" height="1350" fill="#EFEDE0"/></svg>');
 assert.ok(auditVisualSVG(hidden).violations.some(v=>v.includes('Hidden')));
 const collided=r.svg.replace('<g id="body">','<g id="body" transform="translate(0 -320)">');
 assert.ok(auditVisualSVG(collided).violations.some(v=>v.includes('collision')));
});

test('canonical validation rejects an unreadable scene; final creation refuses it',()=>{
 write('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="white"/></svg>');
 const c={template:'scene_overlay_strips',headline:'White on white',imageFile:photo,imageAlt:'Test-only white raster, not a production photo.',imageProvenance:'provided_photo',visualRelevanceConfirmed:true,imageTreatment:'color',scene:{backgroundMode:'keep'},grainAmount:0,backgroundGrain:0};
 const r=createSocial(c,`test-low-contrast-${process.pid}`);
 try{assert.equal(r.artifacts[0].visual.ok,false);const v=validateSocial(r.artifacts[0].filePath);assert.equal(v.ok,false);assert.ok(v.violations.some(s=>s.includes('contrast')));
 assert.throws(()=>createSocial({...c,mode:'final',factsVerified:true,sources:[{label:'Synthetic test'}]},`test-final-contrast-${process.pid}`),/contrast/);
 }finally{for(const a of r.artifacts)for(const k of ['filePath','outlinedPath','pngPath','contentPath'])fs.rmSync(a[k],{force:true});}
});

test('wide transparent quote images fit the frame and honor portrait position controls',()=>{
 write('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect x="20" y="20" width="1160" height="360" rx="40" fill="#445566"/></svg>');
 const base={quote:'A short layout test.',personName:'Test speaker',personTitle:'Test role',imageFile:photo,imageAlt:'Test-only wide transparent shape.',imageProvenance:'provided_photo',visualRelevanceConfirmed:true};
 for(const template of ['quote_side','quote_overlay']){
  const a=renderSocial({...base,template}),b=renderSocial({...base,template,portrait:{scale:.7,position:[0,0]}});
  for(const r of [a,b]){
   const doc=new DOMParser().parseFromString(r.svg,'image/svg+xml');
   const image=Array.from(doc.getElementsByTagName('image')).find(el=>el.parentNode===doc.documentElement&&!el.getAttribute('data-cp-logo'));
   const x=+image.getAttribute('x'),y=+image.getAttribute('y'),w=+image.getAttribute('width'),h=+image.getAttribute('height');
   assert.ok(x>=0&&x+w<=1080&&y>=0&&y+h<=1350);
   if(r===a)assert.ok(Math.abs(y+h-1350)<.01);
  }
  assert.notEqual(a.svg,b.svg);
 }
});

test('missing quote photograph requests a speaker portrait and the quote tool',()=>{
 const r=createSocial({template:'quote_side',quote:'Test.',personName:'Test',personTitle:'Role'});
 assert.equal(r.status,'needs_portrait');assert.match(r.brief,/speaker portrait/);
 assert.ok(r.workflow.some(s=>s.includes('create_quote_post')));
 assert.ok(r.workflow.every(s=>!s.includes('create_cutout_post')));
});
