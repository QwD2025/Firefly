const $=id=>document.getElementById(id);
let chapters=[],current=0,translation=true,size=21,timer;
const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
function show(index,restore=false){
 current=index;const c=chapters[index];if(!c)return;
 const a=$('article');a.replaceChildren(el('div',`第 ${c.number} 章${c.date?' / '+c.date:''}`,'meta'),el('h2',c.title),el('p',c.subtitle,'subtitle'));
 const words=new Map((c.words||[]).map(w=>[w.word.toLowerCase(),w]));
 for(const p of c.paragraphs){const section=el('section','');const en=el('p','','en');en.lang='en';
  for(const part of p.en.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g)){const w=words.get(part.toLowerCase());if(w){const b=el('button',part,'word');b.onclick=()=>{$('word-title').textContent=w.word;$('word-meaning').textContent=w.meaning||'本章目标词，释义待补充';$('word-dialog').showModal()};en.append(b)}else en.append(document.createTextNode(part))}
  section.append(en,el('p',p.zh,'zh'));a.append(section);
 }
 $('chapter-label').textContent=`第 ${c.number} 章`;$('prev').disabled=index===0;$('next').disabled=index===chapters.length-1;
 [...$('chapters').children].forEach((b,i)=>b.classList.toggle('active',i===index));
 history.replaceState(null,'',`#${encodeURIComponent(c.id)}`);save('momo-chapter',c.id);document.title=c.title+' · 第七个约定';
 if(restore){document.body.classList.add('reading');requestAnimationFrame(()=>window.scrollTo(0,Number(read('momo-position-'+c.id))||0))}
}
$('translate').onclick=()=>{translation=!translation;document.body.classList.toggle('hide-zh',!translation);$('translate').textContent=translation?'中文已展开':'显示中文';$('translate').setAttribute('aria-pressed',String(translation));save('momo-translation',String(translation))};
function font(delta){size=Math.min(28,Math.max(16,size+delta));document.documentElement.style.setProperty('--size',size+'px');save('momo-size',String(size))}
$('smaller').onclick=()=>font(-1);$('larger').onclick=()=>font(1);
$('close-dialog').onclick=()=>$('word-dialog').close();$('word-dialog').onclick=e=>{if(e.target===$('word-dialog'))$('word-dialog').close()};
const themeButton=$('theme'),themeMeta=document.querySelector('meta[name="theme-color"]'),systemTheme=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
let themePinned=read('momo-theme')==='dark'||read('momo-theme')==='light';
function applyTheme(value){document.documentElement.dataset.theme=value;themeButton.textContent=value==='dark'?'日间':'夜间';themeButton.setAttribute('aria-pressed',String(value==='dark'));if(themeMeta)themeMeta.content=value==='dark'?'#10161a':'#eef2f5'}
themeButton.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';themePinned=true;save('momo-theme',next);applyTheme(next)};
applyTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');
systemTheme?.addEventListener?.('change',e=>{if(!themePinned)applyTheme(e.matches?'dark':'light')});
$('directory').onclick=()=>{document.body.classList.toggle('show-directory');if(document.body.classList.contains('show-directory'))window.scrollTo({top:0,behavior:'smooth'})};
function navigate(i){show(i);document.body.classList.add('reading');document.body.classList.remove('show-directory');$('article').scrollIntoView({block:'start'})}
$('continue').onclick=()=>navigate(current);$('prev').onclick=()=>navigate(current-1);$('next').onclick=()=>navigate(current+1);
window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(chapters[current])save('momo-position-'+chapters[current].id,String(scrollY))},200)},{passive:true});
fetch('/chapters.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
 chapters=data.chapters;if(!chapters.length)throw Error();
 chapters.forEach((c,i)=>{const b=el('button','');b.append(el('small',`第 ${c.number} 章`),document.createTextNode(c.subtitle));b.onclick=()=>navigate(i);$('chapters').append(b)});
 size=Number(read('momo-size'))||21;font(0);if(read('momo-translation')==='false')$('translate').click();
 const id=decodeURIComponent(location.hash.slice(1))||read('momo-chapter');const idx=chapters.findIndex(c=>c.id===id);show(Math.max(0,idx),idx>=0);if(idx>=0)$('continue').textContent='继续阅读';
}).catch(()=>{$('status').textContent='章节暂时没有加载成功，请刷新后重试。';$('article').replaceChildren();$('continue').disabled=true;$('prev').disabled=true;$('next').disabled=true});
