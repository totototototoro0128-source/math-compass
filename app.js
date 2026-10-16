(()=>{
'use strict';
const UNITS=window.MATH_CURRICULUM||[],QUESTIONS=window.MATH_QUESTIONS||[];
const KEYS={new:'math-compass-family-2026-v2',old:'math-compass-family-2026-v1'};
const qMap=new Map(QUESTIONS.map(q=>[q.id,q]));const unitMap=new Map(UNITS.map(u=>[u.id,u]));
const $=id=>document.getElementById(id);
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=86400000;const now=()=>Date.now();
const defaultState=()=>({schema:2,profiles:[{id:'p1',name:'学習者1',grade:1}],active:'p1',records:{p1:{}},tests:{p1:[]}});
function safeParse(x){try{return JSON.parse(x)}catch{return null}}
function sanitizeImported(raw){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.profiles)||raw.profiles.length<1||raw.profiles.length>6)throw Error('学習者データの形式を確認してください。');
  const p=raw.profiles.slice(0,6).map((o,i)=>({id:String(o.id??`p${i+1}`).slice(0,80),name:String(o.name??`学習者${i+1}`).slice(0,16),grade:[1,2,3].includes(+o.grade)?+o.grade:1}));
  if(new Set(p.map(x=>x.id)).size!==p.length)throw Error('学習者IDに重複があります。');
  const s={schema:2,profiles:p,active:p.some(x=>x.id===raw.active)?raw.active:p[0].id,records:{},tests:{}};
  p.forEach(pro=>{s.records[pro.id]={};s.tests[pro.id]=[];
    const source=raw.records?.[pro.id]??{};
    if(source&&typeof source==='object')Object.entries(source).slice(0,1500).forEach(([id,r])=>{
      if(!qMap.has(id)||!r||typeof r!=='object')return;
      s.records[pro.id][id]={seen:Math.min(10000,Math.max(0,Math.floor(+r.seen||0))),wins:Math.min(10000,Math.max(0,Math.floor(+r.wins||0))),streak:Math.min(20,Math.max(0,Math.floor(+r.streak||0))),last:Math.max(0,+r.last||0),due:Math.max(0,+r.due||0),best:!!r.best,assisted:!!r.assisted,wrong:Math.max(0,+r.wrong||0)};
    });
    if(Array.isArray(raw.tests?.[pro.id]))s.tests[pro.id]=raw.tests[pro.id].slice(-100).map(t=>({date:+t.date||0,correct:Math.max(0,+t.correct||0),total:Math.max(0,+t.total||0),label:String(t.label||'テスト').slice(0,80)}));
  });return s;
}
function migrateLegacy(old){
 const d=defaultState();if(!old||!Array.isArray(old.profiles))return d;
 const users=old.profiles.slice(0,6);if(!users.length)return d;
 d.profiles=users.map((p,i)=>({id:String(p.id||`p${i+1}`),name:String(p.name||`学習者${i+1}`).slice(0,16),grade:1}));
 d.active=d.profiles.some(p=>p.id===old.activeProfileId)?old.activeProfileId:d.profiles[0].id;
 d.records={};d.tests={};
 d.profiles.forEach(p=>{d.records[p.id]={};d.tests[p.id]=[];Object.entries(old.results?.[p.id]||{}).forEach(([id,r])=>{
  if(!qMap.has(id)||!r)return;
  d.records[p.id][id]={seen:1,wins:r.correct?1:0,streak:r.correct?1:0,last:now(),due:now()+(r.correct?day:0),best:!!(r.correct&&r.attempts===1&&r.hints===0&&!r.revealed),assisted:!!(r.correct&&(r.hints||r.attempts>1||r.revealed)),wrong:r.correct?0:1};
 });});return d;
}
let storageWarning=false;
function load(){try{const n=safeParse(localStorage.getItem(KEYS.new));if(n)return sanitizeImported(n);const old=safeParse(localStorage.getItem(KEYS.old));if(old){const m=migrateLegacy(old);localStorage.setItem(KEYS.new,JSON.stringify(m));return m}}catch(e){storageWarning=true}return defaultState()}
let state=load();let screen='home',grade=1,unitId='g1-01',level=0,session=null,notice='',marker=-3;
const profile=()=>state.profiles.find(x=>x.id===state.active)||state.profiles[0];
const records=()=>state.records[state.active]||(state.records[state.active]={});
const tests=()=>state.tests[state.active]||(state.tests[state.active]=[]);
function save(){try{localStorage.setItem(KEYS.new,JSON.stringify(state));storageWarning=false}catch{storageWarning=true}}
function labelGrade(g){return `中学${g}年`}
function qsOf(u){return QUESTIONS.filter(q=>q.unit===u)}
function rec(id){return records()[id]}
function attempted(u){return qsOf(u).filter(q=>rec(q.id)).length}
function strong(u){return qsOf(u).filter(q=>rec(q.id)?.best).length}
function dueQs(g){return QUESTIONS.filter(q=>(!g||unitMap.get(q.unit)?.grade===g)&&rec(q.id)&&rec(q.id).due<=now())}
function stats(){const rs=records();const ids=Object.keys(rs).filter(id=>qMap.has(id));return {seen:ids.length,strong:ids.filter(id=>rs[id].best).length,due:dueQs().length,tests:tests().length}}
function button(label,act,cl='primary',more=''){return `<button class="btn ${cl}" type="button" data-act="${act}" ${more}>${html(label)}</button>`}
function header(title,sub=''){return `<div style="margin:3px 1px 19px"><div class="kicker">数学コンパス ／ ${labelGrade(profile().grade)}</div><h1 style="font-size:24px;margin:3px 0">${html(title)}</h1>${sub?`<p class="muted small">${html(sub)}</p>`:''}</div>`}
function progress(a,total){return `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${a}"><i style="width:${total?Math.min(100,Math.round(a/total*100)):0}%"></i></div>`}
function banner(){return `${storageWarning?'<div class="notice">このブラウザーでは学習記録を保存できない可能性があります。「設定」でバックアップしてください。</div>':''}${notice?`<div class="feedback info">${html(notice)}</div>`:''}`}
function home(){const s=stats();const p=profile();const pending=dueQs(p.grade).length;
 return `<section class="hero"><small>HELLO, ${html(p.name)}</small><h1>今日もひとつ、<br>「できた！」を増やそう。</h1><p>中学3年間の数学を、自分のペースで学ぼう。</p></section>
 <div class="section-title"><h2>学習ダッシュボード</h2><span class="muted small">この端末の記録</span></div>
 <div class="card"><div class="grid-3"><div class="metric"><b>${s.seen}</b><small>学習済みの問題</small></div><div class="metric"><b>${s.strong}</b><small>ヒントなし正解</small></div><div class="metric"><b>${s.due}</b><small>復習の対象</small></div></div><div class="divider"></div><div class="row between"><b>${labelGrade(p.grade)}の教材</b><span class="small muted">${QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===p.grade).length}問</span></div>${progress(UNITS.filter(u=>u.grade===p.grade).reduce((n,u)=>n+attempted(u.id),0),QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===p.grade).length)}</div>
 <div class="section-title"><h2>今日のおすすめ</h2></div>
 <div class="grid-2 home-actions"><div class="card feature"><span class="feature-icon">✎</span><div><h3>今日の10問</h3><p>復習と新しい問題を組み合わせて出題</p>${button('学習する','daily','primary')}</div></div><div class="card feature"><span class="feature-icon">↺</span><div><h3>苦手を復習</h3><p>${pending}問の復習候補があります</p>${button('復習する','review','soft')}</div></div></div>
 <div class="section-title"><h2>単元を選んで学ぶ</h2>${button('すべて見る','course','ghost sm')}</div>
 <div class="card">${UNITS.filter(u=>u.grade===p.grade).slice(0,4).map(u=>unitLine(u)).join('')}</div>
 <div class="section-title"><h2>親子で使うポイント</h2></div><div class="quiet">「答えが出たか」だけでなく、「ヒントなしで自分の言葉で説明できたか」を確認しましょう。間違いは、苦手を見つけるための大切な情報です。</div>
 <div style="margin-top:14px">${banner()}</div>`}
