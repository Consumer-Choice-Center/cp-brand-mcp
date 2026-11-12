import {parentPort,workerData} from 'node:worker_threads';
import {Resvg} from '@resvg/resvg-js';
import {renderSocial} from './social.mjs';
import {outlineSvg,sha} from './brand.mjs';
import {auditVisualSVG} from './visual-qa.mjs';
try{
  const portrait=Buffer.from(workerData.portrait),r=renderSocial(workerData.content,'color',portrait),visual=auditVisualSVG(r.svg);
  if(r.content.mode==='final'&&!visual.ok)throw Error(visual.violations.join('; '));
  const outlined=outlineSvg(r.svg),png=new Resvg(outlined,{font:{loadSystemFonts:false}}).render().asPng();
  const preview=new Resvg(outlined,{fitTo:{mode:'width',value:540},font:{loadSystemFonts:false}}).render().asPng();
  const source={content:r.content,portraitSha256:sha(portrait),note:'Re-supply the original portrait using portraitUrl/portraitData for HTTP, or imageFile inside inputs for local rendering.'};
  parentPort.postMessage({preview,files:{'quote.png':{mimeType:'image/png',data:png},'quote.svg':{mimeType:'image/svg+xml',data:r.svg},'quote.outlined.svg':{mimeType:'image/svg+xml',data:outlined},'quote.json':{mimeType:'application/json',data:JSON.stringify(source,null,2)}},report:{brand:'CP',template:r.content.template,language:r.content.language,width:1080,height:1350,visual,spelling:r.spelling,warnings:r.warnings}});
}catch(e){parentPort.postMessage({error:e.message});}
