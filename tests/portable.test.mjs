import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const root=path.resolve(import.meta.dirname,'..');
test('public install starts without private fonts, serves rules and blocks rendering',async()=>{
 const client=new Client({name:'cp-portable-test',version:'1.0.0'});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-public-'));
 await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'src/server.mjs')],env:{...process.env,CP_BRAND_FONT_CONFIG:path.join(temp,'missing.json'),CP_BRAND_OUTPUT_DIR:temp}}));
 const call=async(name,args={})=>client.callTool({name,arguments:args});
 try {
  const status=JSON.parse((await call('get_mcp_status')).content[0].text);
  assert.equal(status.server,'cp-brand-mcp');assert.equal(status.assetHealth.ok,false);
  assert.ok(status.assetHealth.violations.some(v=>v.includes('Font configuration unavailable')));
  assert.equal((await client.listTools()).tools.length,9);
  const guide=JSON.parse((await call('get_brand_guidelines')).content[0].text);assert.equal(guide.colors.coral,'#EA5265');
  const content=JSON.parse(fs.readFileSync(path.join(root,'examples/one-pager.json'),'utf8'));
  const plan=JSON.parse((await call('create_one_pager_visual_prompts',{content})).content[0].text);assert.equal(plan.visuals.length,4);
  assert.equal((await call('create_one_pager',{content})).isError,true);
  assert.equal(fs.readdirSync(temp).length,0);
 } finally {await client.close();fs.rmSync(temp,{recursive:true,force:true});}
});