function unitLine(u){const count=qsOf(u.id).length,a=attempted(u.id);return `<div class="unit-card"><div class="unit-index">${String(u.grade)}-${u.order+1-UNITS.findIndex(z=>z.grade===u.grade)}</div><div class="unit-detail"><strong>${html(u.name)}</strong><small>${html(u.topics.slice(0,3).join(' ／ '))}</small><div class="row" style="gap:7px">${progress(a,count)}<small style="white-space:nowrap">${a}/${count}問</small></div></div><button type="button" data-unit="${u.id}">開く</button></div>`}
function course(){const items=UNITS.filter(u=>u.grade===grade);return `${header('単元一覧','22大単元から学びたい内容を選べます。各単元に基本演習を収録。')}
 <div class="grid-3" style="gap:8px;margin-bottom:16px">${[1,2,3].map(g=>`<button data-grade="${g}" type="button" class="pill ${grade===g?'active':''}">中学${g}年（${UNITS.filter(u=>u.grade===g).length}単元）</button>`).join('')}</div>
 <div class="card">${items.map(u=>unitLine(u)).join('')}</div><p class="small muted">※ 図形の作図、証明の記述、複雑なグラフ問題は拡張予定です。現版は基本事項・基本演習を中心に収録しています。</p>`}
const SIGN_GUIDE=[
 ['1. 正の数・負の数','0より大きい数は正、0より小さい数は負。0には符号がありません。','気温が−2℃から5℃に上がると、7℃上昇します。'],
 ['2. 数直線と大小','数直線は右ほど大きな数です。負の数では−2＞−5です。','−2は−5より0に近く、右にあります。'],
 ['3. 絶対値','絶対値は0からの距離です。負号を外して考えます。','|−7|＝7、|＋4|＝4。'],
 ['4. 同符号の加法','同じ符号の数を足すとき、絶対値を足して同じ符号を付けます。','(−4)＋(−6)＝−10。'],
 ['5. 異符号の加法','符号が異なるとき、絶対値の差を取り、絶対値が大きい方の符号を付けます。','(−8)＋(+11)＝+3。'],
 ['6. 減法','引く数を「反対の数」に変えて足し算にします。','(−3)−(−8)＝(−3)＋(+8)＝5。'],
 ['7. 乗法と除法','同符号どうしは正、異符号どうしは負です。0で割ることはできません。','(−6)×(−2)＝12、(+20)÷(−5)＝−4。'],
 ['8. 累乗と四則の混合','(−3)²＝9 と −3²＝−9 は異なります。かっこ、累乗、乗除、加減の順に解きます。','−2²＋3×4＝−4＋12＝8。']
];
function numberLine(){const ticks=Array.from({length:21},(_,i)=>i-10).map(n=>{
 const x=25+(n+10)*19.5;return `<line x1="${x}" x2="${x}" y1="58" y2="69" stroke="#8b819e" stroke-width="1.3"/>${n%2===0?`<text x="${x}" y="83" text-anchor="middle" fill="#786a98" font-size="10">${n}</text>`:''}`}).join('');
 const mx=25+(marker+10)*19.5;return `<div class="card" style="margin-top:13px"><div class="row between"><h3>数直線を動かしてみよう</h3><span class="tag">体験授業</span></div><p class="small muted">右へ進むと数が大きくなり、左へ進むと小さくなります。</p><svg viewBox="0 0 440 100" style="width:100%;height:auto" role="img" aria-label="−10から10までの数直線。現在は${marker}"><line x1="15" y1="64" x2="428" y2="64" stroke="#8c7bbb" stroke-width="2"/><path d="M428 64 L419 60 M428 64 L419 68" stroke="#8c7bbb" fill="none" stroke-width="2"/>${ticks}<circle cx="${mx}" cy="64" r="7" fill="#7056c4" stroke="white" stroke-width="2"/><text x="${mx}" y="45" text-anchor="middle" font-weight="800" font-size="18" fill="#5544ab">${marker}</text></svg><div class="row" style="justify-content:center">${button('← −1','number-left','soft sm',marker<=-10?'disabled':'')}${button('0に戻す','number-reset','ghost sm')}${button('+1 →','number-right','soft sm',marker>=10?'disabled':'')}</div><p class="small muted" style="text-align:center">${marker===0?'0は正でも負でもありません。':marker<0?'現在は負の数です。0より左にあります。':'現在は正の数です。0より右にあります。'}</p></div>`}
