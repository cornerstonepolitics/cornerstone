// ============================================================
//  CORNERSTONE — WHEEL ENGINE, ROUTER & RENDERING
// ============================================================
//  Data comes from build-injected globals:
//    siteConfig, branchOrder  — from content/config.js
//    ROUTE_MAP                — key <-> url-segment lookup
//    ROUTE                    — which page this file IS
//    ARTICLES                 — parsed from content/articles/*.md
//
//  ROUTING
//  Every branch, topic and article is a real URL backed by a real
//  file (see build.js). Landing on one cold — or refreshing — paints
//  the correct state immediately. Clicking inside the site does NOT
//  reload: we intercept the click, swap the view, and push the new
//  URL with history.pushState. Back/Forward restore state via
//  popstate. Every destination is a real <a href>, so links are
//  keyboard-focusable and open in a new tab on middle/ctrl-click.
// ============================================================

const data = siteConfig;
const order = branchOrder;

const centerPieces = ARTICLES.filter(a => a.center);
const posts = ARTICLES.filter(a => !a.center);
const allArticles = ARTICLES;

const DEFAULT_BRANCH = 'economics';

const CX = 310, CY = 310;
const R_IN0 = 110, R_IN1 = 200, R_OUT0 = 202, R_OUT1 = 298;

// ------------------------------------------------------------
//  URL helpers
// ------------------------------------------------------------
function branchUrl(bk){ return '/' + ROUTE_MAP[bk].url + '/'; }
function topicUrl(bk, key){ return '/' + ROUTE_MAP[bk].url + '/' + ROUTE_MAP[bk].topics[key] + '/'; }
function articleUrl(slug){ return '/' + slug + '/'; }
function homeUrl(){ return '/'; }
function recentUrl(){ return '/recent/'; }

// Turn a URL path back into a route object. Used by popstate and by
// any link we intercept.
function parsePath(pathname){
  const parts = pathname.split('/').filter(Boolean);
  if(parts.length === 0) return { kind:'home' };
  if(parts[0] === 'recent') return { kind:'recent' };

  // /branch/  or  /branch/topic/
  const bk = order.find(k => ROUTE_MAP[k].url === parts[0]);
  if(bk){
    if(parts.length === 1) return { kind:'branch', branch:bk };
    const topics = ROUTE_MAP[bk].topics;
    const key = Object.keys(topics).find(k => topics[k] === parts[1]);
    if(key) return { kind:'topic', branch:bk, topic:key };
    return { kind:'notfound' };
  }

  // /article-slug/
  const art = allArticles.find(a => a.slug === parts[0]);
  if(art) return { kind:'article', slug:art.slug };

  return { kind:'notfound' };
}

// ------------------------------------------------------------
//  Geometry
// ------------------------------------------------------------
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

const twoLine = { 'Foreign Policy':['Policy','Foreign'], 'Rule of Law':['Rule of','Law'] };
const oneLineSmall = { 'Institutions': 13 };

