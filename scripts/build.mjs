import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const assets={};
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(['server','.openai'].includes(entry.name))continue;const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else assets['/'+path.relative('dist',file).replaceAll('\\','/')]={body:fs.readFileSync(file,'utf8'),type:types[path.extname(file)]||'text/plain; charset=utf-8'};}}
walk('dist');fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('worker/assets.generated.js','export default '+JSON.stringify(assets)+';');
await build({entryPoints:['worker/index.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',minify:true});
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built CityFit Worker with '+Object.keys(assets).length+' static assets.');