function signGuide(){return `<div class="card" style="margin-top:13px"><h2>正負の数・8つのミニ授業</h2><div class="teach-tip">${SIGN_GUIDE.map(([title,body,ex])=>`<details style="padding:9px 0;border-bottom:1px solid var(--border)"><summary style="font-weight:800;cursor:pointer">${html(title)}</summary><p>${html(body)}</p><div class="quiet">例：${html(ex)}</div></details>`).join('')}</div></div>`}
function lesson(){const u=unitMap.get(unitId);if(!u)return home();const qs=qsOf(u.id);const counts=[1,2,3,4,5].map(x=>qs.filter(q=>q.level===x).length);
 return `${header(u.name,`中学${u.grade}年／${u.topics.join('・')}`)}
 <div class="panels"><div><div class="card"><div class="row between"><h2>まずは大切なルール</h2><span class="tag">授業</span></div>${u.rules.map((r,i)=>`<div class="lesson-rule"><span class="num">${i+1}</span>${html(r)}</div>`).join('')}<h3 style="margin:19px 0 9px">例題を見てみよう</h3><div class="formula">${html(u.example)}</div><div class="quiet" style="margin-top:14px">公式だけ覚えるのではなく、「どうしてこの計算になるのか」を声に出してみよう。</div></div>${u.id==='g1-01'?numberLine()+signGuide():''}</div>
 <div><div class="card"><div class="row between"><h2>練習問題</h2><span class="tag">${qs.length}問</span></div><p class="small muted">難易度別に問題を選べます。3段階ヒントと解説つき。</p><div class="tab-chips" style="margin:15px 0">${counts.map((c,i)=>`<button type="button" class="pill ${level===i+1?'active':''}" data-level="${i+1}" ${c?'':'disabled'}>Lv.${i+1} ${c}問</button>`).join('')}</div><div class="row wrap">${button('全レベルから練習','unit-all','primary')}${button('選んだレベルで練習','unit-level','soft',level?'':'disabled')}</div>${progress(attempted(unitId),qs.length)}<p class="small muted">${attempted(unitId)} / ${qs.length} 問に取り組みました</p></div><div class="card" style="margin-top:13px"><h3>この単元の範囲</h3><div class="teach-tip">${u.topics.map((t,i)=>`<div>${i+1}. ${html(t)}</div>`).join('')}</div></div></div></div>`}
