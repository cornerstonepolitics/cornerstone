// ============================================================
//  CORNERSTONE — WHEEL ENGINE & RENDERING
// ============================================================
//  This is the site's machinery: the wheel geometry, the
//  navigation, and the page renderers. You will rarely need
//  to edit this file.
//
//  Data comes from two build-injected globals:
//    siteConfig, branchOrder  — from content/config.js
//    ARTICLES                 — parsed from content/articles/*.md
//
//  To add or edit an article, change the Markdown files, not
//  this script.
// ============================================================

const data = siteConfig;
const order = branchOrder;

// Articles are split into center pieces and regular posts by the
// `center` flag in their frontmatter.
const centerPieces = ARTICLES.filter(a => a.center);
const posts = ARTICLES.filter(a => !a.center);
const allArticles = ARTICLES;

const CX = 310, CY = 310;
const R_IN0 = 110, R_IN1 = 200, R_OUT0 = 202, R_OUT1 = 298;

function pol(r, deg){ const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
function wedge(r0, r1, a0, a1){
  const [x0,y0]=pol(r1,a0),[x1,y1]=pol(r1,a1),[x2,y2]=pol(r0,a1),[x3,y3]=pol(r0,a0);
  const large=(a1-a0)>180?1:0;
  return `M${x0},${y0} A${r1},${r1} 0 ${large},1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large},0 ${x3},${y3} Z`;
}
function outwardArc(r, aStart, aEnd){
  const [x0,y0]=pol(r,aStart), [x1,y1]=pol(r,aEnd);
  const sweep = aEnd>aStart ? 1 : 0;
  const large = Math.abs(aEnd-aStart)>180?1:0;
  return `M${x0},${y0} A${r},${r} 0 ${large},${sweep} ${x1},${y1}`;
}

const twoLine = { 'Foreign Policy':['Foreign','Policy'], 'Rule of Law':['Rule of','Law'] };
const oneLineSmall = { 'Institutions': 13 };

function buildWheel(){
  const root=document.getElementById('wheelRoot');
  let svg='', defs='';
  // Single-stone wheel: light center to dark outer edge. Wedges all use the same radial marble gradient.
  svg+=`<circle cx="${CX}" cy="${CY}" r="298" fill="url(#marble)"/>`;

  order.forEach((bk,i)=>{
    const b=data[bk];
    const center=180+i*120;
    const a0=center-60, a1=center+60;

    svg+=`<path d="${wedge(R_IN0,R_IN1,a0,a1)}" fill="url(#marble)" stroke="#000" stroke-opacity="0.3" stroke-width="1.7" onclick="rotateTo('${bk}')" style="cursor:pointer"/>`;
    const inR=R_IN0+(R_IN1-R_IN0)*0.45;
    const ipid=`bp${i}`;
    defs+=`<path id="${ipid}" fill="none" d="${outwardArc(inR, center+43, center-43)}"/>`;
    const branchFontSize = bk==='governance' ? 20 : 22;
    const branchLetterSpacing = bk==='governance' ? 2.2 : 3.2;
    svg+=`<text font-family="Georgia,serif" font-size="${branchFontSize}" letter-spacing="${branchLetterSpacing}" font-weight="600" class="branch-label branch-label-${bk}" fill="${bk==='economics'?b.wheelActive:b.wheelLabel}" onclick="rotateTo('${bk}')" style="cursor:pointer"><textPath href="#${ipid}" startOffset="50%" text-anchor="middle">${b.label.toUpperCase()}</textPath></text>`;

    const n=b.parents.length, seg=120/n;
    b.parents.forEach((p,j)=>{
      const pa0=a0+j*seg, pa1=a0+(j+1)*seg, mid=(pa0+pa1)/2;
      svg+=`<path d="${wedge(R_OUT0,R_OUT1,pa0,pa1)}" fill="url(#marble)" stroke="#000" stroke-opacity="0.30" stroke-width="0.95" onclick="showParent('${bk}','${p[0]}')" style="cursor:pointer"/>`;
      const stack = twoLine[p[1]];
      const onBottom = (mid%360>90 && mid%360<270);
      if(stack){
        const rOuter=R_OUT0+(R_OUT1-R_OUT0)*0.66, rInner=R_OUT0+(R_OUT1-R_OUT0)*0.34;
        const firstR=onBottom?rInner:rOuter, secondR=onBottom?rOuter:rInner;
        const id1=`pp${i}_${j}a`, id2=`pp${i}_${j}b`;
        defs+=`<path id="${id1}" fill="none" d="${outwardArc(firstR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        defs+=`<path id="${id2}" fill="none" d="${outwardArc(secondR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" fill="${bk==='economics'?b.wheelLabel:b.dark}" stroke="#efe8dc" stroke-opacity="0.16" stroke-width="1.05" paint-order="stroke fill" onclick="showParent('${bk}','${p[0]}')" style="cursor:pointer"><textPath href="#${id1}" startOffset="50%" text-anchor="middle">${stack[0].toUpperCase()}</textPath></text>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" fill="${bk==='economics'?b.wheelLabel:b.dark}" stroke="#efe8dc" stroke-opacity="0.16" stroke-width="1.05" paint-order="stroke fill" onclick="showParent('${bk}','${p[0]}')" style="cursor:pointer"><textPath href="#${id2}" startOffset="50%" text-anchor="middle">${stack[1].toUpperCase()}</textPath></text>`;
      } else {
        const outR=R_OUT0+(R_OUT1-R_OUT0)*0.5;
        const pid=`pp${i}_${j}`;
        defs+=`<path id="${pid}" fill="none" d="${outwardArc(outR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        let fs;
        if(oneLineSmall[p[1]]) fs=oneLineSmall[p[1]];
        else { const arcW=(seg-3)*Math.PI/180*outR; fs=Math.max(12, Math.min(17, arcW/(p[1].length*0.62))); }
        svg+=`<text font-family="Georgia,serif" font-size="${fs}" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" fill="${bk==='economics'?b.wheelLabel:b.dark}" stroke="#efe8dc" stroke-opacity="0.16" stroke-width="1.05" paint-order="stroke fill" onclick="showParent('${bk}','${p[0]}')" style="cursor:pointer"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${p[1].toUpperCase()}</textPath></text>`;
      }
    });
  });

  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_OUT1}" fill="none" stroke="#000" stroke-opacity="0.38" stroke-width="1.6"/>`;
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_OUT0}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="1.1"/>`;
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_IN1}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="1.15"/>`;
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_IN0}" fill="none" stroke="#000" stroke-opacity="0.26" stroke-width="1.05"/>`;
  [120,240,360].forEach(d=>{ const [xa,ya]=pol(R_IN0,d),[xb,yb]=pol(R_OUT1,d); svg+=`<line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}" stroke="#000" stroke-opacity="0.34" stroke-width="3.8"/>`; });

  root.innerHTML=`<defs>${defs}</defs>`+svg;
}

