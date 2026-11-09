import {Resvg} from '@resvg/resvg-js';
// Bounded cubic tangents round hand-traced contours without large overshoots.
export function contourPath(points,w,h,smoothing=.65) {
 const p=points.map(([x,y])=>[x*w,y*h]),n=p.length;
 if(!smoothing)return p.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+'Z';
 const tangents=p.map((v,i)=>{
  const before=p[(i+n-1)%n],after=p[(i+1)%n],dx=(after[0]-before[0])*smoothing/6,dy=(after[1]-before[1])*smoothing/6;
  const cap=Math.min(Math.hypot(v[0]-before[0],v[1]-before[1]),Math.hypot(after[0]-v[0],after[1]-v[1]))*.28;
  const scale=Math.min(1,cap/(Math.hypot(dx,dy)||1));return [dx*scale,dy*scale];
 });
 let d=`M${p[0][0]} ${p[0][1]}`;
 for(let i=0;i<n;i++){const j=(i+1)%n;d+=` C${p[i][0]+tangents[i][0]} ${p[i][1]+tangents[i][1]} ${p[j][0]-tangents[j][0]} ${p[j][1]-tangents[j][1]} ${p[j][0]} ${p[j][1]}`;}
 return d+'Z';
}
export function applyContourMask(pixels,w,h,{cropPolygon,cropHoles=[],maskSmoothing=.65,edgeFeather=.65}) {
 if(!cropPolygon)return Buffer.from(pixels); // Keep professionally supplied alpha untouched.
 const paths=[cropPolygon,...cropHoles].map(p=>contourPath(p,w,h,maskSmoothing)).join(' ');
 const mask=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path fill="white" fill-rule="evenodd" d="${paths}"/></svg>`,{font:{loadSystemFonts:false}}).render().pixels;
 let alpha=Float32Array.from({length:w*h},(_,i)=>mask[i*4+3]);
 if(edgeFeather>0){
  const radius=Math.ceil(edgeFeather*3),weights=[];let sum=0;
  for(let k=-radius;k<=radius;k++){const v=Math.exp(-k*k/(2*edgeFeather*edgeFeather));weights.push(v);sum+=v;}
  for(let k=0;k<weights.length;k++)weights[k]/=sum;
  const horizontal=new Float32Array(w*h),vertical=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++)v+=alpha[y*w+Math.max(0,Math.min(w-1,x+k))]*weights[k+radius];horizontal[y*w+x]=v;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++)v+=horizontal[Math.max(0,Math.min(h-1,y+k))*w+x]*weights[k+radius];vertical[y*w+x]=v;}
  alpha=vertical;
 }
 const out=Buffer.from(pixels);for(let i=0;i<alpha.length;i++)out[i*4+3]=Math.round(out[i*4+3]*alpha[i]/255);
 return out;
}
