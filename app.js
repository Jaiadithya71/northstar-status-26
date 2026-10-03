let currentData;
const progress=(items=[])=>items.length?Math.round(items.reduce((v,x)=>v+({done:1,partial:.5}[x.status]||0),0)/items.length*100):0;
const dayLocal=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const views={overview:'Overview',today:'My Day',projects:'Projects',later:'Backlog',personal:'Post-exam chilling',history:'History',shorts:'ReelSaga Shorts'};
const view=()=>{const q=new URLSearchParams(location.search).get('view');return views[q]?q:'overview'};
const dayEnd=(day)=>new Date(`${day.date}T${day.dayEnd||'22:15'}:00+05:30`).getTime(); // Labeled routine anchor, not a deadline.
const duration=(ms)=>{if(ms<=0)return 'Routine day-end passed';const mins=Math.ceil(ms/60000);return `${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}m left in your planned day`};
function urgency(data){const el=document.querySelector('#urgency');el.replaceChildren();const t=data.today;if(!t||t.date!==dayLocal())return;const active=t.items.filter(i=>!['done','missed'].includes(i.status));const left=appendText(el,'div','urgency-time',duration(dayEnd(t)-Date.now()));left.setAttribute('aria-live','off');appendText(el,'p','urgency-context',`Until ${t.dayEnd||'22:15'} IST (${t.dayEndLabel||'routine, adjustable'}) · ${active.length} open task${active.length===1?'':'s'} of ${t.items.length}. Statuses reflect saved taps; unreported results stay unverified.`);}
function navigation(){const nav=document.querySelector('#view-nav');nav.replaceChildren();nav.setAttribute('aria-label','Dashboard pages');for(const [key,label] of Object.entries(views)){const a=$('a','view-link',label);a.href=key==='overview'?'./':`?view=${key}`;if(view()===key)a.setAttribute('aria-current','page');nav.appendChild(a)}}
const focusCountdown=(deadline)=>{const delta=deadline-Date.now();if(delta<=0)return 'Time passed';if(dayLocal()===new Date(deadline).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}))return 'Today';const n=Math.ceil(delta/86400000);return `${n} day${n===1?'':'s'} to go`};
function renderToday(data){
  const section=document.querySelector('#today');section.replaceChildren();section.hidden=true;
  const today=data.today;if(!today||today.date!==dayLocal())return;
  section.hidden=false;
  const head=$('div','today-head');appendText(head,'span','focus-label','My Day');const count=$('span','count today-count');const updateCount=()=>{count.textContent=focusCountdown(new Date(data.focus.date).getTime())};updateCount();head.appendChild(count);section.appendChild(head);
  appendText(section,'p','today-date',today.label||today.date);if(today.note)appendText(section,'p','today-note',today.note);
  const items=today.items||[];const pct=progress(items);const bar=$('div','day-meter');bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(pct));appendText(bar,'span','meter-fill','').style.width=pct+'%';section.appendChild(bar);appendText(section,'p','day-score',`${pct}% complete · ${items.filter(x=>x.status==='done').length} done · ${items.filter(x=>x.status==='partial').length} partial · ${items.length} tasks`);
  const list=$('div','today-list');const known=new Set(['pending','in_progress','done','partial','missed']);
  for(const item of items){const status=known.has(item.status)?item.status:'pending';const card=$('details','day-item');
    const summary=$('summary','day-summary');const title=$('div','day-title');appendText(title,'span','day-label',item.label);appendText(title,'span','day-status '+status,status.replace('_',' '));summary.appendChild(title);appendText(summary,'span','day-window',item.window||'');card.appendChild(summary);
    const body=$('div','day-body');if(item.projectId){const a=$('a','more-link','Open project log');a.href='?view=projects#'+item.projectId;body.appendChild(a)}if(item.target)appendText(body,'p','day-target',item.target);if(item.progress_text)appendText(body,'p','day-progress',item.progress_text);
    if(item.impact_done||item.impact_skipped){const impacts=$('div','impacts');if(item.impact_done){const done=$('p','impact-done');appendText(done,'strong','','Finish: ');done.appendChild(document.createTextNode(item.impact_done));impacts.appendChild(done)}if(item.impact_skipped){const skipped=$('p','impact-skipped');appendText(skipped,'strong','','Skip: ');skipped.appendChild(document.createTextNode(item.impact_skipped));impacts.appendChild(skipped)}body.appendChild(impacts)}
    const controls=$('div','day-controls');for(const [value,label] of [['done','Done'],['partial','Partial'],['pending','Reset']]){const btn=$('button','day-action',label);btn.type='button';btn.disabled=status===value;btn.addEventListener('click',()=>changeDay({action:'status',id:item.id,status:value}));controls.appendChild(btn)}if(item.source==='user'){const remove=$('button','day-remove','Remove');remove.type='button';remove.addEventListener('click',()=>changeDay({action:'remove',id:item.id}));controls.appendChild(remove)}body.appendChild(controls);card.appendChild(body);list.appendChild(card)}section.appendChild(list);
  const form=$('form','add-task');const input=$('input');input.type='text';input.maxLength=120;input.placeholder='Add a task for today';input.setAttribute('aria-label','New task');input.required=true;const submit=$('button','','Add task');submit.type='submit';form.append(input,submit);form.addEventListener('submit',e=>{e.preventDefault();const label=input.value.trim();if(label)changeDay({action:'add',label})});section.appendChild(form);
  const tools=$('div','day-tools');const msg=$('p','edit-message','Your changes are saved on the server. A PIN is needed to edit; viewers can read.');msg.id='edit-message';tools.appendChild(msg);section.appendChild(tools);
}
let editPIN='',pending=[],timer=null,saving=false;
function changeDay(change){
  if(!editPIN){const pin=prompt('Dashboard edit PIN');if(!pin)return;editPIN=pin}
  if(change.action==='status'){const item=currentData.today.items.find(x=>x.id===change.id);if(!item)return;item.status=change.status}
  else if(change.action==='remove'){currentData.today.items=currentData.today.items.filter(x=>x.id!==change.id)}
  else currentData.today.items.push({id:'pending-'+Date.now()+'-'+Math.random(),label:change.label,window:'Added by you',target:'',status:'pending',source:'user'});
  pending.push(change);render(currentData);document.querySelector('#edit-message').textContent='Saving shortly...';clearTimeout(timer);timer=setTimeout(flushDay,850);
}
async function flushDay(){if(saving||!pending.length)return;saving=true;const changes=pending.splice(0);const msg=document.querySelector('#edit-message');if(msg)msg.textContent='Saving...';
 try{const r=await fetch('/api/day',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes,date:dayLocal(),pin:editPIN})});const body=await r.json();if(!r.ok){if(r.status===401)editPIN='';throw Error(body.error||'Save failed')}
  currentData.today=body.today;currentData.archive=body.archive;
  for(const change of pending){if(change.action==='status'){const item=currentData.today.items.find(x=>x.id===change.id);if(item)item.status=change.status}else if(change.action==='remove')currentData.today.items=currentData.today.items.filter(x=>x.id!==change.id);else currentData.today.items.push({id:'pending-'+Math.random(),label:change.label,window:'Added by you',status:'pending',source:'user'})}
  render(currentData);document.querySelector('#edit-message').textContent=pending.length?'Saving more changes...':'Saved to server.';
 }catch(err){pending=[];const fresh=await fetch('/api/day',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);if(fresh){currentData.today=fresh.today;currentData.archive=fresh.archive;render(currentData)}document.querySelector('#edit-message').textContent=err.message+' Changes were not confirmed. Refresh to check before retrying.'
 }finally{saving=false;if(pending.length){clearTimeout(timer);timer=setTimeout(flushDay,850)}}}
