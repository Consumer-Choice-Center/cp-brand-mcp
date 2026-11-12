import https from 'node:https';
import dns from 'node:dns/promises';
import {isIP,BlockList} from 'node:net';
import {dimensions} from './cutout.mjs';
export const MAX_PORTRAIT_BYTES=4*1024*1024;
const denied=new BlockList();
for(const [base,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])denied.addSubnet(base,prefix,'ipv4');
export const publicIPv4=address=>isIP(address)===4&&!denied.check(address,'ipv4');
export function validatePortrait(data){
  if(!data.length||data.length>MAX_PORTRAIT_BYTES)throw Error('Portrait must be a PNG or JPEG of at most 4 MiB.');
  const [w,h]=dimensions(data);if(!w||!h||w>4096||h>4096||w*h>12_000_000)throw Error('Portrait must be at most 4096 pixels per side and 12 megapixels.');
  return data;
}
export async function resolvePortraitTarget(value,lookup=dns.lookup){
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.hash||(u.port&&u.port!=='443'))throw Error('Portrait URL must use public HTTPS without credentials or a custom port.');
  // IPv6 literals and non-global IPv4 are deliberately unsupported.
  if(u.hostname.startsWith('[')||(isIP(u.hostname)&&!publicIPv4(u.hostname)))throw Error('Portrait URL must point to a public internet image.');
  let records,timer;try{records=await Promise.race([lookup(u.hostname,{family:4,all:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS timeout')),5000);})]);}catch{throw Error('Portrait hostname could not be resolved to a public IPv4 address.');}finally{clearTimeout(timer);}
  if(!records.length||records.some(r=>!publicIPv4(r.address)))throw Error('Portrait hostname resolves to a non-public address.');
  return {url:u,address:records[0].address};
}
export async function downloadPortrait(value,{lookup=dns.lookup,request=https.request}={}){
  let url=value;
  for(let redirects=0;redirects<=2;redirects++){
    const target=await resolvePortraitTarget(url,lookup);
    const result=await new Promise((resolve,reject)=>{
      // Pin the checked address, while preserving hostname/SNI certificate validation.
      const req=request(target.url,{agent:false,lookup:(_host,options,cb)=>options.all?cb(null,[{address:target.address,family:4}]):cb(null,target.address,4),headers:{Accept:'image/png,image/jpeg','User-Agent':'CP-Quote-Renderer/1.0'}},res=>{
        if([301,302,303,307,308].includes(res.statusCode)){res.destroy();resolve({redirect:res.headers.location});return;}
        if(res.statusCode!==200){res.destroy();reject(Error('Portrait URL did not return an image (HTTP '+res.statusCode+').'));return;}
        if(Number(res.headers['content-length'])>MAX_PORTRAIT_BYTES){res.destroy();reject(Error('Portrait exceeds 4 MiB.'));return;}
        const parts=[];let bytes=0;
        res.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_PORTRAIT_BYTES){res.destroy();reject(Error('Portrait exceeds 4 MiB.'));}else parts.push(chunk);});
        res.on('end',()=>resolve({data:Buffer.concat(parts)}));res.on('error',()=>reject(Error('Portrait download failed.')));
      });
      const timer=setTimeout(()=>req.destroy(Error('Portrait download timed out.')),5000);
      req.once('close',()=>clearTimeout(timer));req.once('error',()=>reject(Error('Portrait download failed or timed out.')));req.end();
    });
    if(result.data)return validatePortrait(result.data);
    if(!result.redirect||redirects===2)throw Error('Portrait URL redirects too many times or has no destination.');
    url=new URL(result.redirect,target.url).href;
  }
}
export async function portraitBytes({portraitUrl,portraitData}){
  if(Boolean(portraitUrl)===Boolean(portraitData))throw Error('Supply exactly one of portraitUrl or portraitData.');
  if(portraitUrl)return downloadPortrait(portraitUrl);
  const match=/^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(portraitData);
  if(!match)throw Error('portraitData must be a PNG/JPEG base64 data URI.');
  const data=Buffer.from(match[1],'base64');if(data.toString('base64')!==match[1])throw Error('Invalid portrait base64 encoding.');
  return validatePortrait(data);
}
