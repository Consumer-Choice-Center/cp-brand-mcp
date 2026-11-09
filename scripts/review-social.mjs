import fs from 'node:fs';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {Resvg} from '@resvg/resvg-js';
import {root} from '../src/brand.mjs';
const out=path.join(root,'deliverables',`social-review-${Date.now()}`);fs.mkdirSync(out,{recursive:true});
const photo={imageFile:'inputs/pouch-subject-35.png',imageAlt:'User-supplied unbranded white rectangular pouch with sealed edges and visible fabric texture.',imageProvenance:'provided_photo',visualRelevanceConfirmed:true,visualConcept:'A natural pillow-shaped pouch with sealed ends',topic:'Pouch users in public discussion',grainAmount:.025,outlineWidth:3};
const quotePhoto={imageFile:'inputs/CP_Quote1-reference-portrait.png',imageAlt:'Portrait from the supplied CP quote reference, used only for layout review.',imageProvenance:'provided_photo',visualRelevanceConfirmed:true,personName:'Example speaker',personTitle:'Sample role · Layout preview'};
const samples=[
 ['01-orbit',{template:'social_orbit',headline:'Make your voice heard',callouts:['Share your experience','Ask clear questions','Join the discussion','Listen to other views'],cta:'Take part in the conversation',...photo}],
 ['02-editorial',{template:'social_editorial',language:'sv',headline:'Din röst räknas',body:'Bra beslut börjar med att lyssna.\n\nDela dina erfarenheter, ställ frågor och delta i samtalet.\n\nTillsammans gör vi fler perspektiv hörda.',cta:'Läs mer och delta'}],
 ['03-quote-side',{template:'quote_side',quote:'Every conversation starts with listening to real experiences.',...quotePhoto}],
 ['04-quote-overlay',{template:'quote_overlay',quote:'Clear information helps people ask better questions.',...quotePhoto,imageFile:'inputs/CP_Quote2-reference-portrait.png'}],
 ['05-cutout',{template:'photo_cutout',language:'sv',headline:'Gör din röst hörd',body:'Dela dina erfarenheter.\nVar med i samtalet.',cta:'Delta i diskussionen',...photo,imageFile:'inputs/pouch-subject-36.png'}]
];
const client=new Client({name:'cp-social-review',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'src/server.mjs')],env:{...process.env,CP_BRAND_OUTPUT_DIR:out}}));
async function call(name,args={}){const r=await client.callTool({name,arguments:args});const v=JSON.parse(r.content[0].text);if(r.isError)throw Error(JSON.stringify(v));return v;}
try {
 await call('get_brand_guidelines');const results=[];
 for(const [name,content] of samples){const result=await call('create_social_post',{content,outputFileName:name});for(const a of result.artifacts){const valid=await call('validate_social_post',{filePath:a.filePath});if(!valid.ok)throw Error(JSON.stringify(valid));results.push({name:`${name} · ${a.treatment}`, ...a});}}
 const cards=results.map(a=>`<article><h2>${a.name}</h2><a href="${path.basename(a.pngPath)}"><img src="${path.basename(a.pngPath)}"></a><p><a href="${path.basename(a.filePath)}">Editable SVG</a> · <a href="${path.basename(a.contentPath)}">Source JSON</a></p></article>`).join('');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>CP social template review</title><style>body{font:18px system-ui;background:#efede0;color:#1d6379;margin:36px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}img{width:100%;height:auto}h2{font-size:20px}a{color:inherit}article{max-width:540px}</style><h1>CP · Local template review</h1><p>Draft samples only. Portraits are extracted from your supplied references; sample text is not attributed to the people pictured. Pouch photographs are your supplied Subject 35 and Subject 36 cutouts. They guide the natural rectangular shape, sealed ends and fabric texture; future imagery remains contextual and unbranded.</p><main>${cards}</main></html>`);
 const w=350,h=470,tiles=results.map((a,i)=>`<image x="${(i%4)*w}" y="${Math.floor(i/4)*h}" width="${w}" height="438" href="data:image/png;base64,${fs.readFileSync(a.pngPath).toString('base64')}"/>`).join('');
 const sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="940"><rect width="1400" height="940" fill="#EFEDE0"/>${tiles}</svg>`;
 fs.writeFileSync(path.join(out,'contact-sheet.png'),new Resvg(sheet).render().asPng());
 fs.writeFileSync(path.join(out,'review-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({out,count:results.length},null,2));
}finally{await client.close();}