function order(list){const arr=list.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function start(mode,u=null,lv=0){let pool=[];const g=profile().grade;
 if(mode==='unit'){const candidates=QUESTIONS.filter(q=>q.unit===u&&(!lv||q.level===lv));const newer=candidates.filter(q=>!rec(q.id)).sort((a,b)=>a.level-b.level);const repeat=candidates.filter(q=>rec(q.id));pool=newer.concat(order(repeat)).slice(0,10);}
 if(mode==='review'){pool=order(dueQs(g));if(!pool.length)pool=order(QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===g&&rec(q.id)&&!rec(q.id).best));pool=pool.slice(0,10);}
 if(mode==='daily'){
   const due=order(dueQs(g)).slice(0,7),chosen=new Set(due.map(q=>q.id));
   const untouched=order(QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===g&&!rec(q.id)&&!chosen.has(q.id))).sort((a,b)=>unitMap.get(a.unit).order-unitMap.get(b.unit).order||a.level-b.level);
   pool=due.concat(untouched.slice(0,10-due.length));
   if(pool.length<10)pool.push(...order(QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===g&&!chosen.has(q.id)&&!pool.some(x=>x.id===q.id))).slice(0,10-pool.length));
 }
 if(mode==='test'){
   const source=u?QUESTIONS.filter(q=>q.unit===u):QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===g);
   pool=order(source).slice(0,Math.min(u?10:15,source.length));
 }
 if(!pool.length){notice='対象の問題がありません。単元から練習を始めてください。';screen=mode==='review'?'review':'course';render();return}
 session={mode,unit:u||'',questions:pool.map(q=>q.id),index:0,answer:'',hints:0,tries:0,completed:false,correct:false,gaveUp:false,feedback:'',results:[],finished:false};screen='practice';notice='';render();}
function current(){return qMap.get(session?.questions[session?.index])}
function compare(input,answer){
 if(typeof answer==='string'&&!/^[-+]?\d+(\.\d+)?(\/\d+)?$/.test(answer))return String(input).trim().replace(/\s/g,'')===answer.replace(/\s/g,'');
 const norm=x=>String(x).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/．/g,'.').replace(/−|－|ー|–/g,'-').replace(/＋/g,'+').replace(/，/g,',').replace(/\s/g,'').replace(/(度|°|cm³|cm²|cm|%|％)$/g,'').replace(/,/g,'');
 const number=x=>{const s=norm(x);if(/^[-+]?\d+(?:\.\d+)?$/.test(s))return +s;const m=s.match(/^([-+]?\d+)\/([-+]?\d+)$/);if(m&&+m[2]!==0)return +m[1]/+m[2];return NaN};
 const a=number(input),b=number(answer);return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8;
}
function record(q,correct,assisted){const rs=records(),r=rs[q.id]||{seen:0,wins:0,streak:0,wrong:0,best:false,assisted:false};r.seen++;r.last=now();
 if(correct){r.wins++;r.streak=assisted?0:r.streak+1;r.assisted=!!assisted;r.best=r.best||!assisted;const d=assisted?1:[1,3,7,14,30,60][Math.min(5,Math.max(0,r.streak-1))];r.due=now()+d*day}
 else{r.wrong++;r.streak=0;r.due=now()+4*3600000}
 rs[q.id]=r;save();}
