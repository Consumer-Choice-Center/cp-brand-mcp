import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {root,brand,font,auditAssets,render,sha} from '../src/brand.mjs';
import {renderSocial} from '../src/social.mjs';

test('default generation uses bundled open TTFs, including Swedish glyphs',()=>{
 const identities={headline:'Jost-Medium',subhead:'Montserrat-SemiBold',body:'Montserrat-Regular'};
 const audit=auditAssets();assert.equal(audit.ok,true);
 for(const [role,name] of Object.entries(identities)){
  assert.equal(brand.typography[role],name);assert.equal(font(role).postscriptName,name);
  assert.ok(audit.fonts[role].path.startsWith(path.join(root,'assets/fonts')+path.sep));
  for(const char of 'ÅÄÖåäö0123456789')assert.ok(font(role).hasGlyphForCodePoint(char.codePointAt(0)));
 }
});

test('supplied logos remain intact and render as frozen original-font artwork',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json')));
 const frozen=manifest.files.filter(a=>a.path.startsWith('assets/logos/outlined/'));
 assert.equal(frozen.length,9);
 for(const a of frozen){
  assert.equal(sha(fs.readFileSync(path.join(root,a.source))),a.sourceSha256);
  const svg=fs.readFileSync(path.join(root,a.path),'utf8');
  assert.doesNotMatch(svg,/<text\b|font-family|Jost|Montserrat/);
  assert.match(svg,/<path\b/);
 }
 const sample=JSON.parse(fs.readFileSync(path.join(root,'examples/one-pager.json')));
 const one=render(sample).svg;assert.match(one,/Jost-Medium/);assert.match(one,/Montserrat-Regular/);
 assert.doesNotMatch(one,/Futura|ProximaNova/);
 const social=renderSocial({template:'social_editorial',headline:'Din röst räknas',language:'sv'}).svg;
 const embedded=social.match(/data-cp-logo="([^"]+)"[^>]+href="data:image\/svg\+xml;base64,([^"]+)"/);
 assert.ok(embedded);assert.equal(Buffer.from(embedded[2],'base64').toString(),fs.readFileSync(path.join(root,'assets/logos/outlined',embedded[1]),'utf8'));
});

test('legacy automatic config is ignored and explicit proprietary overrides fail closed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cp-font-config-'));
 try{
  // Isolated module copy exercises startup with a hostile/stale local config,
  // without overwriting the developer's private fonts.local.json.
  fs.mkdirSync(path.join(dir,'src'));fs.mkdirSync(path.join(dir,'data'));
  fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
  fs.copyFileSync(path.join(root,'src/brand.mjs'),path.join(dir,'src/brand.mjs'));
  fs.copyFileSync(path.join(root,'data/brand.json'),path.join(dir,'data/brand.json'));
  fs.symlinkSync(path.join(root,'assets'),path.join(dir,'assets'),'dir');
  fs.copyFileSync(path.join(root,'data/fonts.example.json'),path.join(dir,'data/fonts.example.json'));
  const legacy=path.join(dir,'data/fonts.local.json');
  fs.writeFileSync(legacy,JSON.stringify({headline:{path:'/missing/Futura.ttf',postscriptName:'Futura-Medium'}}));
  const env={...process.env};delete env.CP_BRAND_FONT_CONFIG;
  const run=extra=>spawnSync(process.execPath,['--input-type=module','-e',`import {font} from ${JSON.stringify('file://'+path.join(dir,'src/brand.mjs'))};console.log(font('headline').postscriptName);`],{env:{...env,...extra},encoding:'utf8'});
  const normal=run({});assert.equal(normal.status,0,normal.stderr);assert.match(normal.stdout,/Jost-Medium/);
  const explicit=run({CP_BRAND_FONT_CONFIG:legacy});assert.notEqual(explicit.status,0);assert.match(explicit.stderr,/remove legacy CP_BRAND_FONT_CONFIG/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
