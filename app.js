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
  for(const group of data.groups){ const section=$('section','group'); const heading=$('div','group-head');appendText(heading,'h2','',group.name);section.appendChild(heading);const grid=$('div','grid');
    for(const item of group.items){const article=$('article','item');article.id=item.id;const head=$('div','item-head');appendText(head,'h3','',item.name);appendText(head,'span',`pill ${item.state}`,item.state);article.appendChild(head);
      appendText(article,'p','status',item.status);if(item.detail)appendText(article,'p','detail',item.detail);
      const next=$('p','next');appendText(next,'strong','','Next: ');next.appendChild(document.createTextNode(item.next));article.appendChild(next);
      if(item.due||item.link){const meta=$('div','item-meta');if(item.due)appendText(meta,'span','',item.due);else appendText(meta,'span','','');if(item.link){const a=$('a','',item.linkLabel||'Open');a.href=item.link;a.target='_blank';a.rel='noopener noreferrer';meta.appendChild(a);}article.appendChild(meta);}grid.appendChild(article);
    }
    section.appendChild(grid);groups.appendChild(section);
  }
  document.querySelector('#footer').textContent=data.footer;
}
fetch('data.json',{cache:'no-store'}).then(res=>{if(!res.ok)throw Error('Data unavailable');return res.json()}).then(render).catch(()=>{document.querySelector('#fresh').textContent='Could not load the latest snapshot. Refresh to try again.'});
