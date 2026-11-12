import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePortraitTarget,publicIPv4,portraitBytes,validatePortrait} from '../src/portrait-source.mjs';

test('portrait URLs block local targets, credentials, rebinding and non-HTTPS schemes',async()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','172.16.0.1','192.168.1.1','100.100.100.200','0.0.0.0','224.0.0.1'])assert.equal(publicIPv4(ip),false);
  for(const url of ['file:///etc/passwd','http://example.com/a.png','https://127.0.0.1/a','https://[::1]/a','https://user:password@example.com/a','https://example.com:8443/a'])await assert.rejects(resolvePortraitTarget(url));
  await assert.rejects(resolvePortraitTarget('https://public.example/photo',async()=>[{address:'127.0.0.1'}]),/non-public/);
  await assert.rejects(resolvePortraitTarget('https://public.example/photo',async()=>[{address:'8.8.8.8'},{address:'10.0.0.1'}]),/non-public/);
  const target=await resolvePortraitTarget('https://public.example/photo',async()=>[{address:'8.8.8.8'}]);assert.equal(target.address,'8.8.8.8');
});
test('portrait input rejects invalid data, oversize files and dimensions',async()=>{
  await assert.rejects(portraitBytes({}),/exactly one/);
  await assert.rejects(portraitBytes({portraitData:'data:image/svg+xml;base64,AAAA'}),/PNG\/JPEG/);
  await assert.rejects(portraitBytes({portraitData:'data:image/png;base64,AAAA'}));
  assert.throws(()=>validatePortrait(Buffer.alloc(4*1024*1024+1)),/4 MiB/);
  const bomb=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(bomb);bomb.writeUInt32BE(9999,16);bomb.writeUInt32BE(9999,20);assert.throws(()=>validatePortrait(bomb),/4096/);
});

test('image downloader pins checked DNS addresses and rechecks redirects',async()=>{
  const {EventEmitter}=await import('node:events');const {downloadPortrait}=await import('../src/portrait-source.mjs');
  const {Resvg}=await import('@resvg/resvg-js');
  const png=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>').render().asPng();
  let calls=0;
  const request=(url,options,callback)=>{
    calls++;options.lookup(url.hostname,{all:true},(error,addresses)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'8.8.8.8',family:4}]);});assert.equal(options.agent,false);
    const req=new EventEmitter();req.destroy=()=>req.emit('close');
    req.end=()=>queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=200;res.headers={};res.destroy=()=>{};callback(res);res.emit('data',png);res.emit('end');req.emit('close');});return req;
  };
  const data=await downloadPortrait('https://public.example/photo',{lookup:async()=>[{address:'8.8.8.8'}],request});assert.deepEqual(data,png);assert.equal(calls,1);
  const redirect=(url,options,callback)=>{const req=new EventEmitter();req.destroy=()=>req.emit('close');req.end=()=>queueMicrotask(()=>{callback({statusCode:302,headers:{location:'https://127.0.0.1/private'},destroy(){}});req.emit('close');});return req;};
  await assert.rejects(downloadPortrait('https://public.example/photo',{lookup:async()=>[{address:'8.8.8.8'}],request:redirect}),/public internet/);
});
