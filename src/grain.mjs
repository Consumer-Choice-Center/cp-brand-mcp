import {encodePNG} from './cutout.mjs';

// Fixed monochrome noise tile: reproducible in SVG, PNG and paired treatments.
let tile;
export function backgroundGrain(amount=.065) {
 if(!amount)return '';
 if(!tile){
  const size=256,pixels=Buffer.alloc(size*size*4);let seed=0x43504752;
  for(let i=0;i<pixels.length;i+=4){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const value=(seed>>>31)?255:0;
   pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=(seed>>>16)&255;
  }
  tile=encodePNG(size,size,pixels).toString('base64');
 }
 return `<defs><pattern id="cp-grain-tile" patternUnits="userSpaceOnUse" width="256" height="256"><image width="256" height="256" href="data:image/png;base64,${tile}"/></pattern></defs><rect id="background-grain" width="1080" height="1350" fill="url(#cp-grain-tile)" opacity="${amount}"/>`;
}