function finishAnswer(giveUp=false){if(!session||session.completed||session.mode==='test')return;const q=current();if(giveUp){session.gaveUp=true;session.completed=true;session.feedback='解説を見て、次回もう一度チャレンジしよう。';record(q,false,true);session.results.push({id:q.id,correct:false});render();return}
 if(!String(session.answer).trim()){session.feedback='答えを入力・選択してください。';render();return}
 session.tries++;const correct=compare(session.answer,q.answer);
 if(correct){session.completed=true;session.correct=true;session.feedback=session.tries===1&&session.hints===0?'すばらしい！ ヒントなしで正解です。':'正解！ 考え方を確認してから次へ進もう。';record(q,true,session.tries>1||session.hints>0);session.results.push({id:q.id,correct:true});}
 else{session.feedback='もう一度考えてみよう。必要ならヒントを開いてね。';record(q,false,true)}
 render();}
function finishTestAnswer(skip=false){if(!session||session.mode!=='test'||session.completed)return;const q=current();if(!skip&&!String(session.answer).trim()){session.feedback='解答を選ぶか入力してください。';render();return}
 const answer=String(session.answer).trim();const correct=!skip&&compare(answer,q.answer);record(q,correct,false);session.results.push({id:q.id,correct,answer:skip?'未回答':answer});
 session.completed=true;session.feedback='回答を記録しました。結果はテスト終了後に確認できます。';render();}
function next(){if(!session||!session.completed)return;if(session.index+1>=session.questions.length){session.finished=true;if(session.mode==='test'){const correct=session.results.filter(x=>x.correct).length;tests().push({date:now(),correct,total:session.questions.length,label:session.unit?(unitMap.get(session.unit)?.name||'単元テスト'):`${labelGrade(profile().grade)} 総合テスト`});state.tests[state.active]=tests().slice(-100);save()}screen='result';render();return}session.index++;session.answer='';session.hints=0;session.tries=0;session.completed=false;session.correct=false;session.gaveUp=false;session.feedback='';render();}
function questionView(){const s=session;if(!s)return home();const q=current();const u=unitMap.get(q.unit);const isTest=s.mode==='test';const complete=s.completed;
 const tag={test:'ミニテスト',review:'復習',daily:'今日の10問',unit:'単元演習'}[s.mode];
 return `<div class="row between wrap" style="margin-bottom:12px">${button('← 学習を終える','quit','ghost sm')}<span class="tag">${tag}</span></div>
 <div class="row between" style="margin-bottom:8px"><strong>${html(u.name)}</strong><span class="muted small">${s.index+1} / ${s.questions.length}問</span></div>${progress(s.index+1,s.questions.length)}
 <div class="question-card" style="margin-top:18px"><div class="question-meta"><span class="tag gray">難易度 Lv.${q.level}</span><span class="small muted">${html(q.skill||'基本問題')}</span></div>
 <div class="math-prompt">${html(q.prompt)}</div>
 ${q.format==='choice'?`<div class="stack" role="radiogroup" aria-label="答えを選んでください">${q.choices.map((o,i)=>`<button type="button" role="radio" aria-checked="${s.answer===o}" class="choice ${s.answer===o?'selected':''}" data-choice="${i}" ${complete?'disabled':''}>${String.fromCharCode(65+i)}. ${html(o)}</button>`).join('')}</div>`:
 `<label for="answer" class="small" style="display:block;font-weight:750;margin-bottom:7px">答えを入力</label><input class="answer-input" id="answer" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="例：−7 または 1/2" value="${html(s.answer)}" ${complete?'disabled':''}>
 <div class="keypad" aria-label="数字キー">${['7','8','9','⌫','4','5','6','−','1','2','3','/','0','.','＋','C'].map(k=>`<button type="button" data-key="${k}" class="${['⌫','−','/','＋','C'].includes(k)?'special':''}" ${complete?'disabled':''}>${k}</button>`).join('')}</div>`}
 ${s.feedback?`<div class="feedback ${complete?(s.correct?'good':'info'):'error'}" role="status">${html(s.feedback)}</div>`:''}
 ${!complete?`<div class="row wrap" style="margin-top:14px">${button(isTest?'回答を確定':'答え合わせ','submit','primary')}${!isTest?button(`ヒント ${s.hints}/3`,'hint','soft',s.hints>=3?'disabled':''):''}${isTest?button('パスする','skip','ghost'):button('解説を見る','giveup','ghost')}</div>`:button(s.index+1<s.questions.length?'次の問題 →':'結果を見る','next','primary block')}
 </div>
 ${!isTest?Array.from({length:s.hints},(_,i)=>`<div class="hint"><strong>ヒント ${i+1}</strong><div>${html(q.hints[i])}</div></div>`).join(''):''}
 ${!isTest&&complete?`<div class="explain"><strong>先生の解説</strong><pre>${html(q.explain)}</pre><p style="margin:10px 0 0;font-weight:800">答え：${html(q.answer)}</p></div>`:''}
 ${isTest?'<p class="small muted">テスト中はヒントと正解を表示しません。全問終了後に解説を確認できます。</p>':'<p class="small muted">式の入力は整数・小数・分数に対応します。記号を含む式は選択式で出題しています。</p>'}`;}
