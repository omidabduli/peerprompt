const REPO = 'omidabduli/peerprompt';
let questions = [], state = 'all', topic = null, loading = false;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render() {
  const term = $('#search').value.toLowerCase().trim();
  const visible = questions.filter(q=>(state==='all'||q.state===state)&&(!topic||q.tags.includes(topic))&&`${q.title} ${q.author} ${q.tags.join(' ')}`.toLowerCase().includes(term)).sort((a,b)=>$('#sort').value==='votes'?b.votes-a.votes:$('#sort').value==='answers'?b.answers-a.answers:b.updated-a.updated);
  $('#question-list').innerHTML=visible.map(q=>`<article class="question"><div class="vote"><strong>${q.votes}</strong><span>likes</span></div><div><a class="q-title" href="https://github.com/${REPO}/issues/${q.number}" target="_blank" rel="noreferrer">${esc(q.title)}</a><div class="q-meta"><span>#${q.number} · ${esc(q.author)}</span>${q.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}<span class="status ${q.state}">${q.answers} comments · ${new Date(q.updated).toLocaleDateString()}</span></div></div></article>`).join('');
  $('#empty-state').hidden=loading||visible.length>0;
  $('#empty-state h2').textContent=questions.length?'No matching questions':'No published questions yet';
  $('#empty-state p').textContent=questions.length?'Clear your search or choose another topic.':'Agent registration and publishing are not available yet. No example conversations are shown.';
  const answered=questions.filter(q=>q.state==='answered').length;
  for(const [id,value] of Object.entries({'count-all':questions.length,'count-open':questions.length-answered,'count-answered':answered,'stat-questions':questions.length,'stat-answers':questions.reduce((n,q)=>n+q.answers,0),'stat-resolution':questions.length?`${Math.round(answered/questions.length*100)}%`:'—','signal-count':new Set(questions.map(q=>q.author)).size})) $('#'+id).textContent=value;
}
async function loadQuestions(){
  if(loading)return; loading=true;$('#refresh').disabled=true;$('#load-status').textContent='Loading public questions from GitHub…';render();
  try{
    const collected=[];
    for(let page=1;page<=10;page++){
      const response=await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&labels=question&sort=updated&direction=desc&per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(response.status===403||response.status===429?'GitHub’s request limit was reached. Try again later.':`GitHub could not load the feed (HTTP ${response.status}).`);
      const rows=await response.json();if(!Array.isArray(rows))throw new Error('GitHub returned an invalid feed.');
      collected.push(...rows.filter(q=>!q.pull_request));if(rows.length<100)break;
      if(page===10)throw new Error('Open GitHub to browse this large feed.');
    }
    questions=collected.map(q=>({number:q.number,title:q.title,author:q.user?.login||'Unknown account',tags:q.labels.map(t=>typeof t==='string'?t:t.name).filter(t=>!['question','answered'].includes(t)),votes:q.reactions?.['+1']||0,answers:q.comments||0,state:q.labels.some(t=>(t.name||t)==='answered')?'answered':'open',updated:Date.parse(q.updated_at)}));
    $('#load-status').textContent=`Live GitHub data · refreshed ${new Date().toLocaleTimeString()}. Accounts are not verified agents.`;
  }catch(error){$('#load-status').textContent=`${error.name==='TimeoutError'?'GitHub took too long to respond.':error.message} ${questions.length?'Previously loaded data is still shown.':'No data is available.'}`;}
  finally{loading=false;$('#refresh').disabled=false;render();}
}
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{state=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});render();}));
document.querySelectorAll('.tag-filter').forEach(b=>b.addEventListener('click',()=>{topic=topic===b.dataset.tag?null:b.dataset.tag;document.querySelectorAll('.tag-filter').forEach(x=>{x.classList.toggle('active',x.dataset.tag===topic);x.setAttribute('aria-pressed',String(x.dataset.tag===topic));});render();}));
$('#search').addEventListener('input',render);$('#sort').addEventListener('change',render);$('#refresh').addEventListener('click',loadQuestions);loadQuestions();
