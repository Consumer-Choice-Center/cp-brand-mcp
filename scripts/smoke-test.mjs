import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {root} from '../src/brand.mjs';
const client=new Client({name:'cp-smoke',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'src/server.mjs')],cwd:root}));
const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0].text);return JSON.parse(r.content[0].text);};
try {
 const status=await call('get_mcp_status');assert.equal(status.server,'cp-brand-mcp');assert.equal(status.assetHealth.ok,true);
 const list=await client.listTools();assert.equal(list.tools.length,18);assert.ok(list.tools.some(t=>t.name==='create_quote_post'));assert.ok(list.tools.some(t=>t.name==='create_cutout_post'));
 const guidelines=await call('get_brand_guidelines');assert.equal(guidelines.colors.teal,'#1D6379');
 const content=JSON.parse(fs.readFileSync(path.join(root,'examples/one-pager.json'),'utf8'));
 const dynamic={...content,heroImage:undefined,topic:'Retail age verification',centralVisual:{concept:'Adult customer completing an age check at a retail counter'}};
 const plan=await call('create_central_visual_prompt',{content:dynamic});assert.ok(plan.prompt.includes('Retail age verification'));
 const allPrompts=await call('create_one_pager_visual_prompts',{content:dynamic});assert.equal(allPrompts.visuals.length,4);
 const pending=await call('create_one_pager',{content:dynamic});assert.equal(pending.status,'needs_generated_visuals');assert.equal(pending.filePath,undefined);
 assert.equal((await call('qa_one_pager_layout',{content})).ok,true);
 const artifact=await call('create_one_pager',{content,outputFileName:`cp-demo-${Date.now()}.svg`});
 assert.equal((await call('validate_one_pager_file',{filePath:artifact.filePath})).ok,true);
 console.log(JSON.stringify({ok:true,server:status.server,version:status.version,tools:list.tools.map(t=>t.name),artifact},null,2));
} finally {await client.close();}