// ------------------------------------------------------------
//  Wheel
//  Each wedge is wrapped in a real <a href> so it is a genuine
//  link: focusable, keyboard-activatable, right-clickable. The
//  global click handler intercepts plain left-clicks for the
//  smooth in-page transition and lets modified clicks behave
//  normally (ctrl/cmd-click opens a new tab, as expected).
// ------------------------------------------------------------
function buildWheel(){
  const root=document.getElementById('wheelRoot');
  let svg='', defs='';
  svg+=`<circle cx="${CX}" cy="${CY}" r="298" fill="url(#marble)"/>`;

  order.forEach((bk,i)=>{
    const b=data[bk];
    const center=180+i*120;
    const a0=center-60, a1=center+60;
    const bHref=branchUrl(bk);

    svg+=`<a href="${bHref}" class="wedge-link" aria-label="${b.label}" data-nav>`
      +`<path class="wedge branch-wedge" data-branch="${bk}" d="${wedge(R_IN0,R_IN1,a0,a1)}" fill="url(#marble)" stroke="#000" stroke-opacity="0.3" stroke-width="1.7" onmouseenter="hoverBranch('${bk}')" onmouseleave="clearHover()"/>`
      +`</a>`;

    const inR=R_IN0+(R_IN1-R_IN0)*0.45;
    const ipid=`bp${i}`;
    defs+=`<path id="${ipid}" fill="none" d="${outwardArc(inR, center+43, center-43)}"/>`;
    const branchFontSize = bk==='governance' ? 20 : 22;
    const branchLetterSpacing = bk==='governance' ? 2.2 : 3.2;
    svg+=`<text font-family="Georgia,serif" font-size="${branchFontSize}" letter-spacing="${branchLetterSpacing}" font-weight="600" class="branch-label branch-label-${bk}" data-branch="${bk}" fill="${b.wheelLabel}" pointer-events="none"><textPath href="#${ipid}" startOffset="50%" text-anchor="middle">${b.label.toUpperCase()}</textPath></text>`;

    const n=b.parents.length, seg=120/n;
    b.parents.forEach((p,j)=>{
      const pa0=a0+j*seg, pa1=a0+(j+1)*seg, mid=(pa0+pa1)/2;
      const tHref=topicUrl(bk,p[0]);

      svg+=`<a href="${tHref}" class="wedge-link" aria-label="${p[1]}, in ${b.label}" data-nav>`
        +`<path class="wedge topic-wedge" data-branch="${bk}" data-topic="${p[0]}" d="${wedge(R_OUT0,R_OUT1,pa0,pa1)}" fill="url(#marble)" stroke="#000" stroke-opacity="0.30" stroke-width="0.95" onmouseenter="hoverTopic('${bk}','${p[0]}')" onmouseleave="clearHover()"/>`
        +`</a>`;

      const stack = twoLine[p[1]];
      const onBottom = (mid%360>90 && mid%360<270);
      if(stack){
        const rOuter=R_OUT0+(R_OUT1-R_OUT0)*0.66, rInner=R_OUT0+(R_OUT1-R_OUT0)*0.34;
        const firstR=onBottom?rInner:rOuter, secondR=onBottom?rOuter:rInner;
        const id1=`pp${i}_${j}a`, id2=`pp${i}_${j}b`;
        defs+=`<path id="${id1}" fill="none" d="${outwardArc(firstR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        defs+=`<path id="${id2}" fill="none" d="${outwardArc(secondR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.dark}" stroke="#efe8dc" stroke-opacity="0.16" stroke-width="1.05" paint-order="stroke fill" pointer-events="none"><textPath href="#${id1}" startOffset="50%" text-anchor="middle">${stack[0].toUpperCase()}</textPath></text>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.dark}" stroke="#efe8dc" stroke-opacity="0.16" stroke-width="1.05" paint-order="stroke fill" pointer-events="none"><textPath href="#${id2}" startOffset="50%" text-anchor="middle">${stack[1].toUpperCase()}</textPath></text>`;
      } else {
        const outR=R_OUT0+(R_OUT1-R_OUT0)*0.5;
        const pid=`pp${i}_${j}`;
        defs+=`<path id="${pid}" fill="none" d="${outwardArc(outR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        let fs;
        if(oneLineSmall[p[1]]) fs=oneLineSmall[p[1]];
        else { const arcW=(seg-3)*Math.PI/180*outR; fs=Math.max(12, Math.min(17, arcW/(p[1].length*0.62))); }
        svg+=`<text font-family="Georgia,serif" font-size="${fs}" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.dark}" stroke="#efe8dc" stroke-opacity="0.16" stroke-width="1.05" paint-order="stroke fill" pointer-events="none"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${p[1].toUpperCase()}</textPath></text>`;
      }
    });
  });

  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_OUT1}" fill="none" stroke="#000" stroke-opacity="0.38" stroke-width="1.6" pointer-events="none"/>`;
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_OUT0}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="1.1" pointer-events="none"/>`;
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_IN1}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="1.15" pointer-events="none"/>`;
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_IN0}" fill="none" stroke="#000" stroke-opacity="0.26" stroke-width="1.05" pointer-events="none"/>`;
  [120,240,360].forEach(d=>{ const [xa,ya]=pol(R_IN0,d),[xb,yb]=pol(R_OUT1,d); svg+=`<line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}" stroke="#000" stroke-opacity="0.34" stroke-width="3.8" pointer-events="none"/>`; });

  root.innerHTML=`<defs>${defs}</defs>`+svg;
}

