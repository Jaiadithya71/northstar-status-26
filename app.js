let currentData;
const progress=(items=[])=>items.length?Math.round(items.reduce((v,x)=>v+({done:1,partial:.5}[x.status]||0),0)/items.length*100):0;
const dayLocal=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const views={overview:'Overview',today:'My Day',projects:'Projects',career:'Career + FI',later:'Backlog',personal:'Post-exam chilling',history:'History',shorts:'ReelSaga Shorts'};
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
  currentData=data;navigation();urgency(data);renderToday(data);renderArchive(data);renderShorts(data);renderCareer();
  const page=view();document.title=`${views[page]} · ${data.title}`;
  document.querySelector('#title').textContent=page==='overview'?data.title:views[page];
  document.querySelector('.sub').textContent=({overview:'What matters now. Open a page for the rest.',today:'Today’s plan and saved progress.',projects:'Current work and next steps.',later:'On the list, without crowding today.',personal:'Food, films and friends to unwind this week. Nothing booked yet.',history:'Past My Day plans as they were saved.',shorts:'Shorts performance, with source and read time.',career:'What to do when. Evidence first, options open.'})[page];
  document.querySelector('#fresh').textContent=page==='career'?'Plan set 7 Oct 2026 · targets reviewed annually':`Updated ${data.updatedLabel}`;
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
  for(const section of groups.children){const name=section.querySelector('h2')?.textContent;section.hidden=later?name!=='Backlog':projects?!['Focus projects','New ventures + platform'].includes(name):personal?true:name!=='Focus projects'}
  document.querySelector('#footer').textContent=data.footer;
  if(['overview','today'].includes(page)&&!window.urgencyTimer)window.urgencyTimer=setInterval(()=>urgency(currentData),60000);
}

