const crypto = require('node:crypto');
const OWNER='Jaiadithya71', REPO='northstar-status-26', PATH='data.json';
const api=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
const headers=()=>({Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${process.env.GITHUB_DATA_TOKEN}`});
const istDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
const uuid=()=>crypto.randomUUID();
async function current(){const r=await fetch(api,{headers:headers(),cache:'no-store'});if(!r.ok)throw Error(`Repository read failed: ${r.status}`);const file=await r.json();return {data:JSON.parse(Buffer.from(file.content,'base64').toString('utf8')),sha:file.sha};}
function view(data){const day=istDate();return {date:day,today:data.today?.date===day?data.today:null,archive:(data.archive||[]).slice().reverse().map(x=>({date:x.date,label:x.label,items:x.items,note:x.note}))};}
function pinOK(pin){const expected=process.env.DAY_EDIT_PIN||'';if(!expected||typeof pin!=='string')return false;const a=crypto.createHash('sha256').update(pin).digest();const b=crypto.createHash('sha256').update(expected).digest();return crypto.timingSafeEqual(a,b);}
const limit=new Map();
function limited(req){const key=(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const now=Date.now();const v=limit.get(key)||{at:now,n:0};if(now-v.at>15*60*1000){v.at=now;v.n=0}v.n++;limit.set(key,v);return v.n>15;}
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');const send=(code,obj)=>res.status(code).end(JSON.stringify(obj));
 if(!process.env.GITHUB_DATA_TOKEN||!process.env.DAY_EDIT_PIN)return send(503,{error:'Editing is not configured yet.'});
 if(req.method==='GET'){try{return send(200,view((await current()).data))}catch{return send(502,{error:'Could not load day data.'})}}
 if(req.method!=='POST')return send(405,{error:'Method not allowed.'});
 if(Number(req.headers['content-length']||0)>8000)return send(413,{error:'Request too large.'});
 if(limited(req))return send(429,{error:'Too many attempts. Try later.'});
 const origin=req.headers.origin;if(origin&&origin!==`https://${req.headers.host}`)return send(403,{error:'Invalid origin.'});
 const body=req.body||{};if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Invalid request.'});if(!pinOK(body.pin))return send(401,{error:'Incorrect PIN.'});
 if(!['status','add'].includes(body.action)||body.date!==istDate())return send(400,{error:'Refresh the current day.'});
 try{const {data,sha}=await current();if(data.today?.date!==istDate())return send(409,{error:'The day plan is not ready yet. Refresh later.'});const items=data.today.items||[];if(items.length>=60&&body.action==='add')return send(400,{error:'Day list is full.'});
  if(body.action==='status'){if(typeof body.id!=='string')return send(400,{error:'Invalid task ID.'});const item=items.find(x=>x.id===body.id);if(!item||!['pending','in_progress','partial','done','missed'].includes(body.status))return send(400,{error:'Invalid item or status.'});item.status=body.status;item.checked_at=new Date().toISOString()}
  else {const label=typeof body.label==='string'?body.label.trim():'';if(label.length<1||label.length>120)return send(400,{error:'Task name must be 1-120 characters.'});items.push({id:uuid(),label,window:'Added by you',target:'',status:'pending',source:'user',progress_text:'',impact_done:'',impact_skipped:'',created_at:new Date().toISOString()})}
  data.today.items=items;const r=await fetch(api,{method:'PUT',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({message:`Update My Day ${data.today.date}`,content:Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64'),sha})});if(r.status===409)return send(409,{error:'Someone updated the list. Refresh and retry.'});if(!r.ok)throw Error(`Repository write failed: ${r.status}`);return send(200,view(data));
 }catch{return send(502,{error:'Could not save the change. Nothing is confirmed; refresh to check.'})}
};