function resultsView(){const s=session;if(!s||!s.finished)return home();const total=s.questions.length,correct=s.results.filter(x=>x.correct).length,rate=Math.round(correct/total*100);
 return `${header(s.mode==='test'?'テスト結果':'学習結果','今日もお疲れさまでした。できたことを確認しよう。')}
 <div class="card"><p class="muted" style="text-align:center">${s.mode==='test'?'正答率':'今回の最終正解率'}</p><div class="score-big">${rate}%</div><p style="text-align:center;font-weight:750">${correct} / ${total}問 正解</p>${progress(correct,total)}<p style="text-align:center" class="small muted">${rate===100?'全問正解！':rate>=70?'よく取り組みました！':'間違えた問題を復習してみよう。'}</p></div>
 <div class="section-title"><h2>一問ずつ振り返り</h2></div><div class="card">${s.results.map((r,i)=>{const q=qMap.get(r.id);return `<div class="line"><div class="row between"><b>第${i+1}問 ${html(unitMap.get(q.unit)?.name||'')}</b><span class="tag ${r.correct?'success':'warn'}">${r.correct?'正解':'要復習'}</span></div><div class="small">${html(q.prompt)}</div><div class="small muted">答え：${html(q.answer)}</div><div class="small muted" style="white-space:pre-wrap">${html(q.explain)}</div></div>`}).join('')}</div><div class="row wrap" style="margin-top:16px">${button('ホームへ戻る','home','primary')}${button('復習する','review','soft')}</div>`}
function review(){const g=profile().grade,d=dueQs(g),all=dueQs();const weak=QUESTIONS.filter(q=>unitMap.get(q.unit)?.grade===g&&rec(q.id)&&!rec(q.id).best);
 return `${header('復習ノート','間違えた問題、ヒントを使った問題を中心にもう一度。')}
 <div class="grid-3"><div class="metric"><b>${d.length}</b><small>この学年の復習対象</small></div><div class="metric"><b>${weak.length}</b><small>要練習の問題</small></div><div class="metric"><b>${all.length}</b><small>全学年の復習対象</small></div></div>
 <div class="card" style="margin-top:15px"><h3>復習の仕組み</h3><p class="small muted">ヒントなしで正解した問題は1・3・7・14日…と間隔を広げて再出題します。不正解の問題は約4時間後に候補へ戻ります。</p>${button('復習を始める','review-start','primary block','')}<p class="tiny muted">復習時期の問題がなければ、まだヒントなしで解けていない問題から選びます。</p></div>
 <div class="section-title"><h2>復習が必要な単元</h2></div><div class="card">${UNITS.filter(u=>u.grade===g).map(u=>({u,items:weak.filter(q=>q.unit===u.id)})).filter(x=>x.items.length).sort((a,b)=>b.items.length-a.items.length).map(({u,items})=>`<div class="row between line"><strong>${html(u.name)}</strong><span class="tag warn">${items.length}問</span></div>`).join('')||'<div class="empty">まだ学習記録がありません。まず単元練習に取り組みましょう。</div>'}</div>`}
function test(){const g=profile().grade;return `${header('ミニテスト','ヒントなしで解き、最後に正答率と解説を表示します。')}
 <div class="card"><h2>${labelGrade(g)}の総合テスト</h2><p class="muted small">学年の中からランダムに15問出題。途中の正解は表示しません。</p>${button('総合テストを始める','start-test','primary block')}</div>
 <div class="section-title"><h2>単元別テスト</h2></div><div class="card"><p class="small muted">テストを受けたい単元を選んでください（最大10問）。</p><select id="testUnit" class="select" style="width:100%">${UNITS.filter(u=>u.grade===g).map(u=>`<option value="${u.id}">${html(u.name)}（${qsOf(u.id).length}問）</option>`).join('')}</select><div style="margin-top:12px">${button('選んだ単元のテスト','start-unit-test','soft block')}</div></div>
 <div class="section-title"><h2>最近のテスト</h2></div><div class="card">${tests().length?tests().slice(-5).reverse().map(t=>`<div class="line row between"><span><strong>${html(t.label)}</strong><br><small class="muted">${new Date(t.date).toLocaleDateString('ja-JP')}</small></span><strong>${t.correct}/${t.total}</strong></div>`).join(''):'<div class="empty">まだテスト記録がありません。</div>'}</div>`}
