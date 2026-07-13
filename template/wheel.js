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
// The outer ring reaches further out than it used to, so the twelve topic
// labels sit on a longer arc and have room to breathe. Combined with the
// larger on-screen size (700px, up from 620px), every letter gains about a
// fifth more physical space without changing the type itself.
const R_IN0 = 108, R_IN1 = 196, R_OUT0 = 198, R_OUT1 = 306;

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
  svg+=`<circle cx="${CX}" cy="${CY}" r="${R_OUT1}" fill="url(#marble)"/>`;

  order.forEach((bk,i)=>{
    const b=data[bk];
    const center=180+i*120;
    const a0=center-60, a1=center+60;
    const bHref=branchUrl(bk);

    // A light wash covering the whole third — inner wedge and its four
    // topics as one continuous piece of illuminated stone. Driven by
    // opacity, not filter(), so the marble keeps its warmth.
    svg+=`<path class="branch-glow" data-branch="${bk}" d="${wedge(R_IN0,R_OUT1,a0,a1)}" fill="#fff8ea" opacity="0" pointer-events="none"/>`;

    svg+=`<a href="${bHref}" class="wedge-link" aria-label="${b.label}" data-nav>`
      +`<path class="wedge branch-wedge" data-branch="${bk}" d="${wedge(R_IN0,R_IN1,a0,a1)}" fill="url(#marble)" stroke="#000" stroke-opacity="0.3" stroke-width="1.7" onmouseenter="hoverBranch('${bk}')" onmouseleave="clearHover()"/>`
      +`</a>`;

    // Baseline sits inward of the ring's centre so the glyph body, not the
    // baseline, is what ends up centred. Nudged slightly past geometric
    // centre for optical balance.
    const inR=R_IN0+(R_IN1-R_IN0)*0.40;
    const ipid=`bp${i}`;
    defs+=`<path id="${ipid}" fill="none" d="${outwardArc(inR, center+43, center-43)}"/>`;
    const branchFontSize = bk==='governance' ? 20 : 22;
    const branchLetterSpacing = bk==='governance' ? 2.2 : 3.2;
    svg+=`<text font-family="Georgia,serif" font-size="${branchFontSize}" letter-spacing="${branchLetterSpacing}" font-weight="700" class="branch-label branch-label-${bk}" data-branch="${bk}" fill="${b.wheelLabelInner || b.wheelLabel}" pointer-events="none"><textPath href="#${ipid}" startOffset="50%" text-anchor="middle">${b.label.toUpperCase()}</textPath></text>`;

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
        // A stacked pair is centred as a unit: one line above the ring's centre,
        // one below, each corrected for its own baseline.
        const rOuter=R_OUT0+(R_OUT1-R_OUT0)*0.57, rInner=R_OUT0+(R_OUT1-R_OUT0)*0.29;
        const firstR=onBottom?rInner:rOuter, secondR=onBottom?rOuter:rInner;
        const id1=`pp${i}_${j}a`, id2=`pp${i}_${j}b`;
        defs+=`<path id="${id1}" fill="none" d="${outwardArc(firstR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        defs+=`<path id="${id2}" fill="none" d="${outwardArc(secondR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="700" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.wheelLabel}" pointer-events="none"><textPath href="#${id1}" startOffset="50%" text-anchor="middle">${stack[0].toUpperCase()}</textPath></text>`;
        svg+=`<text font-family="Georgia,serif" font-size="13" letter-spacing="0.5" font-weight="700" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.wheelLabel}" pointer-events="none"><textPath href="#${id2}" startOffset="50%" text-anchor="middle">${stack[1].toUpperCase()}</textPath></text>`;
      } else {
        // The baseline sits inward of the ring's centre, because glyphs grow
        // upward (outward) from a baseline. 46% centres them geometrically —
        // but on a curved band the eye still reads text as riding high, so
        // this is nudged to 43% for OPTICAL centre. Trust the eye over the
        // formula: geometric centre and visual centre are not the same thing.
        const outR=R_OUT0+(R_OUT1-R_OUT0)*0.43;
        const pid=`pp${i}_${j}`;
        defs+=`<path id="${pid}" fill="none" d="${outwardArc(outR, mid+seg/2-1.5, mid-seg/2+1.5)}"/>`;
        let fs;
        if(oneLineSmall[p[1]]) fs=oneLineSmall[p[1]];
        else { const arcW=(seg-3)*Math.PI/180*outR; fs=Math.max(12, Math.min(17, arcW/(p[1].length*0.62))); }
        svg+=`<text font-family="Georgia,serif" font-size="${fs}" letter-spacing="0.5" font-weight="700" class="parent-label parent-label-${bk}" data-branch="${bk}" data-topic="${p[0]}" fill="${b.wheelLabel}" pointer-events="none"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${p[1].toUpperCase()}</textPath></text>`;
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

// The single box under the cursor: outlined, and its own label brightened.
// This is what says "this individual piece is clickable", as distinct from
// the whole-third cue that says "clicking here will spin the wheel".
function markHovered(el, on){
  if(el) el.classList.toggle('hovered', on);
}
function brightenLabel(sel, on){
  document.querySelectorAll(sel).forEach(el=>el.classList.toggle('lit', on));
}

function hoverBranch(bk){
  const wedge = document.querySelector('.branch-wedge[data-branch="'+bk+'"]');
  markHovered(wedge, true);
  brightenLabel('.branch-label[data-branch="'+bk+'"]', true);
  // On a branch that is not selected, also light the whole third: clicking
  // will rotate the wheel there, and the third is what moves.
  if(bk!==activeBranch) brightenBranch(bk, true);
}

function hoverTopic(bk, key){
  const wedge = document.querySelector('.topic-wedge[data-branch="'+bk+'"][data-topic="'+key+'"]');
  markHovered(wedge, true);
  brightenLabel('.parent-label[data-branch="'+bk+'"][data-topic="'+key+'"]', true);
  if(bk!==activeBranch) brightenBranch(bk, true);
}

function clearHover(){
  document.querySelectorAll('.wedge.hot').forEach(el=>el.classList.remove('hot'));
  document.querySelectorAll('.wedge.hovered').forEach(el=>el.classList.remove('hovered'));
  document.querySelectorAll('.lit').forEach(el=>el.classList.remove('lit'));
  updateWheelFocus(activeBranch);
}

function updateWheelFocus(branch){
  order.forEach(bk=>{
    const b=data[bk];
    const active = (bk===branch);

    document.querySelectorAll('.parent-label[data-branch="'+bk+'"]').forEach(el=>{
      // The outer labels get exactly what the inner ones get: the
      // branch colour on stone. A deeper "ink" measured better for
      // contrast but read as heavy and muddy, and it flattened the
      // marble's warmth. Same treatment inside and out.
      el.setAttribute('fill', b.wheelLabel);
      el.classList.toggle('is-selected', active);
    });

    document.querySelectorAll('.branch-label[data-branch="'+bk+'"]').forEach(el=>{
      // The inner labels sit on paler marble. Identical ink LOOKS darker there
      // (simultaneous contrast), so they carry a slightly lifted tone in order
      // to read at the same brightness as the outer ring. Equal perceived
      // legibility, not equal hex values.
      el.setAttribute('fill', b.wheelLabelInner || b.wheelLabel);
      el.classList.toggle('is-selected', active);
    });

    document.querySelectorAll('.wedge[data-branch="'+bk+'"]').forEach(el=>{
      el.classList.toggle('is-selected', active);
    });
    // The selected third is lit as one continuous piece of stone.
    document.querySelectorAll('.branch-glow[data-branch="'+bk+'"]').forEach(el=>{
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

// DEFAULT: the three most recent essays, plainly labelled. A doorway,
// not a destination — the wheel is still the homepage.
function contentHome(){
  const recent = sortPosts(posts).slice(0, 3);
  if(!recent.length){
    return '<div class="home-recent">'
      +'<h2 class="content-label" id="content-heading">Recent essays</h2>'
      +'<p class="empty-state">Essays are coming.</p></div>';
  }
  const rows = recent.map(p=>{
    const b = data[p.branch];
    return '<a class="essay-row" href="'+articleUrl(p.slug)+'" data-nav style="--accent:'+b.color+'">'
      +'<div class="essay-row-meta">'
        +'<time class="essay-row-date" datetime="'+p.date+'">'+fmtDate(p.date)+'</time>'
        +'<span class="essay-row-branch" style="color:'+b.color+'">'
          +esc(b.label)+' \u00b7 '+esc(parentLabels(p).join(' / '))
        +'</span>'
      +'</div>'
      +'<div class="essay-row-body">'
        +'<span class="essay-row-title">'+esc(p.title)+'</span>'
        +(p.dek?'<span class="essay-row-dek">'+esc(p.dek)+'</span>':'')
      +'</div>'
      +'</a>';
  }).join('');

  const more = posts.length > 3
    ? '<a class="home-all" href="'+recentUrl()+'" data-nav>All essays</a>'
    : '';

  return '<div class="home-recent">'
    +'<h2 class="home-recent-heading" id="content-heading">Recent essays</h2>'
    +'<div class="essay-list">'+rows+'</div>'
    + more
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
  const meta=document.getElementById('article-eyebrow');
  const breadcrumb=document.getElementById('article-breadcrumb');

  title.textContent=p.title;

  // A deck only appears when the essay actually has one. It is not
  // required, and an empty one is not rendered.
  if(p.subtitle){ subtitle.textContent=p.subtitle; subtitle.style.display='block'; }
  else { subtitle.textContent=''; subtitle.style.display='none'; }

  // ---- breadcrumb + metadata -------------------------------------
  // Metadata reads:  Cornerstone · [date] · [Branch] · [Topic]
  // with branch and topic clickable.
  if(p.center){
    breadcrumb.innerHTML='<a href="'+homeUrl()+'" data-nav>Home</a>';
    meta.innerHTML='<span class="meta-author">Cornerstone</span>'
      +'<span class="meta-sep">\u00b7</span>'
      +'<time datetime="'+p.date+'">'+fmtDate(p.date)+'</time>';
  } else {
    const b=data[p.branch];
    const topicLinks=parentKeys(p).map(k=>
      '<a href="'+topicUrl(p.branch,k)+'" data-nav>'+esc(parentLabel(p.branch,k))+'</a>'
    ).join('<span class="sep">/</span>');

    breadcrumb.innerHTML='<a href="'+branchUrl(p.branch)+'" data-nav>'+esc(b.label)+'</a>'
      +'<span class="sep">/</span>'+topicLinks;

    meta.innerHTML='<span class="meta-author">Cornerstone</span>'
      +'<span class="meta-sep">\u00b7</span>'
      +'<time datetime="'+p.date+'">'+fmtDate(p.date)+'</time>'
      +'<span class="meta-sep">\u00b7</span>'
      +'<a href="'+branchUrl(p.branch)+'" data-nav style="color:'+b.light+'">'+esc(b.label)+'</a>'
      +'<span class="meta-sep">\u00b7</span>'
      +parentKeys(p).map(k=>
          '<a href="'+topicUrl(p.branch,k)+'" data-nav style="color:'+b.light+'">'+esc(parentLabel(p.branch,k))+'</a>'
        ).join('<span class="meta-sep">/</span>')
      + (p.updated ? '<span class="meta-sep">\u00b7</span><span class="meta-updated">Updated '+fmtDate(p.updated)+'</span>' : '');
  }

  // ---- body, with the footnote block lifted out as SOURCES --------
  const body=document.getElementById('article-body');
  body.innerHTML = p.body || '<p>Essay coming soon.</p>';

  const sources=document.getElementById('article-sources');
  sources.innerHTML='';
  const fn = body.querySelector('section.footnotes, [data-footnotes]');
  if(fn){
    // marked-footnote already gives us an <ol> with linked references and
    // back-links. We only need to move it into the endmatter and give it a
    // real heading. The list numbers itself, so nothing is typed by hand.
    fn.remove();
    const ol = fn.querySelector('ol');
    if(ol){
      const h = document.createElement('h2');
      h.className='sources-heading';
      h.textContent='Sources';
      sources.appendChild(h);
      ol.className='sources-list';
      sources.appendChild(ol);
    }
  }

  // ---- endmatter: one quiet way back, one related essay -----------
  const back=document.getElementById('article-back');
  if(p.center){
    back.innerHTML='<a href="'+homeUrl()+'" data-nav>Return home</a>';
  } else {
    const b=data[p.branch];
    const firstTopic=parentKeys(p)[0];
    back.innerHTML='<a href="'+topicUrl(p.branch,firstTopic)+'" data-nav>'
      +'More on '+esc(parentLabel(p.branch,firstTopic))+'</a>';
  }

  // At most ONE related essay, chosen deliberately: the nearest piece that
  // shares a topic. No grids, no "you may also like", no endless lists.
  const related=document.getElementById('article-related');
  related.innerHTML='';
  const rel = pickRelated(p);
  if(rel){
    const rb = rel.center ? null : data[rel.branch];
    related.innerHTML='<div class="related-label">Read next</div>'
      +'<a class="related-link" href="'+articleUrl(rel.slug)+'" data-nav>'
      +'<span class="related-title">'+esc(rel.title)+'</span>'
      +(rel.dek?'<span class="related-dek">'+esc(rel.dek)+'</span>':'')
      +'</a>';
  }

  return true;
}

// One related essay: prefer a piece sharing a topic, then the same branch,
// then the most recent other essay. Deliberate, not algorithmic sprawl.
function pickRelated(p){
  const others = allArticles.filter(a=>a.slug!==p.slug);
  if(!others.length) return null;
  if(!p.center){
    const keys = parentKeys(p);
    const sharesTopic = others.filter(a=>!a.center && a.branch===p.branch
      && parentKeys(a).some(k=>keys.includes(k)));
    if(sharesTopic.length) return sortPosts(sharesTopic)[0];
    const sameBranch = others.filter(a=>!a.center && a.branch===p.branch);
    if(sameBranch.length) return sortPosts(sameBranch)[0];
  }
  const posts_ = others.filter(a=>!a.center);
  return posts_.length ? sortPosts(posts_)[0] : others[0];
}

// Copy link: a small text action, no icons, no share rail.
function initCopyLink(){
  const btn=document.getElementById('copy-link');
  const status=document.getElementById('copy-status');
  if(!btn) return;
  btn.addEventListener('click', function(){
    const url = window.location.origin + window.location.pathname;
    const done = ()=>{
      status.textContent='Copied';
      window.setTimeout(()=>{ status.textContent=''; }, 2000);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(done).catch(()=>{ status.textContent='Press Ctrl+C'; });
    } else {
      const ta=document.createElement('textarea');
      ta.value=url; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); done(); }catch(e){ status.textContent='Press Ctrl+C'; }
      document.body.removeChild(ta);
    }
  });
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

  // The wheel must announce, once, that it is a thing which turns.
  // A 5-degree nudge was too small to register. This is a single
  // deliberate rotation into rest: the wheel starts a quarter-turn
  // off and swings home under its own weight.
  //
  // Deliberately NOT a roulette spin. No multiple revolutions, no
  // fast whirl, no clatter to a stop — those read as a game of
  // chance. This reads as mass: it starts, it decelerates hard, it
  // settles. Under one second, once, and never on a return visit.
  const rest = curRot;
  const from = rest + 25;                    // a quarter of a branch, offset

  root.style.transition = 'none';
  root.style.transform  = 'rotate(' + from + 'deg)';
  void root.getBoundingClientRect();         // commit the start position

  // Heavy deceleration: quick to move, slow to stop. Weight, not spin.
  root.style.transition = 'transform 880ms cubic-bezier(0.16, 0.9, 0.24, 1)';
  root.style.transform  = 'rotate(' + rest + 'deg)';

  window.setTimeout(()=>{ root.style.transition=''; }, 900);
}

// Once per visitor, not once per page load. A returning reader should
// not have to sit through the introduction again.
function shouldSettle(){
  try {
    if(sessionStorage.getItem('cs_settled')) return false;
    sessionStorage.setItem('cs_settled','1');
    return true;
  } catch(e){
    return true;   // private mode etc: erring toward showing it once
  }
}

// ------------------------------------------------------------
//  Boot
// ------------------------------------------------------------
buildWheel();
initCopyLink();
history.replaceState(ROUTE, '', window.location.pathname + window.location.search);
render(ROUTE, { first:true });
if(ROUTE.kind === 'home' && shouldSettle()) settleWheel();