// ------------------------------------------------------------
//  Hover
// ------------------------------------------------------------
function brightenBranch(bk, on){
  document.querySelectorAll('.wedge[data-branch="'+bk+'"]').forEach(el=>el.classList.toggle('hot', on));
}
function brightenTopicWedge(bk, key, on){
  document.querySelectorAll('.topic-wedge[data-branch="'+bk+'"][data-topic="'+key+'"]').forEach(el=>el.classList.toggle('hot', on));
}
function brightenBranchWedge(bk, on){
  document.querySelectorAll('.branch-wedge[data-branch="'+bk+'"]').forEach(el=>el.classList.toggle('hot', on));
}
function tintLabel(bk, key){
  const b=data[bk];
  document.querySelectorAll('.parent-label[data-branch="'+bk+'"][data-topic="'+key+'"]').forEach(el=>{
    el.setAttribute('fill', b.wheelLabel);
  });
}
function hoverBranch(bk){
  if(bk===activeBranch) brightenBranchWedge(bk, true);
  else brightenBranch(bk, true);
}
function hoverTopic(bk, key){
  if(bk===activeBranch) brightenTopicWedge(bk, key, true);
  else brightenBranch(bk, true);
  tintLabel(bk, key);
}
function clearHover(){
  document.querySelectorAll('.wedge.hot').forEach(el=>el.classList.remove('hot'));
  updateWheelFocus(activeBranch);
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

// ------------------------------------------------------------
//  Rotation (visual only — navigation is handled by the router)
// ------------------------------------------------------------
let curRot=0, activeBranch=DEFAULT_BRANCH;

function spinTo(branch, animate){
  activeBranch=branch;
  const i=order.indexOf(branch);
  const target=-i*120;
  const diff=((target - curRot) % 360 + 540) % 360 - 180;   // shortest path
  curRot += diff;
  const root=document.getElementById('wheelRoot');
  if(animate===false){
    // Land in position with no animation: used on first paint so a
    // deep link opens already-positioned instead of spinning into place.
    root.style.transition='none';
    root.style.transform='rotate('+curRot+'deg)';
    void root.getBoundingClientRect();   // force reflow before restoring
    root.style.transition='';
  } else {
    root.style.transform='rotate('+curRot+'deg)';
  }
  updateWheelFocus(branch);
}

// ------------------------------------------------------------
//  Views
// ------------------------------------------------------------
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el=document.getElementById(id);
  if(el) el.classList.add('active');
}

function fmtDate(iso){ const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}); }
function parentKeys(p){ return p.parents || (p.parent ? [p.parent] : []); }
function parentLabel(branch,parent){ const f=data[branch].parents.find(x=>x[0]===parent); return f?f[1]:parent; }
function parentLabels(p){ return parentKeys(p).map(k=>parentLabel(p.branch,k)); }
function sortPosts(list){ return [...list].sort((a,b)=>b.date.localeCompare(a.date)); }
function articleMeta(p, mode){
  if(p.center) return 'Cornerstone';
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
    const empty=document.createElement('div');
    empty.className='empty-state';
    empty.textContent=emptyText;
    container.appendChild(empty);
    return;
  }
  sorted.forEach(p=>{
    const metaColor = p.center ? 'var(--text-muted-on-dark)' : data[p.branch].color;
    // A real link: focusable, and openable in a new tab.
    const row=document.createElement('a');
    row.className='article-row';
    row.href=articleUrl(p.slug);
    row.setAttribute('data-nav','');
    row.innerHTML='<div class="article-date">'+fmtDate(p.date)+'</div>'
      +'<div class="article-meta" style="color:'+metaColor+'">'+articleMeta(p,mode)+'</div>'
      +'<div><div class="article-list-title">'+p.title+'</div>'
      +(p.dek?'<div class="article-dek">'+p.dek+'</div>':'')+'</div>';
    container.appendChild(row);
  });
}

function buildFeed(){
  renderArticleList(document.getElementById('feed-list'), posts.concat(centerPieces), 'recent', 'Essays are coming.');
}

function renderBranch(branch){
  const b=data[branch];
  const e=document.getElementById('branch-eyebrow'); e.style.color=b.color; e.textContent='Branch';
  const t=document.getElementById('branch-title'); t.style.color=b.color; t.textContent=b.label;

  document.getElementById('branch-principles-heading').textContent='Key principles of '+b.label;

  const principles=document.getElementById('branch-principles'); principles.innerHTML='';
  b.principles.forEach(line=>{ const li=document.createElement('li'); li.textContent=line; principles.appendChild(li); });

  const grid=document.getElementById('branch-children'); grid.innerHTML='';
  b.parents.forEach(([k,lbl])=>{
    const c=document.createElement('a');
    c.className='child-card';
    c.href=topicUrl(branch,k);
    c.setAttribute('data-nav','');
    c.innerHTML='<div class="child-card-label" style="color:'+b.color+'">Topic</div><div class="child-card-title">'+lbl+'</div>';
    grid.appendChild(c);
  });

  document.getElementById('branch-articles-label').textContent='Recent in '+b.label;
  renderArticleList(document.getElementById('branch-articles'), posts.filter(p=>p.branch===branch), 'branch', 'Essays on '+b.label+' are coming.');
}

function renderTopic(branch,key){
  const b=data[branch], lbl=parentLabel(branch,key);
  document.getElementById('parent-breadcrumb').innerHTML=
    `<a href="${homeUrl()}" data-nav>Home</a><span class="sep">/</span>`
    +`<a href="${branchUrl(branch)}" data-nav style="color:${b.color}">${b.label}</a>`
    +`<span class="sep">/</span><span aria-current="page" style="color:${b.color}">${lbl}</span>`;
  const e=document.getElementById('parent-eyebrow'); e.style.color=b.color; e.textContent=b.label;
  document.getElementById('parent-title').textContent=lbl;
  document.getElementById('parent-articles-label').textContent='Articles in '+lbl;
  renderArticleList(document.getElementById('parent-articles'), posts.filter(p=>isInParent(p,branch,key)), 'topic', 'Essays on '+lbl+' are coming.');
}

