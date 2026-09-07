import {auditAssets} from '../src/brand.mjs';
const result=auditAssets();console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
