import {readFile,writeFile,mkdir,cp,chmod} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
const dependencies=process.env.NEST_DEPENDENCIES;
const require=createRequire(dependencies?join(resolve(dependencies),'_resolver.cjs'):import.meta.url);
const {build}=require('esbuild');
await mkdir('dist/public',{recursive:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['app/entry.tsx'],bundle:true,minify:true,jsx:'automatic',outdir:'dist/public',entryNames:'app',nodePaths:dependencies?[resolve(dependencies)]:[],define:{'process.env.NODE_ENV':'"production"'},target:'es2022',logLevel:'info'});
await cp('index.html','dist/public/index.html');await cp('public/favicon.svg','dist/public/favicon.svg');
await build({entryPoints:['lib/api.ts'],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:'dist/api.mjs'});
const assets={};for(const [file,type] of [['index.html','text/html; charset=utf-8'],['app.js','text/javascript; charset=utf-8'],['app.css','text/css; charset=utf-8'],['favicon.svg','image/svg+xml']]) assets['/'+file]={type,body:await readFile('dist/public/'+file,'utf8')};
await build({stdin:{contents:`import{GET,POST}from'./lib/api.ts';const assets=${JSON.stringify(assets)};export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname==='/api/office')return request.method==='POST'?POST(request,env):GET(request,env);const asset=assets[u.pathname==='/'?'/index.html':u.pathname];return asset?new Response(asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}}`,resolveDir:process.cwd(),sourcefile:'worker.js'},bundle:true,minify:true,format:'esm',platform:'neutral',target:'es2022',outfile:'dist/server/index.js'});
try{await cp('.openai/hosting.json','dist/.openai/hosting.json');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile('dist/.openai/hosting.json',JSON.stringify({d1:'DB',r2:null}));}await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built browser app, local API and Sites Worker.');

await mkdir("dist/preview/cgi-bin",{recursive:true});await cp("dist/public","dist/preview",{recursive:true});await cp("scripts/local-preview.py","dist/preview/cgi-bin/office.py");
const preview=await readFile("index.html","utf8");await writeFile("dist/preview/index.html",preview.replace("</head>",'<meta name="office-api" content="/cgi-bin/office.py"/></head>'));
await chmod("dist/preview/cgi-bin/office.py",0o755);