function updateWheelFocus(branch){
  order.forEach(bk=>{
    const b=data[bk];
    const active = bk===branch;
    document.querySelectorAll('.parent-label-'+bk).forEach(el=>{
      el.setAttribute('fill', active ? b.wheelLabel : b.dark);
      el.setAttribute('stroke-opacity', '0.16');
    });
    document.querySelectorAll('.branch-label-'+bk).forEach(el=>{
      el.setAttribute('fill', b.wheelLabel);
    });
  });
}

let rotateTimer=null, curRot=0;
function rotateTo(branch){
  show('home');
  const i=order.indexOf(branch);
  let target=-i*120;
  let diff=((target - curRot) % 360 + 540) % 360 - 180;   // SHORTEST PATH
  curRot += diff;
  document.getElementById('wheelRoot').style.transform='rotate('+curRot+'deg)';
  updateWheelFocus(branch);
  clearTimeout(rotateTimer);
  rotateTimer=setTimeout(()=>showBranch(branch),920);
}
function show(id){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo(0,0); if(id==='recent') buildFeed(); }

function fmtDate(iso){ const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('en-US',{month:'short',year:'numeric'}); }
function parentKeys(p){ return p.parents || (p.parent ? [p.parent] : []); }
function parentLabel(branch,parent){ return data[branch].parents.find(x=>x[0]===parent)[1]; }
function parentLabels(p){ return parentKeys(p).map(k=>parentLabel(p.branch,k)); }
function sortPosts(list){ return [...list].sort((a,b)=>b.date.localeCompare(a.date)); }
function articleMeta(p, mode){
  const b=data[p.branch], labels=parentLabels(p).join(' / ');
  if(mode==='branch') return labels;
  if(mode==='topic') return b.label;
  return b.label+' · '+labels;
}
function isInParent(p, branch, key){ return p.branch===branch && parentKeys(p).includes(key); }
function renderArticleList(container, list, mode, emptyText){
  container.innerHTML='';
  const sorted=sortPosts(list);
  if(!sorted.length){
    const empty=document.createElement('div'); empty.className='empty-state';
    empty.innerHTML=(emptyText || 'First piece coming soon.')+' <span style="cursor:pointer;text-decoration:underline" onclick="showArticle(\'cornerstone\')">Read the centerpiece.</span>';
    container.appendChild(empty); return;
  }
  sorted.forEach(p=>{
    const b=data[p.branch];
    const row=document.createElement('div'); row.className='article-row';
    row.innerHTML='<div class="article-date">'+fmtDate(p.date)+'</div><div class="article-meta" style="color:'+b.color+'">'+articleMeta(p,mode)+'</div><div><div class="article-list-title">'+p.title+'</div>'+(p.dek?'<div class="article-dek">'+p.dek+'</div>':'')+'</div>';
    row.onclick=()=>showArticle(p.slug);
    container.appendChild(row);
  });
}
function buildFeed(){
  renderArticleList(document.getElementById('feed-list'), posts, 'recent', 'No articles yet.');
}
function showBranch(branch){
  const b=data[branch];
  const e=document.getElementById('branch-eyebrow'); e.style.color=b.color; e.textContent='Branch';
  const t=document.getElementById('branch-title'); t.style.color=b.color; t.textContent=b.label;

  document.getElementById('branch-principles-heading').textContent='Key principles of '+b.label;

  const principles=document.getElementById('branch-principles'); principles.innerHTML='';
  b.principles.forEach(line=>{ const li=document.createElement('li'); li.textContent=line; principles.appendChild(li); });

  const grid=document.getElementById('branch-children'); grid.innerHTML='';
  b.parents.forEach(([k,lbl])=>{ const c=document.createElement('div'); c.className='child-card'; c.innerHTML='<div class="child-card-label" style="color:'+b.color+'">Topic</div><div class="child-card-title">'+lbl+'</div>'; c.onclick=()=>showParent(branch,k); grid.appendChild(c); });

  document.getElementById('branch-articles-label').textContent='Recent in '+b.label;
  renderArticleList(document.getElementById('branch-articles'), posts.filter(p=>p.branch===branch), 'branch', 'No articles in '+b.label+' yet.');
  show('branch-page');
}
function showParent(branch,key){
  const b=data[branch]; const lbl=parentLabel(branch,key);
  document.getElementById('parent-breadcrumb').innerHTML=`<span onclick="show('home')">Home</span><span class="sep">/</span><span onclick="showBranch('${branch}')" style="color:${b.color}">${b.label}</span><span class="sep">/</span><span style="color:${b.color}">${lbl}</span>`;
  const e=document.getElementById('parent-eyebrow'); e.style.color=b.color; e.textContent=b.label;
  document.getElementById('parent-title').textContent=lbl;
  document.getElementById('parent-articles-label').textContent='Articles in '+lbl;
  renderArticleList(document.getElementById('parent-articles'), posts.filter(p=>isInParent(p, branch, key)), 'topic', 'No articles in '+lbl+' yet.');
  show('parent-page');
}
function showArticle(slug){
  const p=allArticles.find(x=>x.slug===slug); if(!p) return;
  const title=document.getElementById('article-title');
  const subtitle=document.getElementById('article-subtitle');
  const eyebrow=document.getElementById('article-eyebrow');
  const breadcrumb=document.getElementById('article-breadcrumb');

  title.style.color=''; title.textContent=p.title;
  if(p.subtitle){ subtitle.textContent=p.subtitle; subtitle.style.display='block'; } else { subtitle.textContent=''; subtitle.style.display='none'; }

  if(p.center){
    breadcrumb.innerHTML=`<span onclick="show('home')">Home</span>`;
    eyebrow.style.color='var(--article-muted-light)';
    eyebrow.textContent=p.eyebrow || 'Centerpiece';
  } else {
    const b=data[p.branch], labels=parentLabels(p);
    const topicLinks=parentKeys(p).map(k=>`<span onclick="showParent('${p.branch}','${k}')" style="color:${b.light}">${parentLabel(p.branch,k)}</span>`).join('<span class="sep">/</span>');
    breadcrumb.innerHTML=`<span onclick="show('home')">Home</span><span class="sep">/</span><span onclick="showBranch('${p.branch}')" style="color:${b.light}">${b.label}</span><span class="sep">/</span>${topicLinks}`;
    eyebrow.style.color=b.light;
    eyebrow.textContent=fmtDate(p.date)+' · '+b.label+' · '+labels.join(' / ');
  }

  document.getElementById('article-body').innerHTML=p.body || '<p>Article coming soon.</p>';
  show('article-page');
}

buildWheel();
updateWheelFocus('economics');
