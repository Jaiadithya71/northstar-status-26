const $ = (tag, cls, text) => { const el = document.createElement(tag); if(cls) el.className=cls; if(text!==undefined) el.textContent=text; return el; };
const appendText=(el,tag,cls,text)=>el.appendChild($(tag,cls,text));
function render(data){
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
