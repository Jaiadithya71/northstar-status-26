function renderToday(data){
  const section=document.querySelector('#today');
  const today=data.today;
  if(!today || !/^\d{4}-\d{2}-\d{2}$/.test(today.date))return;
  // Compare calendar dates in the viewer's own timezone. Never display yesterday's plan.
  const now=new Date();const localDate=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  if(today.date!==localDate)return;
  section.hidden=false;
  const head=$('div','today-head');appendText(head,'span','focus-label','My Day');appendText(head,'span','today-date',today.label||today.date);section.appendChild(head);
  if(today.note)appendText(section,'p','today-note',today.note);
  const list=$('div','today-list');const known=new Set(['pending','in_progress','done','partial','missed']);
  for(const item of (today.items||[])){
    const status=known.has(item.status)?item.status:'pending';const card=$('details','day-item');
    const summary=$('summary','day-summary');const title=$('div','day-title');appendText(title,'span','day-label',item.label);appendText(title,'span','day-status '+status,status.replace('_',' '));summary.appendChild(title);appendText(summary,'span','day-window',item.window||'');card.appendChild(summary);
    const body=$('div','day-body');appendText(body,'p','day-target',item.target||'');if(item.progress_text)appendText(body,'p','day-progress',item.progress_text);
    const impacts=$('div','impacts');const done=$('p','impact-done');appendText(done,'strong','','Finish: ');done.appendChild(document.createTextNode(item.impact_done||''));impacts.appendChild(done);
    const skipped=$('p','impact-skipped');appendText(skipped,'strong','','Skip: ');skipped.appendChild(document.createTextNode(item.impact_skipped||''));impacts.appendChild(skipped);body.appendChild(impacts);card.appendChild(body);list.appendChild(card);
  }
  section.appendChild(list);
}
const $ = (tag, cls, text) => { const el = document.createElement(tag); if(cls) el.className=cls; if(text!==undefined) el.textContent=text; return el; };
const appendText=(el,tag,cls,text)=>el.appendChild($(tag,cls,text));
function render(data){
  renderToday(data);
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
fetch('data.json',{cache:'no-store'}).then(res=>{if(!res.ok)throw Error('Data unavailable');return res.json()}).then(render).catch(()=>{document.querySelector('#fresh').textContent='Could not load the latest snapshot. Refresh to try again.'});
