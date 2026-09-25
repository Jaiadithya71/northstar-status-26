let currentData;
const progress=(items=[])=>items.length?Math.round(items.reduce((v,x)=>v+({done:1,partial:.5}[x.status]||0),0)/items.length*100):0;
const dayLocal=()=>{const n=new Date();return [n.getFullYear(),String(n.getMonth()+1).padStart(2,'0'),String(n.getDate()).padStart(2,'0')].join('-')};
function renderToday(data){
  const section=document.querySelector('#today');section.replaceChildren();section.hidden=true;
  const today=data.today;if(!today||today.date!==dayLocal())return;
  section.hidden=false;
  const head=$('div','today-head');appendText(head,'span','focus-label','My Day');const count=$('span','count today-count');const updateCount=()=>{const n=Math.max(0,Math.ceil((new Date(data.focus.date).getTime()-Date.now())/86400000));count.textContent=n>0?`${n} day${n===1?'':'s'} to exam`:'Exam day / passed'};updateCount();head.appendChild(count);section.appendChild(head);
  appendText(section,'p','today-date',today.label||today.date);if(today.note)appendText(section,'p','today-note',today.note);
  const items=today.items||[];const pct=progress(items);const bar=$('div','day-meter');bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(pct));appendText(bar,'span','meter-fill','').style.width=pct+'%';section.appendChild(bar);appendText(section,'p','day-score',`${pct}% complete · ${items.filter(x=>x.status==='done').length} done · ${items.filter(x=>x.status==='partial').length} partial · ${items.length} tasks`);
  const list=$('div','today-list');const known=new Set(['pending','in_progress','done','partial','missed']);
  for(const item of items){const status=known.has(item.status)?item.status:'pending';const card=$('details','day-item');
    const summary=$('summary','day-summary');const title=$('div','day-title');appendText(title,'span','day-label',item.label);appendText(title,'span','day-status '+status,status.replace('_',' '));summary.appendChild(title);appendText(summary,'span','day-window',item.window||'');card.appendChild(summary);
    const body=$('div','day-body');if(item.target)appendText(body,'p','day-target',item.target);if(item.progress_text)appendText(body,'p','day-progress',item.progress_text);
    if(item.impact_done||item.impact_skipped){const impacts=$('div','impacts');if(item.impact_done){const done=$('p','impact-done');appendText(done,'strong','','Finish: ');done.appendChild(document.createTextNode(item.impact_done));impacts.appendChild(done)}if(item.impact_skipped){const skipped=$('p','impact-skipped');appendText(skipped,'strong','','Skip: ');skipped.appendChild(document.createTextNode(item.impact_skipped));impacts.appendChild(skipped)}body.appendChild(impacts)}
    const controls=$('div','day-controls');for(const [value,label] of [['done','Done'],['partial','Partial'],['pending','Reset']]){const btn=$('button','day-action',label);btn.type='button';btn.disabled=status===value;btn.addEventListener('click',()=>changeDay({action:'status',id:item.id,status:value}));controls.appendChild(btn)}body.appendChild(controls);card.appendChild(body);list.appendChild(card)}section.appendChild(list);
  const form=$('form','add-task');const input=$('input');input.type='text';input.maxLength=120;input.placeholder='Add a task for today';input.setAttribute('aria-label','New task');input.required=true;const submit=$('button','','Add task');submit.type='submit';form.append(input,submit);form.addEventListener('submit',e=>{e.preventDefault();const label=input.value.trim();if(label)changeDay({action:'add',label})});section.appendChild(form);
  const tools=$('div','day-tools');const msg=$('p','edit-message','Your changes are saved on the server. A PIN is needed to edit; viewers can read.');msg.id='edit-message';tools.appendChild(msg);const archive=$('button','archive-toggle','Past days');archive.type='button';archive.addEventListener('click',()=>{document.querySelector('#archive').hidden=!document.querySelector('#archive').hidden});tools.appendChild(archive);section.appendChild(tools);
}
let editPIN='';let saving=false;
async function changeDay(change){if(saving)return;const pin=editPIN||prompt('Dashboard edit PIN');if(!pin)return;const msg=document.querySelector('#edit-message');saving=true;msg.textContent='Saving...';try{const r=await fetch('/api/day',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...change,date:dayLocal(),pin})});const body=await r.json();if(!r.ok){if(r.status===401)editPIN='';throw Error(body.error||'Save failed')}editPIN=pin;currentData.today=body.today;renderToday(currentData);document.querySelector('#edit-message').textContent='Saved. Changes may take a moment to reach the public snapshot.';if(change.action==='status')document.querySelectorAll('.day-item').forEach(x=>{if(x.querySelector('.day-label')?.textContent===currentData.today.items.find(i=>i.id===change.id)?.label)x.open=true})}catch(err){msg.textContent=err.message+' Refresh to check before retrying.'}finally{saving=false}}
function renderArchive(data){const section=document.querySelector('#archive');section.replaceChildren();const h=$('h2','','Past days');section.appendChild(h);const days=(data.archive||[]).slice().reverse();if(!days.length){appendText(section,'p','archive-empty','No past days yet.');return}for(const day of days){const d=$('details','archive-day');const title=$('summary','',`${day.label||day.date} · ${progress(day.items)}% complete`);d.appendChild(title);for(const item of day.items||[])appendText(d,'p','',`${item.status.replace('_',' ')} · ${item.label}`);section.appendChild(d)}}
const $ = (tag, cls, text) => { const el = document.createElement(tag); if(cls) el.className=cls; if(text!==undefined) el.textContent=text; return el; };
const appendText=(el,tag,cls,text)=>el.appendChild($(tag,cls,text));
function render(data){
  currentData=data;renderToday(data);renderArchive(data);
  document.title=data.title;
  document.querySelector('#title').textContent=data.title;
  document.querySelector('#fresh').textContent=`Updated ${data.updatedLabel}`;
  const focus=document.querySelector('#focus');
  const top=$('div','focus-top'); top.appendChild($('span','focus-label','Top priority')); const counter=$('span','count'); top.appendChild(counter); focus.appendChild(top);
  appendText(focus,'h2','',data.focus.title); appendText(focus,'p','date',data.focus.dateLabel+' · '+data.focus.status); appendText(focus,'p','',data.focus.next);
  const deadline=new Date(data.focus.date).getTime();
  function tick(){const delta=deadline-Date.now();counter.textContent=delta>0?`${Math.ceil(delta/86400000)} day${Math.ceil(delta/86400000)===1?'':'s'} to go`:'Exam day / passed';}
  tick(); setInterval(tick,60000);
  const groups=document.querySelector('#groups');
  const mobile=window.matchMedia('(max-width:660px)');
  const cards=[];
  for(const group of data.groups){ const section=$('section','group'); const heading=$('div','group-head');appendText(heading,'h2','',group.name);section.appendChild(heading);const grid=$('div','grid');
    for(const item of group.items){const card=$('details','item');card.id=item.id;card.open=!mobile.matches;cards.push(card);
      const summary=$('summary','item-summary');const head=$('div','item-head');appendText(head,'h3','',item.name);appendText(head,'span',`pill ${item.state}`,item.state);summary.appendChild(head);appendText(summary,'p','status',item.status);card.appendChild(summary);
      const content=$('div','item-content');if(item.detail)appendText(content,'p','detail',item.detail);
      const next=$('p','next');appendText(next,'strong','','Next: ');next.appendChild(document.createTextNode(item.next));content.appendChild(next);
      if(item.due||item.link){const meta=$('div','item-meta');if(item.due)appendText(meta,'span','',item.due);else appendText(meta,'span','','');if(item.link){const a=$('a','',item.linkLabel||'Open');a.href=item.link;a.target='_blank';a.rel='noopener noreferrer';meta.appendChild(a);}content.appendChild(meta);}card.appendChild(content);grid.appendChild(card);
    }
    section.appendChild(grid);groups.appendChild(section);
  }
  mobile.addEventListener('change',e=>cards.forEach(card=>card.open=!e.matches));
  document.querySelector('#footer').textContent=data.footer;
}
Promise.all([fetch('data.json',{cache:'no-store'}).then(r=>r.json()),fetch('/api/day',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]).then(([data,live])=>{if(live){data.today=live.today;data.archive=live.archive}render(data)}).catch(()=>{document.querySelector('#fresh').textContent='Could not load the latest snapshot. Refresh to try again.'});