function report(){const s=stats(),p=profile();const byGrade=UNITS.filter(u=>u.grade===p.grade);return `${header('学習レポート',`${p.name}さんの学習記録を確認できます。`)}
 <div class="grid-3"><div class="metric"><b>${s.seen}</b><small>学習済み</small></div><div class="metric"><b>${s.strong}</b><small>ヒントなし正解</small></div><div class="metric"><b>${s.tests}</b><small>受けたテスト</small></div></div>
 <div class="section-title"><h2>${labelGrade(p.grade)}の単元別進捗</h2></div><div class="card">${byGrade.map(u=>`<div class="report-row"><div><strong class="small">${html(u.name)}</strong>${progress(attempted(u.id),qsOf(u.id).length)}</div><span class="small muted">${Math.round(100*attempted(u.id)/qsOf(u.id).length)}%</span>${button('学習','open-'+u.id,'soft sm')}</div>`).join('')}</div>
 <div class="card" style="margin-top:14px"><h3>学習記録の見方</h3><p class="small muted">進捗は「少なくとも一度取り組んだ問題の割合」です。理解度を断定するものではありません。「ヒントなし正解」は、どこかの回で自力正解した問題数です。</p><div class="divider"></div><h3>家族用の設定</h3><p class="small muted">学年の変更、バックアップ、記録の読み込みはこちら。</p>${button('設定を開く','settings','soft')}</div>`}
function settings(){const p=profile();return `${header('設定とバックアップ','学習記録はこの端末のブラウザー内に保存しています。')}
 <div class="card"><h2>学習者の設定</h2><div class="row between wrap"><b>${html(p.name)}</b><select id="gradeSelect" class="select" aria-label="学年">${[1,2,3].map(g=>`<option value="${g}" ${p.grade===g?'selected':''}>中学${g}年</option>`).join('')}</select></div><p class="small muted">学年は「今日の10問」やテストで使う問題の出題範囲に反映します。</p>${button('学習者を切り替える','profiles','soft')}</div>
 <div class="card"><h2>データの保存・移行</h2><p class="small muted">スマホとタブレット間で記録を移すときは、保存したJSONファイルを別端末で読み込んでください（自動同期ではありません）。</p><div class="row wrap">${button('記録を書き出す','export','primary')}${button('記録を読み込む','import','soft')}</div><p class="tiny muted">読み込みは現在の家族全員の記録を置き換えます。事前にバックアップしてください。</p></div>
 <div class="card"><h2>プライバシー</h2><p class="small muted">外部アカウント・広告・AIへのデータ送信はありません。同じブラウザーを使う家族は互いの学習記録を見られます。シークレットモードやブラウザーデータ削除では記録が消えることがあります。</p><div class="divider"></div>${button('この学習者の記録を初期化','reset','ghost')}</div>
 <div class="notice" style="margin-top:12px">バージョン 0.2。中学3年間の22大単元に基本問題を収録。記述式の証明・作図・高度なグラフ操作、端末間自動同期は今後の課題です。</div>`}
