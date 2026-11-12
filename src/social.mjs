import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {Resvg} from '@resvg/resvg-js';
import {root,outputRoot,brand,font,sha,outlineSvg,auditAssets} from './brand.mjs';
import {prepareCutout,dimensions,cutoutPhotoBrief} from './cutout.mjs';
import {reviewSpelling} from './spelling.mjs';
import {prepareScene,scenePhotoBrief} from './scene.mjs';
import {backgroundGrain} from './grain.mjs';
import {auditVisualSVG} from './visual-qa.mjs';
const {teal,coral,cream,offWhite}=brand.colors;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const str=max=>z.string().trim().min(1).max(max).refine(s=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s),'Control characters are forbidden');
const polygon=z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).min(3).max(256);
export const templates=[
 {id:'social_orbit',name:'Object & callouts',reference:'CP_Soc1.svg',imageRequired:true,description:'A large unbranded pouch photograph with four outward arrows aligned to their callouts on teal.'},
 {id:'social_editorial',name:'Editorial',reference:'CP_Soc2.svg',imageRequired:false,description:'Central teal copy on cream with cropped background lettering.'},
 {id:'quote_side',name:'Portrait & quote',reference:'CP_Quote1.svg',imageRequired:true,description:'Left quote with a large portrait extending to the bottom edge.'},
 {id:'quote_overlay',name:'Portrait overlay',reference:'CP_Quote2.svg',imageRequired:true,description:'Wide upper quote; portrait below with names and roles directly on the artwork.'},
 {id:'scene_top_strips',name:'Scene with upper headline',reference:'CP_PhotoScene_TopStrips.jpg',imageRequired:true,description:'Large real photographic scene over teal and coral shapes, with upper headline text directly on the artwork. Matched color/greyscale exports.'},
 {id:'scene_overlay_strips',name:'Scene with overlaid text',reference:'CP_PhotoScene_OverlayStrips.jpg',imageRequired:true,description:'Full-frame real scene, replaced background, and lower text directly on the artwork; adjustable crop, placement and text position.'},
 {id:'photo_cutout',name:'Contextual photo cutout',imageRequired:true,description:'Large real subject, grain and off-white outline; matching color/greyscale exports.'}
];
export const socialSchema=z.object({
 template:z.enum(templates.map(t=>t.id)),language:z.enum(['en','sv']).default('en'),mode:z.enum(['draft','final']).default('draft'),
 headline:str(240).optional(),body:str(430).optional(),cta:str(65).optional(),callouts:z.array(str(65)).length(4).optional(),
 quote:str(260).optional(),personName:str(65).optional(),personTitle:str(80).optional(),quoteVerified:z.boolean().default(false),
 topic:str(1000).optional(),visualConcept:str(600).optional(),recentVisualConcepts:z.array(str(200)).max(20).default([]),
 imageFile:str(1000).optional(),imageAlt:str(300).optional(),imageProvenance:z.enum(['provided_photo','sourced_photo']).optional(),imageSourceUrl:z.string().url().refine(s=>/^https?:\/\//.test(s)).optional(),imageCredit:str(300).optional(),imageLicense:str(300).optional(),visualRelevanceConfirmed:z.boolean().default(false),
 backgroundGrain:z.number().min(0).max(.25).optional(),
 maskSmoothing:z.number().min(0).max(1).default(.65),edgeFeather:z.number().min(0).max(2).default(.65),
 cropPolygon:polygon.optional(),cropHoles:z.array(polygon).max(16).default([]),grainAmount:z.number().min(0).max(.3).default(.08),outlineWidth:z.number().min(0).max(20).default(7),
 portrait:z.object({scale:z.number().min(.5).max(1).default(1),position:z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)]).default([.5,1])}).strict().optional(),
 imageTreatment:z.enum(['color','greyscale','both']).default('both'),focalPoint:z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)]).default([.5,.4]),
 factsVerified:z.boolean().default(false),sources:z.array(z.object({label:str(250),url:z.string().url().refine(s=>/^https?:\/\//.test(s)).optional()}).strict()).max(10).default([]),
 scene:z.object({backgroundMode:z.enum(['replace','keep']).default('replace'),scale:z.number().min(.7).max(2).default(1),offsetX:z.number().min(-1080).max(1080).default(0),offsetY:z.number().min(-1350).max(1350).default(0),textY:z.number().min(100).max(1000).optional(),accent:z.enum(['burst','diagonal','none']).optional()}).strict().optional(),
 approvedWords:z.array(str(60)).max(80).default([])
}).strict();
const isQuote=c=>c.template.startsWith('quote_');
const isScene=c=>c.template.startsWith('scene_');
const hasPair=c=>isScene(c)||isCutout(c);
const isCutout=c=>['photo_cutout','social_orbit'].includes(c.template);
function ensureContent(c) {
 c.backgroundGrain??=c.template==='social_editorial'?.04:.065;
 if(c.portrait&&!isQuote(c))throw Error('portrait controls require a quote template.');
 if(isScene(c)) {
  c.scene={backgroundMode:'replace',scale:1,offsetX:0,offsetY:0,...c.scene};
  if(c.body)throw Error('Scene layouts use headline strips and optional CTA; combine the intended scene copy in headline.');
 }else {
  if(c.scene)throw Error('scene settings require a scene template.');
  if(c.headline?.length>120)throw Error('Headline must be 120 characters or fewer outside scene templates.');
 }
 if(isQuote(c)) {for(const k of ['quote','personName','personTitle'])if(!c[k])throw Error(`Quote requires ${k}.`);if(c.headline||c.body||c.cta||c.callouts)throw Error('Quote templates use quote, personName and personTitle fields only.');}
 else {if(!c.headline)throw Error('Social post requires headline.');if(c.quote||c.personName||c.personTitle)throw Error('Use a quote template for attribution.');}
 if(c.template==='social_orbit'&&!c.callouts)throw Error('Object & callouts requires exactly four callouts.');
 if(c.template!=='social_orbit'&&c.callouts)throw Error('Callouts are only supported by social_orbit.');
 if(c.template==='social_orbit'&&c.body)throw Error('Use callouts instead of body in social_orbit.');
 if(c.template==='social_editorial'&&c.imageFile)throw Error('Editorial is a typography layout; use photo_cutout for imagery.');
 if(c.cropHoles.length&&!c.cropPolygon)throw Error('cropHoles requires cropPolygon.');
 if(c.mode==='final') {
  if(!c.factsVerified)throw Error('Final output requires caller factsVerified.');
  if(!c.sources.length)throw Error('Final output requires sources (including an attribution source for quotes).');
  if(isQuote(c)&&!c.quoteVerified)throw Error('Final quote requires quoteVerified and permission to attribute this exact wording.');
 }
}
function imageFrom(c) {
 const file=path.resolve(root,c.imageFile),inputs=path.join(root,'inputs');
 const real=fs.realpathSync(file);
 if(!real.startsWith(fs.realpathSync(inputs)+path.sep))throw Error('Photographs must be copied inside this CP inputs directory.');
 if(fs.statSync(real).size>35*1024*1024)throw Error('Photograph exceeds 35MB.');
 const data=fs.readFileSync(real),[width,height]=dimensions(data);
 if(!width||!height||width>12000||height>12000||width*height>40_000_000)throw Error('Photograph exceeds safe dimensions.');
 if(!c.imageAlt||!c.imageProvenance)throw Error('Supply imageAlt and real-photo imageProvenance.');
 if(c.imageProvenance==='sourced_photo'&&(!c.imageSourceUrl||!c.imageCredit||!c.imageLicense))throw Error('Sourced photograph requires source URL, credit and reuse license.');
 if(!c.visualRelevanceConfirmed)throw Error('Inspect the real photo and set visualRelevanceConfirmed.');
 const href=`data:image/${data[0]===137?'png':'jpeg'};base64,${data.toString('base64')}`;
 const probe=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><image width="64" height="64" preserveAspectRatio="none" href="${href}"/></svg>`,{font:{loadSystemFonts:false}}).render().pixels;
 if(!probe.some((value,i)=>i%4===3&&value>8))throw Error('Photograph cannot be decoded into visible pixels.');
 return {data,sha256:sha(data),href:`data:image/${data[0]===137?'png':'jpeg'};base64,${data.toString('base64')}`,width,height};
}
function metrics(text,role,size) {
 const f=font(role),run=f.layout(text),scale=size/f.unitsPerEm;
 let cursor=0,minX=0,maxX=0,top=f.ascent,bottom=f.descent;
 for(let i=0;i<run.glyphs.length;i++) {
  const g=run.glyphs[i],p=run.positions[i],b=g.bbox;
  if(g.path.commands.length){minX=Math.min(minX,cursor+p.xOffset+b.minX);maxX=Math.max(maxX,cursor+p.xOffset+b.maxX);top=Math.max(top,p.yOffset+b.maxY);bottom=Math.min(bottom,p.yOffset+b.minY);}
  cursor+=p.xAdvance;
 }
 return {width:(Math.max(cursor,maxX)-minX)*scale,left:minX*scale,top:top*scale,bottom:bottom*scale};
}
function width(text,role,size){return metrics(text,role,size).width;}
function wrap(text,role,size,w) {
 const lines=[];
 for(const paragraph of text.split('\n')) {
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)) {
   if(width(word,role,size)>w)return null;
   const next=line?line+' '+word:word;
   if(width(next,role,size)>w){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}
function textBlock(id,text,{x,y,w,h,role='body',size=54,min=44,color=offWhite,align='left',leading=1.18},reports) {
 const f=font(role);
 for(const char of text)if(!/\s/u.test(char)&&!f.hasGlyphForCodePoint(char.codePointAt(0)))throw Error(`Unsupported glyph ${char} in ${id}.`);
 for(let s=size;s>=min;s--) {
  const lines=wrap(text,role,s,w);if(!lines)continue;
  const measurements=lines.map(line=>metrics(line,role,s));
  const ascent=Math.max(...measurements.map(m=>m.top)),descent=Math.min(...measurements.map(m=>m.bottom));
  const height=ascent-descent+(lines.length-1)*s*leading;
  // Scene slots reuse these metrics; allow only floating-point roundoff.
  if(height-h>1e-6)continue;

  const boxes=[];
  const markup=lines.map((line,i)=>{
   const tx=x-measurements[i].left+(align==='center'?(w-measurements[i].width)/2:0),ty=y+ascent+i*s*leading;
   const run=f.layout(line),scale=s/f.unitsPerEm;let cursor=tx;
   for(let j=0;j<run.glyphs.length;j++) {const g=run.glyphs[j],p=run.positions[j],b=g.bbox;
    if(g.path.commands.length){const box={x:cursor+(p.xOffset+b.minX)*scale,y:ty-(p.yOffset+b.maxY)*scale,w:(b.maxX-b.minX)*scale,h:(b.maxY-b.minY)*scale};
     if(box.x<x-1||box.x+box.w>x+w+1||box.y<y-1||box.y+box.h>y+h+1)throw Error(`Glyph exceeds ${id} slot.`);boxes.push(box);}
    cursor+=p.xAdvance*scale;
   }
   return `<text x="${tx}" y="${ty}" fill="${color}" font-family="${brand.typography[role]}" font-size="${s}">${esc(line)}</text>`;
  }).join('');
  reports.push({id,size:s,min,lines:lines.length,box:{x,y,w,h},glyphBounds:boxes});
  return `<g id="${id}">${markup}</g>`;
 }
 throw Error(`Text overflow in ${id}; shorten the copy. Minimum size is ${min}px.`);
}
function logo(dark,position={x:390,y:1222,w:300,h:75}) {
 // Embed an isolated, outlined copy of an unmodified official logo, avoiding CSS collisions.
 const name=dark?'CP_Logo_Wide_White_Reference.svg':'CP_Logo_Wide_2.svg';
 const outlined=fs.readFileSync(path.join(root,'assets/logos/outlined',name),'utf8');
 return `<image data-cp-logo="${name}" x="${position.x}" y="${position.y}" width="${position.w}" height="${position.h}" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${Buffer.from(outlined).toString('base64')}"/>`;
}
function letters(dark) {return `<g id="background-letters" opacity="${dark?.055:.035}" fill="${dark?offWhite:teal}"><text x="-145" y="380" font-family="${brand.typography.headline}" font-size="500" fill="${dark?offWhite:teal}">POU</text><text x="-150" y="970" font-family="${brand.typography.headline}" font-size="450" fill="${dark?offWhite:teal}">CHES</text></g>`;}
function photoMarkup(img,x,y,w,h,cover=false,focal=[.5,.4]) {
 if(!cover)return `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" href="${img.href}"/>`;
 const scale=Math.max(w/img.width,h/img.height),rw=img.width*scale,rh=img.height*scale;
 return `<svg x="${x}" y="${y}" width="${w}" height="${h}" overflow="hidden"><image x="${(w-rw)*focal[0]}" y="${(h-rh)*focal[1]}" width="${rw}" height="${rh}" href="${img.href}"/></svg>`;
}
function sceneStrips(c,reports) {
 const top=c.template==='scene_top_strips',text=c.headline+(c.cta?'\n'+c.cta:'');
 const y=c.scene.textY??(top?160:825),maxH=Math.min(top?410:440,1260-y);
 for(let size=86;size>=64;size--) {
  const lines=wrap(text,'headline',size,876);if(!lines)continue;
  const mm=lines.map(line=>metrics(line,'headline',size));
  const heights=mm.map(m=>m.top-m.bottom+20),total=heights.reduce((a,b)=>a+b,0)+12*(lines.length-1);
  if(total>maxH)continue;
  let cursor=y;const out=[];
  lines.forEach((line,i)=>{
   const x=76+(i%2?10:0),w=mm[i].width+36,h=heights[i];
   const color=offWhite;
   out.push(textBlock(`scene-strip-${i}`,line,{x:x+14,y:cursor+10,w:w-30,h:h-20,size,min:size,role:'headline',color},reports));
   cursor+=h+12;
  });
  return out.join('');
 }
 throw Error('Text overflow in scene strips; shorten copy, add deliberate line breaks, or move scene.textY upward. Minimum size is 64px.');
}
function sceneArtwork(c,img,reports) {
 const top=c.template==='scene_top_strips',accent=c.scene.accent??(top?'burst':'diagonal');
 const s=Math.max(1080/img.width,1350/img.height)*c.scene.scale,w=img.width*s,h=img.height*s;
 const x=(1080-w)*c.focalPoint[0]+c.scene.offsetX,y=(1350-h)*c.focalPoint[1]+c.scene.offsetY;
 const background=accent==='burst'?`<path id="scene-accent" fill="${coral}" d="M80 400 L350 660 L550 355 L574 720 L1005 405 L820 850 L1130 1060 L600 975 L210 1320 L330 850 L-100 930 Z"/>`:accent==='diagonal'?`<path id="scene-accent" fill="${coral}" d="M230 90 L810 -180 L1180 450 L-60 700 Z"/>`:'';
 const photo=`<image id="scene-photo" x="${x}" y="${y}" width="${w}" height="${h}" href="${img.href}"/>`;
 const mark=logo(true,{x:70,y:51,w:310,h:75});
 return background+backgroundGrain(c.backgroundGrain)+photo+mark+sceneStrips(c,reports);
}
export function renderSocial(input,treatment='color') {
 const c=socialSchema.parse(input);ensureContent(c);
 const audit=auditAssets();if(!audit.ok)throw Error(audit.violations.join('; '));
 const need=templates.find(t=>t.id===c.template).imageRequired;
 if(need&&!c.imageFile)throw Error('This template needs a request-supplied or sourced real photograph.');
 const original=need?imageFrom(c):null;
 const img=isScene(c)?prepareScene(original,treatment,c):isCutout(c)?prepareCutout(original,treatment,c):original;
 const reports=[],warnings=[],dark=c.template!=='social_editorial',bg=dark?teal:cream,fg=dark?offWhite:teal;
 const block=(id,text,box)=>textBlock(id,text,box,reports);
 const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" overflow="hidden"><title>${esc(c.headline||c.quote)}</title><desc>${esc(c.imageAlt||'CP editorial graphic')}</desc><rect width="1080" height="1350" fill="${bg}"/>`,isScene(c)?'':letters(dark)+backgroundGrain(c.backgroundGrain)];
 if(isScene(c)) {
  parts.push(sceneArtwork(c,img,reports));
 } else if(c.template==='social_editorial') {
  parts.push(`<rect x="84" y="185" width="130" height="12" fill="${coral}"/>`);
  parts.push(block('headline',c.headline,{x:84,y:235,w:912,h:280,role:'headline',size:86,min:66,color:fg}));
  if(c.body)parts.push(block('body',c.body,{x:84,y:555,w:912,h:470,size:60,min:48,color:fg}));
 } else if(c.template==='photo_cutout') {
  parts.push(block('headline',c.headline,{x:76,y:75,w:928,h:230,role:'headline',size:84,min:64,align:'center'}));
  if(c.body)parts.push(block('body',c.body,{x:90,y:327,w:900,h:155,size:54,min:46,align:'center'}));
  const aspect=img.cutout.width/img.cutout.height,cap=Math.max(600,Math.min(840,img.cutout.sourceWidth*1.6));
  const pw=Math.min(cap,510*aspect),ph=pw/aspect,py=805-ph/2;
  parts.push(`<g transform="rotate(-12 540 805)">${photoMarkup(img,(1080-pw)/2,py,pw,ph)}</g>`);
  if(pw/img.cutout.width>1.6)warnings.push('Source is enlarged more than 1.6×; use a higher-resolution photo for sharper output.');
 } else if(c.template==='social_orbit') {
  parts.push(block('headline',c.headline,{x:78,y:68,w:924,h:210,role:'headline',size:80,min:64,align:'center'}));
  const fit=Math.min(570/img.cutout.width,380/img.cutout.height),photoW=img.cutout.width*fit,photoH=img.cutout.height*fit;
  const photoTop=700-photoH/2,photoBottom=700+photoH/2;
  parts.push(photoMarkup(img,(1080-photoW)/2,photoTop,photoW,photoH));
  for(let i=0;i<4;i++) {
   const x=i%2?570:65,y=i<2?320:950;
   parts.push(block(`callout-${i}`,c.callouts[i],{x,y,w:445,h:160,role:'subhead',size:52,min:44,align:'center'}));
   const glyphs=reports.at(-1).glyphBounds;
   const endX=x+445/2,endY=i<2?Math.max(...glyphs.map(b=>b.y+b.h))+24:Math.min(...glyphs.map(b=>b.y))-24;
   const startX=540+(i%2?1:-1)*photoW*.32,startY=i<2?photoTop-18:photoBottom+18;
   // Quarter-ellipse cubic: horizontal departure, smooth vertical arrival.
   const k=.5522847498,controlX=startX+(endX-startX)*k,controlY=endY-(endY-startY)*k;
   const ux=0,uy=i<2?-1:1;
   const backX=endX-ux*22,backY=endY-uy*22;
   parts.push(`<path id="callout-arrow-${i}" data-target="callout-${i}" d="M${startX} ${startY} C${controlX} ${startY} ${endX} ${controlY} ${endX} ${endY} M${backX-uy*12} ${backY+ux*12} L${endX} ${endY} L${backX+uy*12} ${backY-ux*12}" fill="none" stroke="${coral}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
 } else {
  let portrait=img,transparent=!!c.cropPolygon;
  if(!transparent&&original.data[0]===137) {
   const probe=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><image width="100" height="100" preserveAspectRatio="none" href="${original.href}"/></svg>`,{font:{loadSystemFonts:false}}).render().pixels;
   let clear=0;for(let i=3;i<probe.length;i+=4)if(probe[i]<8)clear++;
   transparent=clear>100;
  }
  if(transparent)portrait=prepareCutout(original,'color',{...c,grainAmount:0,outlineWidth:0});
  parts.push(`<text data-decorative="true" x="20" y="210" fill="${coral}" font-family="${brand.typography.headline}" font-size="300">“</text>`);
  const slot=c.template==='quote_side'?{x:325,y:292,w:755,h:1058}:{x:185,y:492,w:845,h:858};
  const sourceW=portrait.cutout?.width||portrait.width,sourceH=portrait.cutout?.height||portrait.height;
  const fit=Math.min(slot.w/sourceW,slot.h/sourceH)*(c.portrait?.scale??1);
  const portraitWidth=transparent?sourceW*fit:slot.w*(c.portrait?.scale??1),portraitHeight=transparent?sourceH*fit:slot.h*(c.portrait?.scale??1);
  const position=c.portrait?.position??[c.focalPoint[0],1];
  const portraitX=slot.x+(slot.w-portraitWidth)*position[0],portraitY=slot.y+(slot.h-portraitHeight)*position[1];
  if(c.template==='quote_side') {
   parts.push(transparent?photoMarkup(portrait,portraitX,portraitY,portraitWidth,portraitHeight):photoMarkup(portrait,portraitX,portraitY,portraitWidth,portraitHeight,true,c.focalPoint));
   parts.push(block('quote',`“${c.quote}”`,{x:78,y:250,w:355,h:565,size:62,min:48}));
  } else {
   parts.push(transparent?photoMarkup(portrait,portraitX,portraitY,portraitWidth,portraitHeight):photoMarkup(portrait,portraitX,portraitY,portraitWidth,portraitHeight,true,c.focalPoint));
   parts.push(block('quote',`“${c.quote}”`,{x:78,y:180,w:924,h:320,size:68,min:50}));
  }

  parts.push(`<rect x="78" y="1040" width="85" height="9" fill="${coral}"/>`);
  const nameText=block('person-name',c.personName,{x:78,y:1070,w:924,h:70,role:'subhead',size:54,min:44});
  const titleText=block('person-title',c.personTitle,{x:78,y:1147,w:924,h:62,size:46,min:44});
  parts.push(nameText,titleText);
 }
 if(!isQuote(c)&&!isScene(c)&&c.cta)parts.push(block('cta',c.cta,{x:78,y:1135,w:924,h:65,role:'subhead',size:48,min:42,color:fg,align:'center'}));
 parts.push(isScene(c)?'':logo(dark),'</svg>');
 const svg=parts.join('');
 const fields=Object.fromEntries(['headline','body','cta','quote'].filter(k=>c[k]).map(k=>[k,c[k]]));
 if(c.callouts)c.callouts.forEach((v,i)=>fields[`callout-${i}`]=v);
 const spelling=reviewSpelling(fields,{language:c.language,approvedWords:c.approvedWords});
 return {svg,content:c,treatment,warnings,layout:reports.map(({glyphBounds,...r})=>r),spelling,image:original?{sha256:original.sha256,renderedSha256:img.renderedSha256||original.sha256,cutout:img.cutout||null,...(isScene(c)?{scene:img.scene}:{})}:null};
}
export function photoBrief(input) {
 const c=socialSchema.parse(input);
 if(isQuote(c))return {status:'needs_portrait',template:c.template,brief:'Provide the real speaker portrait for this request, with the exact speaker name, position and approved quote. Do not substitute pouch imagery or another person.',workflow:['Save the supplied portrait in inputs and record imageAlt and imageProvenance.','Use a transparent PNG or a portrait photograph. Set focalPoint for photograph cropping; use portrait.scale and portrait.position to fit transparent portraits without clipping.','Call create_quote_post with the portrait, quote, personName and personTitle, then validate_social_post.']};
 return isScene(c)?scenePhotoBrief(c):cutoutPhotoBrief(c);
}
export function createSocial(input,outputFileName) {
 const c=socialSchema.parse(input);ensureContent(c);
 if(templates.find(t=>t.id===c.template).imageRequired&&!c.imageFile)return {ok:false,status:'needs_real_photo',...photoBrief(c),note:isQuote(c)?'Provide the portrait for this request with speaker name and title. No default portrait is selected.':'No default subject is selected.'};
 const name=outputFileName||`cp-${c.template}-${Date.now()}`;
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(name))throw Error('Use a plain filename stem with letters, numbers, hyphens or underscores.');
 const treatments=hasPair(c)?c.imageTreatment==='both'?['color','greyscale']:[c.imageTreatment]:['color'];
 const prepared=treatments.map(t=>{const r=renderSocial(c,t),visual=auditVisualSVG(r.svg);if(c.mode==='final'&&!visual.ok)throw Error(visual.violations.join('; '));const outlined=outlineSvg(r.svg),png=new Resvg(outlined,{font:{loadSystemFonts:false}}).render().asPng();return {...r,outlined,png,visual};});
 fs.mkdirSync(outputRoot,{recursive:true});
 const files=[],artifacts=[];
 for(const r of prepared) {
  const stem=path.join(outputRoot,name+(hasPair(c)?`-${r.treatment}`:''));
  const paths={filePath:stem+'.svg',outlinedPath:stem+'.outlined.svg',pngPath:stem+'.png',contentPath:stem+'.json'};
  const record={schemaVersion:1,content:r.content,treatment:r.treatment,image:r.image,hashes:{svg:sha(r.svg),outlined:sha(r.outlined),png:sha(r.png)}};
  files.push([paths.filePath,r.svg],[paths.outlinedPath,r.outlined],[paths.pngPath,r.png],[paths.contentPath,JSON.stringify(record,null,2)]);
  artifacts.push({...paths,treatment:r.treatment,layout:r.layout,spelling:r.spelling,warnings:r.warnings,visual:r.visual});
 }
 for(const [file] of files)if(fs.existsSync(file))throw Error(`Refusing to overwrite ${path.basename(file)}.`);
 const written=[];try{for(const [file,bytes] of files){fs.writeFileSync(file,bytes,{flag:'wx'});written.push(file);}}catch(e){for(const file of written)fs.unlinkSync(file);throw e;}
 return {ok:true,template:c.template,language:c.language,mode:c.mode,artifacts,notice:'Drafts are for review. Caller verifies photo authenticity, topic relevance, permissions, factual claims and quote attribution. No content was auto-corrected.'};
}
export function validateSocial(filePath) {
 try {
  const p=fs.realpathSync(filePath);
  if(!p.startsWith(fs.realpathSync(outputRoot)+path.sep)||!p.endsWith('.svg')||p.endsWith('.outlined.svg'))throw Error('Validate an editable social SVG inside the configured output directory.');
  const stem=p.slice(0,-4),side=JSON.parse(fs.readFileSync(stem+'.json','utf8'));
  if(side.schemaVersion!==1)throw Error('Unsupported source version.');
  const r=renderSocial(side.content,side.treatment),outlined=outlineSvg(r.svg),png=new Resvg(outlined,{font:{loadSystemFonts:false}}).render().asPng();
  if(JSON.stringify(r.image)!==JSON.stringify(side.image))throw Error('Source photo or treatment changed.');
  for(const [suffix,expected,key] of [['.svg',r.svg,'svg'],['.outlined.svg',outlined,'outlined'],['.png',png,'png']]) {
   const actual=fs.readFileSync(stem+suffix);if(sha(actual)!==sha(expected)||sha(expected)!==side.hashes[key])throw Error(`Artifact differs from canonical source: ${suffix}`);
  }
  const visual=auditVisualSVG(r.svg);
  return {ok:visual.ok,violations:visual.violations,visual,layout:r.layout,spelling:r.spelling,limits:'Checks exact fonts, independently measured text bounds/collisions and rendered contrast/visibility, image provenance fields, source hashes and canonical exports. Human review still required for faces, photographic authenticity, source resolution and factual accuracy.'};
 }catch(e){return {ok:false,violations:[e.message]};}
}
