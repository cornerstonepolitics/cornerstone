// ============================================================
//  CORNERSTONE — WHEEL ENHANCEMENT
// ============================================================
//  The server has already rendered the current route. This file
//  draws the wheel and progressively enhances navigation among the
//  home, branch, and topic states. Article links remain ordinary
//  page navigations so article bodies never need to ship globally.
// ============================================================

(function () {
  const payload = window.CORNERSTONE_DATA;
  const wheelRoot = document.getElementById('wheelRoot');
  if (!payload || !wheelRoot) return;

  const data = payload.siteConfig;
  const order = payload.branchOrder;
  const cornerstonePrinciples = payload.cornerstonePrinciples || [];
  const ROUTE_MAP = payload.routeMap;
  const allArticles = payload.articles || [];
  const centerPieces = allArticles.filter(article => article.center);
  const posts = allArticles.filter(article => !article.center);

  const DEFAULT_BRANCH = 'economics';
  const CENTER_SLUG = centerPieces[0]?.slug || 'cornerstone';
  const CX = 310;
  const CY = 310;
  const R_IN0 = 102;
  const R_IN1 = 197;
  const R_OUT0 = 197;
  const R_OUT1 = 306;
  const mobileMedia = window.matchMedia('(max-width: 560px)');
  const twoLine = { 'Foreign Policy': ['Policy', 'Foreign'], 'Rule of Law': ['Rule of', 'Law'] };
  const oneLineSmall = { Institutions: 13 };

  let currentRoute = parseWheelPath(window.location.pathname) || { kind: 'home' };
  let currentRotation = 0;
  let activeBranch = currentRoute.branch || DEFAULT_BRANCH;

  function branchUrl(branch) {
    return `/${ROUTE_MAP[branch].url}/`;
  }

  function topicUrl(branch, topic) {
    return `/${ROUTE_MAP[branch].url}/${ROUTE_MAP[branch].topics[topic]}/`;
  }

  function articleUrl(slug) {
    return slug === CENTER_SLUG ? `/${CENTER_SLUG}/essay/` : `/${slug}/`;
  }

  function centerUrl() {
    return `/${CENTER_SLUG}/`;
  }

  function parseWheelPath(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return { kind: 'home' };
    if (parts[0] === CENTER_SLUG && parts.length === 1) return { kind: 'center' };

    const branch = order.find(key => ROUTE_MAP[key].url === parts[0]);
    if (!branch) return null;
    if (parts.length === 1) return { kind: 'branch', branch };
    if (parts.length !== 2) return null;
    const topic = Object.keys(ROUTE_MAP[branch].topics)
      .find(key => ROUTE_MAP[branch].topics[key] === parts[1]);
    return topic ? { kind: 'topic', branch, topic } : null;
  }

  function pol(radius, degrees) {
    const angle = (degrees - 90) * Math.PI / 180;
    return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
  }

  function wedge(innerRadius, outerRadius, startAngle, endAngle) {
    const [x0, y0] = pol(outerRadius, startAngle);
    const [x1, y1] = pol(outerRadius, endAngle);
    const [x2, y2] = pol(innerRadius, endAngle);
    const [x3, y3] = pol(innerRadius, startAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M${x0},${y0} A${outerRadius},${outerRadius} 0 ${large},1 ${x1},${y1} L${x2},${y2} A${innerRadius},${innerRadius} 0 ${large},0 ${x3},${y3} Z`;
  }

  function outwardArc(radius, startAngle, endAngle) {
    const [x0, y0] = pol(radius, startAngle);
    const [x1, y1] = pol(radius, endAngle);
    const sweep = endAngle > startAngle ? 1 : 0;
    const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M${x0},${y0} A${radius},${radius} 0 ${large},${sweep} ${x1},${y1}`;
  }

  function buildWheel() {
    const mobile = mobileMedia.matches;
    let svg = `<circle cx="${CX}" cy="${CY}" r="${R_OUT1}" fill="url(#marble)"/>`;
    let defs = '';

    order.forEach((branchKey, branchIndex) => {
      const branch = data[branchKey];
      const center = 180 + branchIndex * 120;
      const start = center - 60;
      const end = center + 60;
      const branchOuterRadius = mobile ? R_OUT1 : R_IN1;

      svg += `<path class="branch-glow" data-branch="${branchKey}" d="${wedge(R_IN0, R_OUT1, start, end)}" fill="#fff8ea" opacity="0" pointer-events="none"/>`;
      svg += `<a href="${branchUrl(branchKey)}" class="wedge-link" data-wheel-nav aria-label="${esc(branch.label)}">`
        + `<path class="wedge branch-wedge" data-branch="${branchKey}" d="${wedge(R_IN0, branchOuterRadius, start, end)}" fill="url(#marble)" stroke="#000" onmouseenter="hoverBranch('${branchKey}')" onmouseleave="clearHover()"/>`
        + '</a>';

      const labelRadius = mobile
        ? R_IN0 + (R_OUT1 - R_IN0) * 0.48
        : R_IN0 + (R_IN1 - R_IN0) * 0.58;
      const branchPath = `branch-path-${branchIndex}`;
      defs += `<path id="${branchPath}" fill="none" d="${outwardArc(labelRadius, center + 43, center - 43)}"/>`;
      const branchFontSize = branchKey === 'governance' ? 20 : 22;
      const branchTracking = branchKey === 'governance' ? 2.2 : 3.2;
      svg += `<text font-family="Georgia,serif" font-size="${branchFontSize}" letter-spacing="${branchTracking}" font-weight="700" class="branch-label branch-label-${branchKey}" data-branch="${branchKey}" fill="${branch.wheelLabel}" pointer-events="none"><textPath href="#${branchPath}" startOffset="50%" text-anchor="middle">${branch.label.toUpperCase()}</textPath></text>`;

      if (mobile) return;

      const segment = 120 / branch.parents.length;
      branch.parents.forEach(([topicKey, label], topicIndex) => {
        const topicStart = start + topicIndex * segment;
        const topicEnd = start + (topicIndex + 1) * segment;
        const middle = (topicStart + topicEnd) / 2;

        svg += `<a href="${topicUrl(branchKey, topicKey)}" class="wedge-link" data-wheel-nav aria-label="${esc(label)}, in ${esc(branch.label)}">`
          + `<path class="wedge topic-wedge" data-branch="${branchKey}" data-topic="${topicKey}" d="${wedge(R_OUT0, R_OUT1, topicStart, topicEnd)}" fill="url(#marble)" stroke="#000" onmouseenter="hoverTopic('${branchKey}','${topicKey}')" onmouseleave="clearHover()"/>`
          + '</a>';

        const stack = twoLine[label];
        const onBottom = middle % 360 > 90 && middle % 360 < 270;
        if (stack) {
          const outer = R_OUT0 + (R_OUT1 - R_OUT0) * 0.62;
          const inner = R_OUT0 + (R_OUT1 - R_OUT0) * 0.38;
          const firstRadius = onBottom ? inner : outer;
          const secondRadius = onBottom ? outer : inner;
          const firstPath = `topic-path-${branchIndex}-${topicIndex}-a`;
          const secondPath = `topic-path-${branchIndex}-${topicIndex}-b`;
          defs += `<path id="${firstPath}" fill="none" d="${outwardArc(firstRadius, middle + segment / 2 - 1.5, middle - segment / 2 + 1.5)}"/>`;
          defs += `<path id="${secondPath}" fill="none" d="${outwardArc(secondRadius, middle + segment / 2 - 1.5, middle - segment / 2 + 1.5)}"/>`;
          svg += topicText(firstPath, branchKey, topicKey, stack[0], branch.wheelLabel, 13);
          svg += topicText(secondPath, branchKey, topicKey, stack[1], branch.wheelLabel, 13);
        } else {
          const radius = R_OUT0 + (R_OUT1 - R_OUT0) * 0.50;
          const topicPath = `topic-path-${branchIndex}-${topicIndex}`;
          defs += `<path id="${topicPath}" fill="none" d="${outwardArc(radius, middle + segment / 2 - 1.5, middle - segment / 2 + 1.5)}"/>`;
          const arcWidth = (segment - 4) * Math.PI / 180 * radius;
          const fontSize = oneLineSmall[label] || Math.max(11, Math.min(16, arcWidth / (label.length * 0.80)));
          svg += topicText(topicPath, branchKey, topicKey, label, branch.wheelLabel, fontSize);
        }
      });
    });

    svg += `<circle cx="${CX}" cy="${CY}" r="${R_OUT1}" fill="none" stroke="#000" stroke-opacity="0.38" stroke-width="1.6" pointer-events="none"/>`;
    if (!mobile) {
      svg += `<circle cx="${CX}" cy="${CY}" r="${R_IN1}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="1.15" pointer-events="none"/>`;
    }
    [120, 240, 360].forEach(degrees => {
      const [x0, y0] = pol(R_IN0, degrees);
      const [x1, y1] = pol(R_OUT1, degrees);
      svg += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#000" stroke-opacity="0.34" stroke-width="3.8" pointer-events="none"/>`;
    });

    wheelRoot.innerHTML = `<defs>${defs}</defs>${svg}`;
  }

  function topicText(pathId, branch, topic, label, fill, fontSize) {
    return `<text font-family="Georgia,serif" font-size="${fontSize}" letter-spacing="0.5" font-weight="700" class="parent-label parent-label-${branch}" data-branch="${branch}" data-topic="${topic}" fill="${fill}" pointer-events="none"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${label.toUpperCase()}</textPath></text>`;
  }

  function brightenBranch(branch, on) {
    document.querySelectorAll(`.wedge[data-branch="${branch}"]`)
      .forEach(element => element.classList.toggle('hot', on));
  }

  function markHovered(element, on) {
    if (element) element.classList.toggle('hovered', on);
  }

  function brightenLabel(selector, on) {
    document.querySelectorAll(selector).forEach(element => element.classList.toggle('lit', on));
  }

  window.hoverBranch = function hoverBranch(branch) {
    brightenBranch(branch, true);
    markHovered(document.querySelector(`.branch-wedge[data-branch="${branch}"]`), true);
    brightenLabel(`.branch-label[data-branch="${branch}"]`, true);
  };

  window.hoverTopic = function hoverTopic(branch, topic) {
    brightenBranch(branch, true);
    markHovered(document.querySelector(`.topic-wedge[data-branch="${branch}"][data-topic="${topic}"]`), true);
    brightenLabel(`.parent-label[data-branch="${branch}"][data-topic="${topic}"]`, true);
  };

  window.clearHover = function clearHover() {
    document.querySelectorAll('.wedge.hot').forEach(element => element.classList.remove('hot'));
    document.querySelectorAll('.wedge.hovered').forEach(element => element.classList.remove('hovered'));
    document.querySelectorAll('.lit').forEach(element => element.classList.remove('lit'));
    updateWheelFocus(activeBranch);
  };

  function updateWheelFocus(branch) {
    order.forEach(branchKey => {
      const branchData = data[branchKey];
      const selected = branchKey === branch;
      document.querySelectorAll(`.parent-label[data-branch="${branchKey}"]`)
        .forEach(element => {
          element.setAttribute('fill', branchData.wheelLabel);
          element.classList.toggle('is-selected', selected);
        });
      document.querySelectorAll(`.branch-label[data-branch="${branchKey}"]`)
        .forEach(element => {
          element.setAttribute('fill', branchData.wheelLabel);
          element.classList.toggle('is-selected', selected);
        });
      document.querySelectorAll(`.wedge[data-branch="${branchKey}"]`)
        .forEach(element => element.classList.toggle('is-selected', selected));
      document.querySelectorAll(`.branch-glow[data-branch="${branchKey}"]`)
        .forEach(element => element.classList.toggle('is-selected', selected));
    });
  }

  function spinTo(branch, animate) {
    activeBranch = branch;
    const index = order.indexOf(branch);
    const target = -index * 120;
    const difference = ((target - currentRotation) % 360 + 540) % 360 - 180;
    currentRotation += difference;
    if (!animate) {
      wheelRoot.style.transition = 'none';
      wheelRoot.style.transform = `rotate(${currentRotation}deg)`;
      void wheelRoot.getBoundingClientRect();
      wheelRoot.style.transition = '';
    } else {
      wheelRoot.style.transform = `rotate(${currentRotation}deg)`;
    }
    updateWheelFocus(branch);
  }

  function fmtDate(iso) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  function sortPosts(list) {
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }

  function parentLabel(branch, topic) {
    const match = data[branch].parents.find(([key]) => key === topic);
    return match ? match[1] : topic;
  }

  function parentLabels(article) {
    return (article.parents || []).map(topic => parentLabel(article.branch, topic));
  }

  function articleListHtml(list, mode, emptyText) {
    const sorted = sortPosts(list);
    if (!sorted.length) return `<p class="empty-state">${esc(emptyText)}</p>`;
    return sorted.map(article => {
      const metaColor = article.center ? 'var(--warm-muted)' : data[article.branch].color;
      let meta = 'Cornerstone';
      if (!article.center) {
        const labels = parentLabels(article).join(' / ');
        if (mode === 'branch') meta = labels;
        else if (mode === 'topic') meta = data[article.branch].label;
        else meta = `${data[article.branch].label} · ${labels}`;
      }
      return `<a class="article-row" href="${articleUrl(article.slug)}">
        <time class="article-date" datetime="${article.date}">${fmtDate(article.date)}</time>
        <span class="article-meta" style="color:${metaColor}">${esc(meta)}</span>
        <span><span class="article-list-title">${esc(article.title)}</span>${article.dek ? `<span class="article-dek">${esc(article.dek)}</span>` : ''}</span>
      </a>`;
    }).join('');
  }

  function contentHome() {
    const center = centerPieces[0];
    const feature = center ? `<div class="center-row">
      <a class="center-row-title" href="${articleUrl(center.slug)}">${esc(center.title)}</a>
      <time class="center-row-date" datetime="${center.date}">${fmtDate(center.date)}</time>
      <a class="center-row-link" href="${articleUrl(center.slug)}">Read essay</a>
    </div>` : '';
    const principles = `<ul class="principles-list home-principles">${cornerstonePrinciples
      .map(line => `<li>${esc(line)}</li>`).join('')}</ul>`;
    const recent = sortPosts(posts).slice(0, 3);
    const rows = recent.length ? recent.map(article => {
      const branch = data[article.branch];
      return `<a class="essay-row" href="${articleUrl(article.slug)}" style="--accent:${branch.color}">
        <span class="essay-row-meta"><time class="essay-row-date" datetime="${article.date}">${fmtDate(article.date)}</time><span class="essay-row-branch" style="color:${branch.color}">${esc(branch.label)} · ${esc(parentLabels(article).join(' / '))}</span></span>
        <span class="essay-row-body"><span class="essay-row-title">${esc(article.title)}</span>${article.dek ? `<span class="essay-row-dek">${esc(article.dek)}</span>` : ''}</span>
      </a>`;
    }).join('') : '<p class="empty-state">Essays are coming.</p>';
    const more = posts.length > 3 ? '<a class="home-all" href="/recent/">All essays</a>' : '';
    return `${feature}${principles}<div class="home-recent content-section"><h2 class="home-recent-heading" id="content-heading">Recent essays</h2><div class="essay-list">${rows}</div>${more}</div>`;
  }

  function contentBranch(branchKey) {
    const branch = data[branchKey];
    const principles = branch.principles.map(line => `<li>${esc(line)}</li>`).join('');
    const articles = posts.filter(article => article.branch === branchKey);
    return `<div class="branch-block" style="--accent:${branch.color}">
      <div class="content-eyebrow" style="color:${branch.color}">Branch</div>
      <h1 class="content-title" id="content-heading">${esc(branch.label)}</h1>
      <ul class="principles-list">${principles}</ul>
      <div class="content-section"><div class="content-label">Recent in ${esc(branch.label)}</div><div class="article-list">${articleListHtml(articles, 'branch', `Essays on ${branch.label} are coming.`)}</div></div>
    </div>`;
  }

  function contentTopic(branchKey, topic) {
    const branch = data[branchKey];
    const label = parentLabel(branchKey, topic);
    const articles = posts.filter(article => article.branch === branchKey && article.parents.includes(topic));
    return `<div class="topic-block" style="--accent:${branch.color}">
      <div class="content-eyebrow" style="color:${branch.color}"><a href="${branchUrl(branchKey)}" data-wheel-nav>${esc(branch.label)}</a></div>
      <h1 class="content-title" id="content-heading">${esc(label)}</h1>
      <div class="content-section"><div class="article-list">${articleListHtml(articles, 'topic', `Essays on ${label} are coming.`)}</div></div>
      <a class="back-link" href="${branchUrl(branchKey)}" data-wheel-nav>All of ${esc(branch.label)}</a>
    </div>`;
  }

  function setWarmContent(html, immediate) {
    const inner = document.getElementById('wheel-content-inner');
    if (!inner) return;
    if (immediate || prefersReducedMotion()) {
      inner.innerHTML = html;
      inner.classList.remove('fading');
      return;
    }
    inner.classList.add('fading');
    window.setTimeout(() => {
      inner.innerHTML = html;
      inner.classList.remove('fading');
    }, 150);
  }

  function setMobileTopics(branchKey) {
    const nav = document.getElementById('mobile-topics');
    if (!nav) return;
    if (!branchKey) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }
    const branch = data[branchKey];
    nav.innerHTML = branch.parents.map(([topic, label]) =>
      `<a href="${topicUrl(branchKey, topic)}" data-wheel-nav style="--accent:${branch.color}">${esc(label)}</a>`
    ).join('');
    nav.hidden = false;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function afterContentChange() {
    const heading = document.getElementById('content-heading');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.top < window.innerHeight * 0.85;
    if (!visible) {
      const top = window.scrollY + rect.top - 16;
      window.scrollTo(prefersReducedMotion() ? { top } : { top, behavior: 'smooth' });
    }
  }

  function metaForRoute(route) {
    if (route.kind === 'branch') {
      const label = data[route.branch].label;
      return { title: `${label} — Cornerstone`, description: `Independent essays and principles on ${label.toLowerCase()} from Cornerstone.` };
    }
    if (route.kind === 'topic') {
      const branch = data[route.branch];
      const label = parentLabel(route.branch, route.topic);
      return { title: `${label} — ${branch.label} — Cornerstone`, description: `Independent essays on ${label.toLowerCase()} within ${branch.label.toLowerCase()} from Cornerstone.` };
    }
    return { title: 'Cornerstone', description: payload.defaultDescription };
  }

  function updateDocumentMeta(route) {
    const meta = metaForRoute(route);
    const url = `${payload.baseUrl}${window.location.pathname}`;
    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = url;
    updateHeaderCurrent(route);
  }

  function setMeta(selector, attribute, value) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute(attribute, value);
  }

  function updateHeaderCurrent(route) {
    document.querySelectorAll('.nav-links [aria-current]')
      .forEach(link => link.removeAttribute('aria-current'));
    if (!route.branch) return;
    const link = document.querySelector(`.nav-links a[href="${branchUrl(route.branch)}"]`);
    if (link) link.setAttribute('aria-current', 'page');
  }

  function render(route, options = {}) {
    const first = options.first === true;
    if (route.kind === 'home') {
      spinTo(DEFAULT_BRANCH, !first);
      setMobileTopics(null);
      if (!first) setWarmContent(contentHome(), false);
    } else if (route.kind === 'center') {
      spinTo(activeBranch, !first);
      setMobileTopics(null);
      if (!first) setWarmContent(contentHome(), false);
    } else if (route.kind === 'branch') {
      spinTo(route.branch, !first);
      setMobileTopics(route.branch);
      if (!first) setWarmContent(contentBranch(route.branch), false);
    } else if (route.kind === 'topic') {
      spinTo(route.branch, !first);
      setMobileTopics(route.branch);
      if (!first) setWarmContent(contentTopic(route.branch, route.topic), false);
    }

    currentRoute = route;
    updateDocumentMeta(route);
    if (!first && ['branch', 'topic'].includes(route.kind)) {
      window.setTimeout(afterContentChange, prefersReducedMotion() ? 0 : 160);
    }
    if (route.kind === 'home' || route.kind === 'center') window.scrollTo(0, 0);
  }

  function navigate(url, route) {
    history.pushState(route, '', url);
    render(route);
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest?.('a[data-wheel-nav]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    const route = parseWheelPath(url.pathname);
    if (!route) return;
    event.preventDefault();
    navigate(url.pathname, route);
  });

  window.addEventListener('popstate', function () {
    const route = parseWheelPath(window.location.pathname);
    if (route) render(route);
  });

  function settleWheel() {
    if (prefersReducedMotion()) return;
    const rest = currentRotation;
    wheelRoot.style.transition = 'none';
    wheelRoot.style.transform = `rotate(${rest + 25}deg)`;
    void wheelRoot.getBoundingClientRect();
    wheelRoot.style.transition = 'transform 880ms cubic-bezier(0.16, 0.9, 0.24, 1)';
    wheelRoot.style.transform = `rotate(${rest}deg)`;
    window.setTimeout(() => { wheelRoot.style.transition = ''; }, 900);
  }

  function shouldSettle() {
    try {
      if (sessionStorage.getItem('cs_settled')) return false;
      sessionStorage.setItem('cs_settled', '1');
      return true;
    } catch (error) {
      return true;
    }
  }

  function rebuildForViewport() {
    buildWheel();
    spinTo(activeBranch, false);
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  buildWheel();
  spinTo(activeBranch, false);
  history.replaceState(currentRoute, '', window.location.pathname + window.location.search);
  render(currentRoute, { first: true });
  if (currentRoute.kind === 'home' && shouldSettle()) settleWheel();

  if (mobileMedia.addEventListener) mobileMedia.addEventListener('change', rebuildForViewport);
  else if (mobileMedia.addListener) mobileMedia.addListener(rebuildForViewport);
}());
