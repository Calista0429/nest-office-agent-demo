import {GET,POST} from '../dist/api.mjs';
import {DB} from '../local-db.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {method,query,body}=JSON.parse(input);
const req=new Request('http://127.0.0.1:4173/api/office'+(query?'?'+query:''),{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body}:{})});
const res=await(method==='POST'?POST:GET)(req,{DB});process.stdout.write(await res.text());
