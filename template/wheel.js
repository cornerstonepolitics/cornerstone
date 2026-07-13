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
const CENTER_SLUG = (centerPieces[0] && centerPieces[0].slug) || 'cornerstone';

const CX = 310, CY = 310;
const R_IN0 = 110, R_IN1 = 200, R_OUT0 = 202, R_OUT1 = 298;

// ------------------------------------------------------------
//  URL helpers
// ------------------------------------------------------------
function branchUrl(bk){ return '/' + ROUTE_MAP[bk].url + '/'; }
function topicUrl(bk, key){ return '/' + ROUTE_MAP[bk].url + '/' + ROUTE_MAP[bk].topics[key] + '/'; }
function articleUrl(slug){
  // The founding essay sits under its own preview path.
  if(slug === CENTER_SLUG) return '/' + CENTER_SLUG + '/essay/';
  return '/' + slug + '/';
}
function centerUrl(){ return '/' + CENTER_SLUG + '/'; }
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

  // /cornerstone/        -> the preview, shown beneath the wheel
  // /cornerstone/essay/   -> the full founding essay
  if(parts[0] === CENTER_SLUG){
    if(parts.length === 1) return { kind:'center' };
    if(parts[1] === 'essay') return { kind:'article', slug:CENTER_SLUG };
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
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.dark}" pointer-events="none"><textPath href="#${id1}" startOffset="50%" text-anchor="middle">${stack[0].toUpperCase()}</textPath></text>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.dark}" pointer-events="none"><textPath href="#${id2}" startOffset="50%" text-anchor="middle">${stack[1].toUpperCase()}</textPath></text>`;
      } else {
        const outR=R_OUT0+(R_OUT1-R_OUT0)*0.5;
        const pid=`pp${i}_${j}`;
        defs+=`<path id="${pid}" fill="none" d="${outwardArc(outR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        let fs;
        if(oneLineSmall[p[1]]) fs=oneLineSmall[p[1]];
        else { const arcW=(seg-3)*Math.PI/180*outR; fs=Math.max(12, Math.min(17, arcW/(p[1].length*0.62))); }
        svg+=`<text font-family="Georgia,serif" font-size="${fs}" letter-spacing="0.5" font-weight="600" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.dark}" pointer-events="none"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${p[1].toUpperCase()}</textPath></text>`;
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
// Hovering an item makes just that label clearer, matching the
// selected treatment, so you can see exactly what you are pointing at.
function tintLabel(bk, key){
  document.querySelectorAll('.parent-label[data-branch="'+bk+'"][data-topic="'+key+'"]').forEach(el=>{
    el.classList.add('is-selected');
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
  updateWheelFocus(activeBranch);   // restores the true selected state
}

function updateWheelFocus(branch){
  order.forEach(bk=>{
    const b=data[bk];
    const active = (bk===branch);

    document.querySelectorAll('.parent-label[data-branch="'+bk+'"]').forEach(el=>{
      // Ink stays the deep branch colour at all times. Selection is
      // expressed as a stronger halo (CSS), which is legible on every
      // marble tone — unlike the old bright fill, which vanished at
      // 1.0 contrast on mid-tone stone.
      el.setAttribute('fill', b.dark);
      el.classList.toggle('is-selected', active);
    });

    document.querySelectorAll('.branch-label[data-branch="'+bk+'"]').forEach(el=>{
      el.setAttribute('fill', b.wheelLabel);
      el.classList.toggle('is-selected', active);
    });

    document.querySelectorAll('.wedge[data-branch="'+bk+'"]').forEach(el=>{
      el.classList.toggle('is-selected', active);
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
    // Land in position instantly: a deep link opens already-positioned
    // rather than spinning into place.
    root.style.transition='none';
    root.style.transform='rotate('+curRot+'deg)';
    void root.getBoundingClientRect();   // flush before restoring
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
  return b.label+' \u00b7 '+labels;
}
function isInParent(p, branch, key){ return p.branch===branch && parentKeys(p).includes(key); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// The editorial index used on every listing (Recent, branch, topic).
function articleListHtml(list, mode, emptyText){
  const sorted=sortPosts(list);
  if(!sorted.length){
    return '<p class="empty-state">'+esc(emptyText)+'</p>';
  }
  return sorted.map(p=>{
    const metaColor = p.center ? 'var(--warm-muted)' : data[p.branch].color;
    return '<a class="article-row" href="'+articleUrl(p.slug)+'" data-nav>'
      +'<div class="article-date">'+fmtDate(p.date)+'</div>'
      +'<div class="article-meta" style="color:'+metaColor+'">'+esc(articleMeta(p,mode))+'</div>'
      +'<div><div class="article-list-title">'+esc(p.title)+'</div>'
      +(p.dek?'<div class="article-dek">'+esc(p.dek)+'</div>':'')+'</div>'
      +'</a>';
  }).join('');
}

function buildFeed(){
  document.getElementById('feed-list').innerHTML =
    articleListHtml(posts.concat(centerPieces), 'recent', 'Essays are coming.');
}

// ------------------------------------------------------------
//  The four states of the warm section beneath the wheel.
//  It is never blank.
// ------------------------------------------------------------
function latestEssay(){
  const sorted=sortPosts(posts);
  return sorted[0] || centerPieces[0] || null;
}

// DEFAULT: the latest essay, as a quiet feature (no image, no card).
function contentHome(){
  const p=latestEssay();
  if(!p) return '<p class="empty-state">Essays are coming.</p>';
  const label = p.center ? 'Cornerstone' : (data[p.branch].label+' \u00b7 '+parentLabels(p).join(' / '));
  const color = p.center ? 'var(--warm-muted)' : data[p.branch].color;
  return '<div class="feature">'
    +'<div class="feature-label" style="color:'+color+'">'+esc(label)+'</div>'
    +'<div class="feature-date">'+fmtDate(p.date)+'</div>'
    +'<h2 class="feature-title" id="content-heading">'+esc(p.title)+'</h2>'
    +(p.dek?'<p class="feature-dek">'+esc(p.dek)+'</p>':'')
    +'<a class="feature-link" href="'+articleUrl(p.slug)+'" data-nav>Read essay</a>'
    +'</div>';
}

// CENTER: a preview of the founding essay.
function contentCenter(){
  const p=centerPieces[0];
  if(!p) return contentHome();
  return '<div class="feature">'
    +'<div class="feature-label" style="color:var(--warm-muted)">'+esc(p.eyebrow || 'Centerpiece')+'</div>'
    +'<div class="feature-date">'+fmtDate(p.date)+'</div>'
    +'<h2 class="feature-title" id="content-heading">'+esc(p.title)+'</h2>'
    +(p.dek?'<p class="feature-dek">'+esc(p.dek)+'</p>':'')
    +'<a class="feature-link" href="'+articleUrl(p.slug)+'" data-nav>Read essay</a>'
    +'</div>';
}

// BRANCH: name, four principles, four topic links, recent essays.
function contentBranch(branch){
  const b=data[branch];
  const principles = b.principles.map(line=>
    '<li>'+esc(line)+'</li>'
  ).join('');
  const topics = b.parents.map(([k,lbl])=>
    '<a class="topic-link" href="'+topicUrl(branch,k)+'" data-nav>'
      +'<span class="topic-link-name">'+esc(lbl)+'</span>'
    +'</a>'
  ).join('');
  return '<div class="branch-block" style="--accent:'+b.color+'">'
    +'<div class="content-eyebrow" style="color:'+b.color+'">Branch</div>'
    +'<h2 class="content-title" id="content-heading">'+esc(b.label)+'</h2>'
    +'<ul class="principles-list">'+principles+'</ul>'
    +'<div class="content-section">'
      +'<div class="content-label">Topics</div>'
      +'<div class="topic-links">'+topics+'</div>'
    +'</div>'
    +'<div class="content-section">'
      +'<div class="content-label">Recent in '+esc(b.label)+'</div>'
      +'<div class="article-list">'
        +articleListHtml(posts.filter(p=>p.branch===branch),'branch','Essays on '+b.label+' are coming.')
      +'</div>'
    +'</div>'
    +'</div>';
}

// TOPIC: name, its essays, quiet link back to the branch.
function contentTopic(branch,key){
  const b=data[branch], lbl=parentLabel(branch,key);
  return '<div class="topic-block" style="--accent:'+b.color+'">'
    +'<div class="content-eyebrow" style="color:'+b.color+'">'
      +'<a href="'+branchUrl(branch)+'" data-nav style="color:'+b.color+'">'+esc(b.label)+'</a>'
    +'</div>'
    +'<h2 class="content-title" id="content-heading">'+esc(lbl)+'</h2>'
    +'<div class="content-section">'
      +'<div class="article-list">'
        +articleListHtml(posts.filter(p=>isInParent(p,branch,key)),'topic','Essays on '+lbl+' are coming.')
      +'</div>'
    +'</div>'
    +'<a class="back-link" href="'+branchUrl(branch)+'" data-nav>All of '+esc(b.label)+'</a>'
    +'</div>';
}

// Swap the warm section's contents with a restrained fade, keeping
// the section anchored so the page does not jump.
function setWarmContent(html){
  const inner=document.getElementById('wheel-content-inner');
  if(!inner) return;
  if(prefersReducedMotion()){ inner.innerHTML=html; return; }
  inner.classList.add('fading');
  window.setTimeout(()=>{
    inner.innerHTML=html;
    inner.classList.remove('fading');
  }, 150);
}
function setWarmContentNow(html){
  const inner=document.getElementById('wheel-content-inner');
  if(inner){ inner.innerHTML=html; inner.classList.remove('fading'); }
}

// Mobile: show the selected branch's topics as large text links.
function setMobileTopics(branch){
  const nav=document.getElementById('mobile-topics');
  if(!nav) return;
  if(!branch){ nav.hidden=true; nav.innerHTML=''; return; }
  const b=data[branch];
  nav.innerHTML = b.parents.map(([k,lbl])=>
    '<a href="'+topicUrl(branch,k)+'" data-nav style="--accent:'+b.color+'">'+esc(lbl)+'</a>'
  ).join('');
  nav.hidden=false;
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
    breadcrumb.innerHTML='<a href="'+homeUrl()+'" data-nav>Home</a>';
    eyebrow.style.color='var(--warm-muted)';
    eyebrow.textContent=p.eyebrow || 'Centerpiece';
  } else {
    const b=data[p.branch], labels=parentLabels(p);
    const topicLinks=parentKeys(p).map(k=>
      '<a href="'+topicUrl(p.branch,k)+'" data-nav style="color:'+b.light+'">'+esc(parentLabel(p.branch,k))+'</a>'
    ).join('<span class="sep">/</span>');
    breadcrumb.innerHTML='<a href="'+homeUrl()+'" data-nav>Home</a><span class="sep">/</span>'
      +'<a href="'+branchUrl(p.branch)+'" data-nav style="color:'+b.light+'">'+esc(b.label)+'</a>'
      +'<span class="sep">/</span>'+topicLinks;
    eyebrow.style.color=b.light;
    eyebrow.textContent=fmtDate(p.date)+' \u00b7 '+b.label+' \u00b7 '+labels.join(' / ');
  }

  document.getElementById('article-body').innerHTML=p.body || '<p>Article coming soon.</p>';
  return true;
}

// ------------------------------------------------------------
//  Router
//  home / branch / topic are all states of the WHEEL VIEW: the
//  wheel stays on screen and only the warm section changes.
//  article / recent / notfound are full-page reading views.
// ------------------------------------------------------------
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function focusHeading(id){
  const h=document.getElementById(id);
  if(!h) return;
  h.setAttribute('tabindex','-1');
  h.focus({ preventScroll:true });
}

// Move focus (and, on mobile, the viewport) to the fresh content.
function afterContentChange(){
  const h=document.getElementById('content-heading');
  if(!h) return;
  h.setAttribute('tabindex','-1');
  h.focus({ preventScroll:true });

  // Only scroll if the heading is not already visible (desktop usually
  // is; phones usually are not).
  const rect=h.getBoundingClientRect();
  const visible = rect.top >= 0 && rect.top < window.innerHeight * 0.85;
  if(!visible){
    const top = window.scrollY + rect.top - 16;
    if(prefersReducedMotion()) window.scrollTo(0, top);
    else window.scrollTo({ top, behavior:'smooth' });
  }
}

function render(route, opts){
  opts = opts || {};
  const first = opts.first === true;      // very first paint of this page
  const animate = !first;
  const put = first ? setWarmContentNow : setWarmContent;

  switch(route.kind){
    case 'home':
      spinTo(DEFAULT_BRANCH, animate);
      setMobileTopics(null);
      put(contentHome());
      showView('wheel-view');
      break;

    case 'center':
      spinTo(activeBranch, animate);
      setMobileTopics(null);
      put(contentCenter());
      showView('wheel-view');
      break;

    case 'branch':
      spinTo(route.branch, animate);
      setMobileTopics(route.branch);
      put(contentBranch(route.branch));
      showView('wheel-view');
      break;

    case 'topic':
      spinTo(route.branch, animate);
      setMobileTopics(route.branch);
      put(contentTopic(route.branch, route.topic));
      showView('wheel-view');
      break;

    case 'article': {
      if(!renderArticle(route.slug)){ showView('notfound-page'); break; }
      showView('article-page');
      if(!first) focusHeading('article-title');
      break;
    }

    case 'recent':
      buildFeed();
      showView('recent');
      if(!first) focusHeading('recent-title');
      break;

    default:
      showView('notfound-page');
      if(!first) focusHeading('notfound-title');
  }

  const wheelState = ['home','center','branch','topic'].indexOf(route.kind) !== -1;
  if(first){
    window.scrollTo(0,0);
  } else if(wheelState){
    // Content swapped beneath a wheel that never moved: don't jump to
    // the top, just bring the new heading into view if it isn't.
    window.setTimeout(afterContentChange, prefersReducedMotion() ? 0 : 160);
  } else {
    window.scrollTo(0,0);
  }
}

function navigate(url){
  const route = parsePath(new URL(url, window.location.origin).pathname);
  history.pushState(route, '', url);
  render(route);
}

// Intercept in-site link clicks so navigation stays smooth, while
// leaving modified clicks (new tab, external, mail) alone.
document.addEventListener('click', function(ev){
  const a = ev.target.closest ? ev.target.closest('a[data-nav]') : null;
  if(!a) return;
  if(ev.defaultPrevented) return;
  if(ev.button !== 0) return;
  if(ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  if(a.target && a.target !== '_self') return;

  const href = a.getAttribute('href');
  if(!href || /^(https?:|mailto:|tel:)/.test(href)) return;

  ev.preventDefault();
  navigate(href);
});

window.addEventListener('popstate', function(ev){
  const route = ev.state || parsePath(window.location.pathname);
  render(route);
});

// ------------------------------------------------------------
//  First load: a single settling movement, so the wheel reads as
//  something with weight that turns. Once only, never repeated,
//  and skipped entirely for reduced-motion users.
// ------------------------------------------------------------
function settleWheel(){
  if(prefersReducedMotion()) return;
  const root=document.getElementById('wheelRoot');
  if(!root) return;
  const rest=curRot;
  root.style.transition='transform 620ms cubic-bezier(0.22,1,0.36,1)';
  root.style.transform='rotate('+(rest - 5)+'deg)';   // 5 degrees, then back
  window.setTimeout(()=>{
    root.style.transform='rotate('+rest+'deg)';
    window.setTimeout(()=>{ root.style.transition=''; }, 640);
  }, 240);
}

// ------------------------------------------------------------
//  Boot
// ------------------------------------------------------------
buildWheel();
history.replaceState(ROUTE, '', window.location.pathname + window.location.search);
render(ROUTE, { first:true });
if(ROUTE.kind === 'home') settleWheel();