function render(){const root=$('root');if(!root)return;const pages={home,course,lesson,practice:questionView,result:resultsView,review,test,report,settings};root.innerHTML=(pages[screen]||home)();$('profileName').textContent=profile().name;
 document.querySelectorAll('[data-nav]').forEach(b=>{const t=b.dataset.nav;b.classList.toggle('active',screen===t||(t==='course'&&screen==='lesson')||(t==='home'&&['practice','result'].includes(screen)))});
}
function navigate(name){screen=name;session=null;notice='';if(name==='course')grade=profile().grade;render();window.scrollTo(0,0)}
function switchProfile(id){if(!state.profiles.some(p=>p.id===id))return;state.active=id;grade=profile().grade;save();$('profilesDialog').close();navigate('home')}
function profilesDialog(){const el=$('profileOptions');el.innerHTML=state.profiles.map(p=>`<button type="button" class="profile-option ${p.id===state.active?'chosen':''}" data-profile="${html(p.id)}"><span><strong>${html(p.name)}</strong> <small class="muted">中学${p.grade}年</small></span><span>${p.id===state.active?'✓ 選択中':'切り替え'}</span></button>`).join('');$('profilesDialog').showModal()}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`数学コンパス_家族の学習記録_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function changeInput(text){if(!session||session.completed)return;session.answer=text;const elem=$('answer');if(elem){elem.value=text;elem.focus()}}
// ナビゲーションと操作はイベント委譲（再描画後も動作）
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return}
 const un=e.target.closest('[data-unit]');if(un){unitId=un.dataset.unit;level=0;navigate('lesson');return}
 const gr=e.target.closest('[data-grade]');if(gr){grade=+gr.dataset.grade;render();return}
 const lv=e.target.closest('[data-level]');if(lv){level=+lv.dataset.level;render();return}
 const co=e.target.closest('[data-choice]');if(co&&session&&!session.completed){const q=current();session.answer=q.choices[+co.dataset.choice];render();return}
 const kp=e.target.closest('[data-key]');if(kp&&session&&!session.completed){const k=kp.dataset.key;let s=String(session.answer);if(k==='C')s='';else if(k==='⌫')s=s.slice(0,-1);else s+=({'−':'-','＋':'+'}[k]??k);changeInput(s);return}
 const pr=e.target.closest('[data-profile]');if(pr){switchProfile(pr.dataset.profile);return}
 const act=e.target.closest('[data-act]');if(!act)return;
 switch(act.dataset.act){
 case 'home':navigate('home');break;case 'course':navigate('course');break;case 'review':navigate('review');break;case 'settings':navigate('settings');break;case 'profiles':profilesDialog();break;
 case 'number-left':marker=Math.max(-10,marker-1);render();break;case 'number-right':marker=Math.min(10,marker+1);render();break;case 'number-reset':marker=0;render();break;
 case 'daily':start('daily');break;case 'review-start':start('review');break;case 'unit-all':start('unit',unitId);break;case 'unit-level':start('unit',unitId,level);break;
 case 'start-test':start('test');break;case 'start-unit-test':start('test',$('testUnit').value);break;
 case 'hint':if(session&&!session.completed&&session.hints<3){session.hints++;render()}break;
 case 'submit':session?.mode==='test'?finishTestAnswer():finishAnswer();break;
 case 'skip':finishTestAnswer(true);break;
 case 'giveup':finishAnswer(true);break;
 case 'next':next();break;
 case 'quit':if(session&&!session.finished&&session.mode==='test'&&session.index>0&&!confirm('テストを中断しますか？ このテストの集計結果は残りません。'))return;navigate('home');break;
 case 'export':exportData();break;
 case 'import':$('backupInput').click();break;
 case 'reset':if(confirm(`${profile().name}の学習記録とテスト結果を初期化しますか？ 元に戻せません。`)){state.records[state.active]={};state.tests[state.active]=[];save();notice='学習記録を初期化しました。';render()}break;
 default:if(act.dataset.act.startsWith('open-')){unitId=act.dataset.act.substring(5);level=0;navigate('lesson')}
 }
 if(!['hint','submit','skip','giveup','next'].includes(act.dataset.act))window.scrollTo(0,0);
});
document.addEventListener('input',e=>{if(e.target.id==='answer'&&session&&!session.completed)session.answer=e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='answer'&&session&&!session.completed){e.preventDefault();session.mode==='test'?finishTestAnswer():finishAnswer()}});
document.addEventListener('change',e=>{if(e.target.id==='gradeSelect'){profile().grade=+e.target.value;grade=profile().grade;save();render()}});
$('profileButton').addEventListener('click',profilesDialog);$('brandHome').addEventListener('click',()=>navigate('home'));
$('closeDialog').addEventListener('click',()=>$('profilesDialog').close());
$('addProfileForm').addEventListener('submit',e=>{e.preventDefault();if(state.profiles.length>=6){alert('学習者は最大6人です。');return}const name=$('addProfileName').value.trim().slice(0,16);if(!name)return;const id='p'+Date.now()+'_'+Math.floor(Math.random()*1000);state.profiles.push({id,name,grade:1});state.records[id]={};state.tests[id]=[];state.active=id;save();$('addProfileName').value='';$('profilesDialog').close();grade=1;navigate('home')});
$('backupInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>3_000_000)throw Error('ファイルサイズが大きすぎます。');const parsed=safeParse(await file.text());const candidate=parsed?.results&&!parsed?.records?migrateLegacy(parsed):sanitizeImported(parsed);if(!confirm('現在の家族全員の学習記録を読み込んだ記録で置き換えます。よろしいですか？'))return;state=candidate;grade=profile().grade;save();notice='バックアップを読み込みました。';screen='home';render()}catch(err){alert('読み込みできませんでした：'+err.message)}finally{e.target.value=''}});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
grade=profile().grade;render();
})();