function renderArticle(slug){
  const p=allArticles.find(x=>x.slug===slug);
  if(!p) return false;
  const title=document.getElementById('article-title');
  const subtitle=document.getElementById('article-subtitle');
  const eyebrow=document.getElementById('article-eyebrow');
  const breadcrumb=document.getElementById('article-breadcrumb');

  title.textContent=p.title;
  if(p.subtitle){ subtitle.textContent=p.subtitle; subtitle.style.display='block'; }
  else { subtitle.textContent=''; subtitle.style.display='none'; }

  if(p.center){
    breadcrumb.innerHTML=`<a href="${homeUrl()}" data-nav>Home</a>`;
    eyebrow.style.color='var(--article-muted-light)';
    eyebrow.textContent=p.eyebrow || 'Centerpiece';
  } else {
    const b=data[p.branch], labels=parentLabels(p);
    const topicLinks=parentKeys(p).map(k=>
      `<a href="${topicUrl(p.branch,k)}" data-nav style="color:${b.light}">${parentLabel(p.branch,k)}</a>`
    ).join('<span class="sep">/</span>');
    breadcrumb.innerHTML=`<a href="${homeUrl()}" data-nav>Home</a><span class="sep">/</span>`
      +`<a href="${branchUrl(p.branch)}" data-nav style="color:${b.light}">${b.label}</a>`
      +`<span class="sep">/</span>${topicLinks}`;
    eyebrow.style.color=b.light;
    eyebrow.textContent=fmtDate(p.date)+' · '+b.label+' · '+labels.join(' / ');
  }

  document.getElementById('article-body').innerHTML=p.body || '<p>Article coming soon.</p>';
  return true;
}

// ------------------------------------------------------------
//  Router
// ------------------------------------------------------------
function focusHeading(id){
  const h=document.getElementById(id);
  if(!h) return;
  h.setAttribute('tabindex','-1');
  h.focus({ preventScroll:true });
}

function render(route, opts){
  opts = opts || {};
  const animate = opts.animate !== false;

  switch(route.kind){
    case 'home':
      spinTo(DEFAULT_BRANCH, animate);
      showView('home');
      break;

    case 'branch':
      spinTo(route.branch, animate);
      renderBranch(route.branch);
      showView('branch-page');
      if(opts.focus) focusHeading('branch-title');
      break;

    case 'topic':
      spinTo(route.branch, animate);
      renderTopic(route.branch, route.topic);
      showView('parent-page');
      if(opts.focus) focusHeading('parent-title');
      break;

    case 'article': {
      const ok = renderArticle(route.slug);
      if(!ok){ showView('notfound-page'); break; }
      const p = allArticles.find(a=>a.slug===route.slug);
      if(p && !p.center) spinTo(p.branch, animate);
      showView('article-page');
      if(opts.focus) focusHeading('article-title');
      break;
    }

    case 'recent':
      buildFeed();
      showView('recent');
      if(opts.focus) focusHeading('recent-title');
      break;

    default:
      showView('notfound-page');
      if(opts.focus) focusHeading('notfound-title');
  }

  if(opts.scrollTop !== false) window.scrollTo(0,0);
}

function navigate(url){
  const route = parsePath(new URL(url, window.location.origin).pathname);
  history.pushState(route, '', url);
  render(route, { focus:true });
}

// Intercept in-site link clicks so navigation stays smooth, while
// leaving modified clicks (new tab, external, mail) alone.
document.addEventListener('click', function(ev){
  const a = ev.target.closest ? ev.target.closest('a[data-nav]') : null;
  if(!a) return;
  if(ev.defaultPrevented) return;
  if(ev.button !== 0) return;                                        // not a left click
  if(ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;   // new tab, etc.
  if(a.target && a.target !== '_self') return;

  // SVG <a> exposes href as an SVGAnimatedString, so read the attribute.
  const href = a.getAttribute('href');
  if(!href || /^(https?:|mailto:|tel:)/.test(href)) return;

  ev.preventDefault();
  navigate(href);
});

// Back / Forward.
window.addEventListener('popstate', function(ev){
  const route = ev.state || parsePath(window.location.pathname);
  render(route, { focus:true });
});

// ------------------------------------------------------------
//  Boot
//  ROUTE is injected per-page by the build, so the right state
//  paints on the first frame — no flash, no spin-into-place.
// ------------------------------------------------------------
buildWheel();
history.replaceState(ROUTE, '', window.location.pathname + window.location.search);
render(ROUTE, { animate:false, focus:false });
