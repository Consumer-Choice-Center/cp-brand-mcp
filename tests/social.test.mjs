import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {root,outputRoot,sha} from '../src/brand.mjs';
import {socialSchema,renderSocial,createSocial,validateSocial,photoBrief} from '../src/social.mjs';
import {prepareCutout} from '../src/cutout.mjs';
import {reviewSpelling} from '../src/spelling.mjs';
const editorial={template:'social_editorial',language:'sv',headline:'Din röst räknas',body:'Ställ frågor och dela dina erfarenheter.',cta:'Delta i samtalet'};
// Synthetic geometry is a test-only raster to exercise masks, not a production photograph.
const fixture=path.join(root,'inputs',`test-${process.pid}.png`);fs.mkdirSync(path.dirname(fixture),{recursive:true});
const pixels=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect x="30" y="15" width="180" height="345" fill="#97854e"/><circle cx="120" cy="95" r="70" fill="#df9862"/></svg>').render().asPng();fs.writeFileSync(fixture,pixels);
const photo={imageFile:fixture,imageAlt:'Test-only raster fixture',imageProvenance:'provided_photo',visualRelevanceConfirmed:true};
const quote={template:'quote_side',language:'sv',quote:'Åsikter och frågor är välkomna.',personName:'Exempelperson',personTitle:'Exempelroll',...photo};
test.after(()=>fs.rmSync(fixture,{force:true}));
test('Swedish exact glyphs fit without rewriting quotes',()=>{
 const r=renderSocial(quote);assert.equal(r.content.quote,quote.quote);assert.match(r.svg,/Åsikter/);assert.doesNotMatch(r.svg,/linearGradient|radialGradient|portrait-shade/);assert.doesNotMatch(r.svg,/id="(?:name|title)-strip"|x="55" y="232"/);assert.ok(r.layout.every(s=>s.size>=s.min));
 assert.equal(reviewSpelling({body:'Ställ frågor och dela dina erfarenheter.'},{language:'sv'}).ok,true);
 assert.ok(reviewSpelling({body:'teh goverment'},{language:'en'}).issues.length);assert.equal(reviewSpelling({quote:'teh'},{language:'en'}).fields.quote,'teh');
});
test('supported layouts reject overflow, wrong fields and unsupported language',()=>{
 assert.throws(()=>renderSocial({...editorial,headline:'W'.repeat(115)}),/overflow/);
 assert.throws(()=>renderSocial({...editorial,language:'de'}));
 assert.throws(()=>renderSocial({...editorial,callouts:['a','b','c','d']}),/only supported/);
 assert.throws(()=>renderSocial({...quote,body:'Discarded?'}),/fields only/);
 assert.throws(()=>renderSocial({...quote,personName:undefined}),/personName/);
 assert.throws(()=>renderSocial({...editorial,headline:'🙂'}),/Unsupported glyph/);
});
test('missing photo requests a dynamic real-photo workflow without writing',()=>{
 const before=fs.existsSync(outputRoot)?fs.readdirSync(outputRoot):[];
 const r=createSocial({template:'photo_cutout',headline:'Make your voice heard',topic:'Public participation'});
 assert.equal(r.status,'needs_real_photo');assert.match(r.brief,/Public participation/);assert.match(r.brief,/Do not generate/);
 assert.deepEqual(fs.existsSync(outputRoot)?fs.readdirSync(outputRoot):[],before);
 assert.notEqual(photoBrief({template:'photo_cutout',headline:'Retail checks'}).brief,r.brief);
});
test('photos require provenance, relevance and confined paths',()=>{
 assert.throws(()=>renderSocial({...quote,imageProvenance:undefined}),/imageProvenance/);
 assert.throws(()=>renderSocial({...quote,imageProvenance:'sourced_photo'}),/source URL/);
 assert.throws(()=>renderSocial({...quote,visualRelevanceConfirmed:false}),/Inspect/);
 assert.throws(()=>renderSocial({...quote,imageFile:'README.md'}),/inside this CP/);
 const link=path.join(root,'inputs',`external-${process.pid}.png`);fs.symlinkSync(path.join(root,'README.md'),link);
 try{assert.throws(()=>renderSocial({...quote,imageFile:link}),/inside this CP/);}finally{fs.unlinkSync(link);}
});
test('final social output requires facts, sources and quote verification',()=>{
 assert.throws(()=>renderSocial({...editorial,mode:'final'}),/factsVerified/);
 assert.throws(()=>renderSocial({...editorial,mode:'final',factsVerified:true}),/sources/);
 assert.throws(()=>renderSocial({...quote,mode:'final',factsVerified:true,sources:[{label:'Caller transcript'}]}),/quoteVerified/);
 assert.doesNotThrow(()=>renderSocial({...quote,mode:'final',factsVerified:true,quoteVerified:true,sources:[{label:'Test-only transcript'}]}));
});
test('real-photo treatments preserve silhouette and produce neutral greyscale',()=>{
 const image={data:pixels,sha256:sha(pixels),href:`data:image/png;base64,${pixels.toString('base64')}`};
 const color=prepareCutout(image,'color'),grey=prepareCutout(image,'greyscale');
 assert.equal(color.cutout.width,grey.cutout.width);assert.equal(color.cutout.height,grey.cutout.height);assert.notEqual(color.href,grey.href);
 const decode=img=>new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><image width="240" height="360" href="${img.href}"/></svg>`).render().pixels;
 const cp=decode(color),gp=decode(grey);for(let i=3;i<cp.length;i+=4)assert.equal(cp[i],gp[i]);
 // The off-white outline intentionally retains its CP palette; the opaque image interior is neutral.
 const interior=(180*240+120)*4;assert.equal(gp[interior],gp[interior+1]);assert.equal(gp[interior+1],gp[interior+2]);
 assert.throws(()=>prepareCutout(image,'color',{cropPolygon:[[0,0],[2,0],[1,1]]}),/normalized/);
});
test('paired exports validate; tampering, photo replacement and overwrites fail',()=>{
 const name=`test-social-${process.pid}-${Date.now()}`;
 const result=createSocial({template:'photo_cutout',headline:'Share your views',...photo},name);
 const paths=result.artifacts.flatMap(a=>[a.filePath,a.outlinedPath,a.pngPath,a.contentPath]);
 try {
  assert.equal(result.artifacts.length,2);
  for(const a of result.artifacts)assert.equal(validateSocial(a.filePath).ok,true);
  assert.throws(()=>createSocial({...editorial},'../bad'),/plain filename/);
  assert.throws(()=>createSocial({template:'photo_cutout',headline:'Share your views',...photo},name),/overwrite/);
  const a=result.artifacts[0],saved=fs.readFileSync(a.pngPath);fs.appendFileSync(a.pngPath,'x');assert.equal(validateSocial(a.filePath).ok,false);fs.writeFileSync(a.pngPath,saved);
  const different=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><circle cx="120" cy="180" r="100" fill="red"/></svg>').render().asPng();fs.writeFileSync(fixture,different);assert.equal(validateSocial(a.filePath).ok,false);fs.writeFileSync(fixture,pixels);
  assert.equal(validateSocial(a.filePath).ok,true);
 }finally{for(const p of paths)fs.rmSync(p,{force:true});}
});
test('unsafe markup is inert and unsupported crop configuration fails',()=>{
 const r=renderSocial({...editorial,headline:'<script>Text</script>'});assert.match(r.svg,/&lt;script&gt;/);assert.ok(!r.svg.includes('<script>'));
 assert.throws(()=>renderSocial({...quote,cropHoles:[[[0,0],[.2,.2],[0,.2]]]}),/cropPolygon/);
});

test('orbit arrows point outward toward each callout and follow wrapped text',()=>{
 const base={template:'social_orbit',headline:'Pouch perspectives',callouts:['Clear information','Personal experience','Open discussion','Your questions'],...photo};
 const r=renderSocial(base);
 const arrows=svg=>[...svg.matchAll(/id="callout-arrow-(\d)" data-target="callout-\d" d="M([\d.]+) ([\d.]+) C[\d.]+ [\d.]+ [\d.]+ [\d.]+ ([\d.]+) ([\d.]+) M[^\"]+"/g)];
 const a=arrows(r.svg);assert.equal(a.length,4);
 for(const m of a){const i=Number(m[1]),sx=Number(m[2]),sy=Number(m[3]),ex=Number(m[4]),ey=Number(m[5]);
  assert.equal(ex,i%2?792.5:287.5);assert.ok(i<2?ey<sy:ey>sy);assert.ok(i%2?ex>sx:ex<sx);
  assert.ok(Math.hypot(ex-sx,ey-sy)>30);
 }
 const wrapped=renderSocial({...base,callouts:['Clear information for every participant',...base.callouts.slice(1)]});
 assert.notEqual(arrows(wrapped.svg)[0][5],a[0][5]);
 assert.match(photoBrief({template:'photo_cutout',headline:'Pouch perspectives'}).brief,/unbranded/);
 assert.match(photoBrief({template:'photo_cutout',headline:'Pouch perspectives'}).brief,/No commercial product logos/);
});

test('background grain is deterministic, visible and beneath crisp text',()=>{
 const plain=renderSocial({...editorial,backgroundGrain:0});
 const grain=renderSocial({...editorial,backgroundGrain:.12});assert.equal(grain.svg,renderSocial({...editorial,backgroundGrain:.12}).svg);
 assert.doesNotMatch(plain.svg,/id="background-grain"/);
 assert.ok(grain.svg.indexOf('id="background-grain"')<grain.svg.indexOf('id="headline"'));
 assert.ok(grain.svg.indexOf('id="background-grain"')<grain.svg.indexOf('data-cp-logo'));
 const decode=svg=>new Resvg(svg).render().pixels;
 const a=decode(plain.svg),b=decode(grain.svg);let changes=0;
 for(let y=1200;y<1220;y++)for(let x=20;x<40;x++){const p=(y*1080+x)*4;if(a[p]!==b[p])changes++;assert.equal(a[p+3],b[p+3]);}
 assert.ok(changes>300);assert.deepEqual(plain.layout,grain.layout);
});