function renderShorts(data){
  const section=document.querySelector('#shorts');section.replaceChildren();const shorts=data.shorts;
  if(!shorts){appendText(section,'p','shorts-note','No Shorts snapshot is available.');return}
  appendText(section,'h2','','ReelSaga Shorts');appendText(section,'p','shorts-source',`${shorts.source} · Checked ${shorts.asOf}`);
  appendText(section,'p','shorts-note',shorts.note);
  const list=$('div','shorts-grid');for(const video of shorts.videos||[]){const card=$('article','shorts-card');appendText(card,'h3','',video.label);
    const metrics=$('div','shorts-metrics');for(const [label,value] of [['Views',video.views],['Likes',video.likes],['Comments',video.comments]]){const metric=$('div','shorts-metric');appendText(metric,'span','shorts-value',value===null||value===undefined?'—':String(value));appendText(metric,'span','shorts-label',label);metrics.appendChild(metric)}card.appendChild(metrics);
    appendText(card,'p','shorts-state',video.visibility);if(video.notice)appendText(card,'p','shorts-notice',video.notice);
    const links=$('div','shorts-links');for(const [label,url] of [['Watch Short',video.url],['Open Studio',video.studioUrl]]){const a=$('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.appendChild(a)}card.appendChild(links);list.appendChild(card)}section.appendChild(list);
}
function renderArchive(data){const section=document.querySelector('#archive');section.replaceChildren();const h=$('h2','','Past days');section.appendChild(h);for(const prior of data.priorDayPlans||[]){const d=$('details','archive-day');d.appendChild($('summary','',prior.plan.label+' · earlier plan'));for(const item of prior.plan.items||[])appendText(d,'p','',item.status.replace('_',' ')+' · '+item.label);section.appendChild(d)}const days=(data.archive||[]);if(!days.length){appendText(section,'p','archive-empty','No past days yet.');return}for(const day of days){const d=$('details','archive-day');const title=$('summary','',`${day.label||day.date} · ${progress(day.items)}% complete`);d.appendChild(title);for(const item of day.items||[])appendText(d,'p','',`${item.status.replace('_',' ')} · ${item.label}`);section.appendChild(d)}}
const $ = (tag, cls, text) => { const el = document.createElement(tag); if(cls) el.className=cls; if(text!==undefined) el.textContent=text; return el; };
const appendText=(el,tag,cls,text)=>el.appendChild($(tag,cls,text));
function render(data){
  currentData=data;navigation();urgency(data);renderToday(data);renderArchive(data);renderShorts(data);
  const page=view();document.title=`${views[page]} · ${data.title}`;
  document.querySelector('#title').textContent=page==='overview'?data.title:views[page];
  document.querySelector('.sub').textContent=({overview:'What matters now. Open a page for the rest.',today:'Today’s plan and saved progress.',projects:'Current work and next steps.',later:'On the list, without crowding today.',personal:'Food, films and friends to unwind this week. Nothing booked yet.',history:'Past My Day plans as they were saved.',shorts:'Shorts performance, with source and read time.'})[page];
  document.querySelector('#fresh').textContent=`Updated ${data.updatedLabel}`;
  const focus=document.querySelector('#focus');focus.replaceChildren();
  const top=$('div','focus-top'); top.appendChild($('span','focus-label','Top priority')); const counter=$('span','count'); top.appendChild(counter); focus.appendChild(top);
  appendText(focus,'h2','',data.focus.title); appendText(focus,'p','date',data.focus.dateLabel+' · '+data.focus.status); appendText(focus,'p','',data.focus.next);
  const deadline=new Date(data.focus.date).getTime();
  function tick(){counter.textContent=focusCountdown(deadline);}
  tick(); clearInterval(window.focusTimer);window.focusTimer=setInterval(tick,60000);
  const groups=document.querySelector('#groups');groups.replaceChildren();
  const mobile=window.matchMedia('(max-width:660px)');
  const cards=[];
  for(const group of data.groups){ const section=$('section','group'); const heading=$('div','group-head');appendText(heading,'h2','',group.name);section.appendChild(heading);const grid=$('div','grid');
    for(const item of group.items){const card=$('details','item');card.id=item.id;card.open=!mobile.matches;cards.push(card);
      const summary=$('summary','item-summary');const head=$('div','item-head');appendText(head,'h3','',item.name);appendText(head,'span',`pill ${item.state}`,item.state);summary.appendChild(head);appendText(summary,'p','status',item.status);card.appendChild(summary);
      const content=$('div','item-content');if(item.detail)appendText(content,'p','detail',item.detail);
      const next=$('p','next');appendText(next,'strong','','Next: ');next.appendChild(document.createTextNode(item.next));content.appendChild(next);
      if(item.focusProject){const log=$('details','project-log');log.appendChild($('summary','','Daily progress · latest first'));const rows=(item.dailyLog||[]).slice();for(const day of [data.today,...(data.archive||[])]){for(const row of day?.items||[]){if(row.projectId===item.id&&row.checked_at)rows.push({at:row.checked_at,source:'Jai · saved check-in',text:row.status.replace('_',' ')})}}rows.sort((a,b)=>b.at.localeCompare(a.at));for(const row of rows){const line=$('p','detail');appendText(line,'strong','',new Date(row.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' IST · '+row.source+' · ');line.appendChild(document.createTextNode(row.text));log.appendChild(line)}content.appendChild(log);if(item.foldedRecords?.length){const history=$('details','project-log');history.appendChild($('summary','','Earlier records'));for(const row of item.foldedRecords)appendText(history,'p','detail',row.name+': '+row.status);content.appendChild(history)}}

      if(item.due||item.link||item.secondaryLink){const meta=$('div','item-meta');if(item.due)appendText(meta,'span','',item.due);else appendText(meta,'span','','');for(const [url,label] of [[item.link,item.linkLabel||'Open'],[item.secondaryLink,item.secondaryLinkLabel||'More details']]){if(url){const a=$('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';meta.appendChild(a);}}content.appendChild(meta);}card.appendChild(content);grid.appendChild(card);
    }
    section.appendChild(grid);groups.appendChild(section);
  }
  if(window.cardLayoutListener)mobile.removeEventListener('change',window.cardLayoutListener);window.cardLayoutListener=e=>cards.forEach(card=>card.open=!e.matches);mobile.addEventListener('change',window.cardLayoutListener);
  const overview=document.querySelector('#overview');overview.replaceChildren();
  if(data.today?.date===dayLocal()){
    const open=data.today.items.filter(i=>!['done','missed'].includes(i.status));
    appendText(overview,'h2','','Still open today');
    if(open.length){for(const item of open.slice(0,3)){const row=$('div','overview-task');appendText(row,'strong','',item.label);appendText(row,'span','',item.window||'');overview.appendChild(row)}}
    else appendText(overview,'p','muted','No open items in My Day.');
    const link=$('a','more-link','Open My Day');link.href='?view=today';overview.appendChild(link);
  }
  const later=page==='later',projects=page==='projects',personal=page==='personal';
  document.querySelector('#today').hidden=page!=='today';
  document.querySelector('#archive').hidden=page!=='history';
  document.querySelector('#shorts').hidden=page!=='shorts';
  document.querySelector('#focus').hidden=page!=='overview';
  overview.hidden=page!=='overview';
  document.querySelector('#urgency').hidden=!['overview','today'].includes(page);
  document.querySelector('#groups').hidden=!projects&&!later&&!personal&&page!=='overview';
  for(const section of groups.children){const name=section.querySelector('h2')?.textContent;section.hidden=later?name!=='Backlog':projects?name!=='Focus projects':personal?true:name!=='Focus projects'}
  document.querySelector('#footer').textContent=data.footer;
  if(['overview','today'].includes(page)&&!window.urgencyTimer)window.urgencyTimer=setInterval(()=>urgency(currentData),60000);
}
Promise.all([fetch('data.json',{cache:'no-store'}).then(r=>r.json()),fetch('/api/day',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]).then(([data,live])=>{if(live){data.today=live.today;data.archive=live.archive}render(data)}).catch(()=>{document.querySelector('#fresh').textContent='Could not load the latest snapshot. Refresh to try again.'});