// Owner's Oct 7, 2026 planning roadmap. Targets are not market forecasts.
function renderCareer(){
  let section=document.querySelector('#career');
  if(!section){section=$('section','career');section.id='career';section.setAttribute('aria-label','Career and financial independence roadmap');document.querySelector('main').appendChild(section)}
  section.replaceChildren();section.hidden=view()!=='career';
  let style=document.querySelector('#career-style');if(!style){style=$('style');style.id='career-style';style.textContent=`
    .career{margin:4px 0 32px}.career h2{font-size:23px;letter-spacing:-.035em;margin:0 0 9px}.career h3{font-size:17px;margin:0 0 7px}.career p{margin:6px 0 10px}.career .focus{margin-bottom:18px}.career .focus h2{font-size:28px}.career .grid{margin-bottom:22px}.career .item{display:block}.career ul{padding-left:19px;margin:9px 0}.career li{margin:7px 0;font-size:14px}.career .career-note{font-size:12px;color:var(--muted)}.career .career-phase{border-left:3px solid var(--line);padding:16px 18px;background:var(--surface);border-radius:0 12px 12px 0;margin:0 0 10px}.career .career-phase:first-child{border-color:var(--accent)}.career .career-time{color:var(--accent);font-size:12px;font-weight:700;margin:0 0 6px}.career .next{margin-top:13px}.career .project-log{margin:12px 0}.career summary{cursor:pointer;color:var(--accent);font-weight:650}.career .career-nav{display:flex;gap:15px;flex-wrap:wrap;margin:16px 0 24px}.career a{color:var(--accent)}.career a:focus-visible,.career summary:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.career section{scroll-margin-top:20px}.career .career-divider{margin:25px 0 12px;border-top:1px solid var(--line);padding-top:20px}
  `;document.head.appendChild(style)}
  const hero=$('div','focus');appendText(hero,'span','focus-label','North star / plan set 7 Oct 2026');appendText(hero,'h2','','₹8 crore by ~2037');
  appendText(hero,'p','','Build a tier-1 AI/ML career and buy the freedom to choose. Geography-agnostic: Tokyo is for exploring, not a constraint. A strong India or remote-global offer remains a real option.');
  appendText(hero,'p','career-note','Aspirational corpus target, not a promised outcome. At 3%, ₹8 crore gives ₹24 lakh/year (₹2 lakh/month) before tax. This is withdrawal arithmetic, not guaranteed perpetual income.');section.appendChild(hero);
  const nav=$('nav','career-nav');nav.setAttribute('aria-label','Roadmap sections');for(const [id,label] of [['career-now','Now'],['career-roadmap','Timeline'],['career-interviews','Interview prep'],['career-money','FI guardrails']]){const a=$('a','',label);a.href='#'+id;nav.appendChild(a)}section.appendChild(nav);
  const now=$('section');now.id='career-now';appendText(now,'h2','','Next 90 days');const grid=$('div','grid');
  for(const [title,body] of [
    ['Daily · 45-60 minutes','Cold, timed LeetCode medium. Explain the approach and tradeoffs out loud in English. Track misses; retry cold later instead of memorising solutions. Keep system design in the weekly rotation.'],
    ['By December 2026','Patent test + ReelSaga: review evidence and decide kill or double down. Avoid letting side projects consume interview readiness.'],
    ['January-February 2027','AWS Machine Learning Associate certification sprint. Check the current exam and eligibility before booking. Keep the daily coding habit alive.'],
    ['Before April 2027','Prepare relocation if taking the Tokyo path. Define one feasible production deliverable and how its users, quality and impact will be measured. Stay open to a strong India offer.']
  ]){const c=$('article','item');appendText(c,'h3','',title);appendText(c,'p','status',body);grid.appendChild(c)}now.appendChild(grid);section.appendChild(now);
  const timeline=$('section');timeline.id='career-roadmap';appendText(timeline,'h2','','The spine: what to do when');appendText(timeline,'p','career-note','Windows are checkpoints, not forced promotions. Compensation and savings below are planning targets. Annual compensation is gross JPY; monthly savings are INR equivalents.');
  const phases=[
    ['Phase 0 · now-Apr 2027','India / Thirdwave remote trainee','Target savings: ₹50,000/month',
     ['Build cold DSA retention, English narration and system design.','Jan-Feb: AWS ML cert. By Dec: patent/ReelSaga decision.'],
     'Gate: repeatable interview performance, not the number of problems solved.'],
    ['Phase 1 · Apr 2027-Apr 2028','Tokyo year 1 / ¥3.6M annual baseline','Target savings: ₹75,000/month',
     ['Ship ONE deliverable with real users. Keep an evidence log: scope, ownership, evals, tracing, reliability and measured impact.','Oct 2027: quiet market test with an updated resume and 2-3 recruiters. Do not enter full loops before evidence exists.'],
     'Gate: a shipped system you can explain and defend, plus a current read of the market.'],
    ['Phase 2 · Apr-Oct 2028','First switch / target ¥7.5-9M','Target savings: ~₹2.4 lakh/month',
     ['Ask referrals first; friends at Amazon and D.E. Shaw can be referral and mock-interview channels.','Batch 10-15 applications in one window so offers can compete. Base targets: PayPay, Mercari, LINE Yahoo. Stretch: Indeed Tokyo, SmartNews, Google/Amazon Tokyo.','Also compare India tier-1 (Amazon, Google, D.E. Shaw, Atlassian) and remote-global opportunities on net savings, role and quality of life.'],
     'Gate: interview-ready evidence and an offer worth switching for. Application count is a process target, not an offer guarantee.'],
    ['Phase 3 · 2030-31','Senior / target ~¥11M','Target savings: ~₹3.5 lakh/month · corpus checkpoint ~₹1.35 crore',
     ['Own an AI system in production end-to-end.','Build depth in serving, evaluation, monitoring, cost and reliability.'],
     'Gate: demonstrated senior-level ownership. Adjust timing if scope or hiring conditions lag.'],
    ['Phase 4 · 2031-33','Staff / tech lead / target ~¥14M','Target savings: ~₹5 lakh/month · corpus checkpoint ~₹3 crore',
     ['Lead an AI product area and raise the performance of other engineers.','Consider a research-heavy or frontier-lab opportunity only if the role and your evidence fit.'],
     'Gate: staff-level scope. ₹3 crore is a checkpoint; whether it is enough for FI depends on your actual spending.'],
    ['Phase 5 · 2033-37','Staff / principal / target ~¥18M + RSUs','Target savings: ~₹6-7 lakh/month · stretch corpus ₹8 crore around 2037',
     ['Build broader technical influence, architecture and durable business impact.','Honest fork: if a business pipeline works, this phase may be your own company rather than the salary ladder.'],
     'Gate: compare the best available career/business path. Do not force a job title or deadline to make the spreadsheet work.']
  ];
  for(const [when,title,money,actions,gate] of phases){const c=$('article','career-phase');appendText(c,'p','career-time',when);appendText(c,'h3','',title);appendText(c,'p','career-note',money);const ul=$('ul');for(const line of actions)appendText(ul,'li','',line);c.appendChild(ul);appendText(c,'p','next',gate);timeline.appendChild(c)}section.appendChild(timeline);
  const interviews=$('section','career-divider');interviews.id='career-interviews';appendText(interviews,'h2','','How tough are the English-first interviews?');
  appendText(interviews,'p','','Treat them as competitive technical interviews, not a shortcut created by Japan\'s talent shortage. Prepare for coding, AI/ML and production-system depth, system design, and behavioural examples in English. The exact rounds and language requirements depend on the employer, team and level.');
  const prep=$('div','grid');for(const [title,body] of [
    ['Cold retention','Practice target: an unseen medium in ~20-25 minutes, then explain complexity, edge cases and alternatives. Use a 45-minute mock so you also have time to test and discuss. This is a training benchmark, not a universal hiring cutoff.'],
    ['English under pressure','Narrate the reasoning as you solve. Ask clarifying questions, explain a dead end, and recover without freezing. Use referral friends for live mocks, not only resume introductions.'],
    ['System design + ML depth','Explain your own shipped system first: data flow, serving, evals, tracing, failure modes, cost and reliability. Then practice designing unfamiliar systems and defending tradeoffs.'],
    ['Check the actual loop','Ask the recruiter for round types, interview language and role expectations. Recruiter screens, coding rounds, design/ML discussions and behavioural interviews may appear in different combinations. Do not assume every firm uses the same loop.']
  ]){const c=$('article','item');appendText(c,'h3','',title);appendText(c,'p','status',body);prep.appendChild(c)}interviews.appendChild(prep);
  appendText(interviews,'p','career-note','400+ past solves are your reported foundation, not proof of cold readiness. No reliable application-to-offer percentage or expected offer count is established for your profile. Referrals help access; they do not waive the bar.');section.appendChild(interviews);
  const money=$('section','career-divider');money.id='career-money';appendText(money,'h2','','Keep the FI math honest');const ul=$('ul');for(const line of [
    '₹8 crore is the aspirational ceiling. Annual reviews should compare actual savings and corpus with the plan, then move the dates if needed.',
    'Do not freeze expenses for a decade. Reprice housing, tax, healthcare, travel and family needs as life changes.',
    'Compare offers on after-tax cash savings, not the logo or gross salary alone. Rupee-equivalent savings also move with exchange rates.',
    'Count RSUs conservatively: vesting, tax and market prices affect what you can actually invest.',
    'A 10% investment return, if used in a model, is an assumption, not a guarantee. Include lower-return and missed-promotion scenarios.',
    'The 3% withdrawal rule needs a spending, inflation, tax and longevity plan. ₹2 lakh/month here is nominal arithmetic, not today\'s purchasing power in 2037.'
  ])appendText(ul,'li','',line);money.appendChild(ul);appendText(money,'p','next','Review at: Dec 2026 side-project decision → Jan-Feb 2027 cert → Oct 2027 market test → Apr-Oct 2028 switch window → annually thereafter.');section.appendChild(money);
  appendText(section,'p','career-note','Plan set from the 7 Oct 2026 discussion. Execution spine finalized; salary, savings and corpus targets remain conditional. This tab does not create calendar reminders or automatically track completion.');
}

Promise.all([fetch('data.json',{cache:'no-store'}).then(r=>r.json()),fetch('/api/day',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]).then(([data,live])=>{if(live){data.today=live.today;data.archive=live.archive}render(data)}).catch(()=>{document.querySelector('#fresh').textContent='Could not load the latest snapshot. Refresh to try again.'});
