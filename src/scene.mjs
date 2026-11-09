import {Resvg} from '@resvg/resvg-js';
import {applyContourMask} from './mask.mjs';
import {sha} from './brand.mjs';
import {dimensions,encodePNG} from './cutout.mjs';
const cache=new Map();
export function prepareScene(image,treatment,c) {
 if(!['color','greyscale'].includes(treatment))throw Error('Unknown scene image treatment.');
 const key=sha(JSON.stringify([image.sha256,treatment,c.cropPolygon,c.cropHoles,c.grainAmount,c.scene.backgroundMode,c.maskSmoothing,c.edgeFeather]));
 if(cache.has(key))return {...image,...cache.get(key)};
 const [sw,sh]=dimensions(image.data),scale=Math.min(1,1800/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
 const raw=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image width="${w}" height="${h}" preserveAspectRatio="none" href="${image.href}"/></svg>`,{font:{loadSystemFonts:false}}).render().pixels;
 const raster=applyContourMask(raw,w,h,c);
 let visible=0,clear=0,seed=parseInt(image.sha256.slice(0,8),16)>>>0;
 const rgba=Buffer.from(raster);
 for(let i=0;i<rgba.length;i+=4){
  if(rgba[i+3]>8)visible++;else clear++;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=(seed/4294967296-.5)*255*c.grainAmount,grey=.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2];
  for(let k=0;k<3;k++)rgba[i+k]=Math.max(0,Math.min(255,Math.round((treatment==='greyscale'?grey:rgba[i+k])+noise)));
 }
 if(visible<w*h*.01)throw Error('Scene photograph cannot be decoded or the mask removes the entire scene.');
 if(c.scene.backgroundMode==='replace'&&clear<w*h*.01)throw Error('Background replacement requires a foreground cropPolygon or a transparent scene PNG. Preserve people, buildings and ground in the mask.');
 const png=encodePNG(w,h,rgba),result={href:`data:image/png;base64,${png.toString('base64')}`,width:w,height:h,renderedSha256:sha(png),scene:{width:w,height:h,treatment,backgroundMode:c.scene.backgroundMode,transparentFraction:clear/(w*h),grainAmount:c.grainAmount,maskSmoothing:c.maskSmoothing,edgeFeather:c.edgeFeather}};
 if(cache.size>=6)cache.delete(cache.keys().next().value);cache.set(key,result);return {...image,...result};
}
export function scenePhotoBrief(c) {
 return {topic:c.topic||c.headline,template:c.template,status:'needs_real_photo',brief:'Supply an original photograph of the relevant scene. Keep the real people, action, setting and ground. Do not use a finished screenshot or generate replacement subjects.',workflow:['Save the original photograph inside this CP inputs directory and record imageAlt and provenance.','For background replacement, trace cropPolygon around the foreground scene and optional cropHoles, or supply a transparent scene PNG. Coordinates are normalized to the original image; the full image coordinate system is retained.','Use scene.backgroundMode=keep to retain the whole original background. Adjust focalPoint, scene.scale, offsetX and offsetY to fit the photograph.','Set scene.textY if the text needs moving. Inspect the preview so no important face or object is obscured.','Call create_photo_scene_post or create_social_post, then validate_social_post. Color/greyscale pairs use the same original photo, mask and geometry.']};
}
