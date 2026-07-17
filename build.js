// ============================================================
//  CORNERSTONE — STATIC SITE BUILD
// ============================================================
//  Each public URL receives one semantic page with only the content
//  that belongs at that URL. Shared CSS and JavaScript are emitted as
//  cacheable assets. Wheel pages keep their in-place navigation as a
//  progressive enhancement; ordinary links still work without JS.
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');
const { marked } = require('marked');
const footnote = require('marked-footnote');

marked.use(footnote());

const ROOT = __dirname;
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const DIST_DIR = path.join(ROOT, 'docs');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const BASE_URL = 'https://cornerstonepolitics.org';
const DEFAULT_DESCRIPTION = 'Independent essays on the systems shaping American politics.';

const { siteConfig, branchOrder, cornerstonePrinciples } = require(
  path.join(ROOT, 'content', 'config.js')
);

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function normalizeDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '');
}

function urlSlug(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function fmtDate(iso) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${iso}T00:00:00Z`));
}

function buildRouteMap() {
  const branches = {};
  for (const branchKey of branchOrder) {
    const topics = {};
    for (const [topicKey, label] of siteConfig[branchKey].parents) {
      topics[topicKey] = urlSlug(label);
    }
    branches[branchKey] = { url: urlSlug(branchKey), topics };
  }
  return branches;
}

function loadArticles() {
  const files = fs.readdirSync(ARTICLES_DIR).filter(file => file.endsWith('.md'));
  const records = [];

  for (const file of files) {
    const raw = readFile(path.join(ARTICLES_DIR, file));
    const { data, content } = matter(raw);

    if (!data.slug) throw new Error(`Article "${file}" is missing "slug".`);
    if (!data.title) throw new Error(`Article "${file}" is missing "title".`);
    if (!data.date) throw new Error(`Article "${file}" is missing "date".`);
    if (!data.center && !data.branch) {
      throw new Error(`Article "${file}" needs a branch or center: true.`);
    }
    if (!data.center && !data.parents && !data.parent) {
      throw new Error(`Article "${file}" needs a parents list.`);
    }

    const article = {
      title: String(data.title),
      slug: String(data.slug),
      date: normalizeDate(data.date),
      body: marked.parse(content).trim()
    };

    if (data.subtitle) article.subtitle = String(data.subtitle);
    if (data.dek) article.dek = String(data.dek);
    if (data.eyebrow) article.eyebrow = String(data.eyebrow);
    if (data.updated) article.updated = normalizeDate(data.updated);

    if (data.center) {
      article.center = true;
    } else {
      article.branch = String(data.branch);
      article.parents = data.parents || (data.parent ? [data.parent] : []);
      validateArticleTaxonomy(article, file);
    }

    records.push({ file, article });
  }

  const seen = new Map();
  for (const { file, article } of records) {
    if (seen.has(article.slug)) {
      throw new Error(`Duplicate slug "${article.slug}" in ${file} and ${seen.get(article.slug)}.`);
    }
    seen.set(article.slug, file);
  }

  records.sort((a, b) => b.article.date.localeCompare(a.article.date));
  return records.map(record => record.article);
}

function validateArticleTaxonomy(article, file) {
  const branch = siteConfig[article.branch];
  if (!branch) throw new Error(`Article "${file}" uses unknown branch "${article.branch}".`);
  const validTopics = new Set(branch.parents.map(([key]) => key));
  for (const topic of article.parents) {
    if (!validTopics.has(topic)) {
      throw new Error(`Article "${file}" uses unknown topic "${topic}".`);
    }
  }
}

function collectRoutes(articles, routeMap) {
  const routes = [{ dir: '', route: { kind: 'home' } }];

  for (const branchKey of branchOrder) {
    const branchUrl = routeMap[branchKey].url;
    routes.push({ dir: branchUrl, route: { kind: 'branch', branch: branchKey } });
    for (const [topicKey] of siteConfig[branchKey].parents) {
      routes.push({
        dir: path.posix.join(branchUrl, routeMap[branchKey].topics[topicKey]),
        route: { kind: 'topic', branch: branchKey, topic: topicKey }
      });
    }
  }

  for (const article of articles) {
    if (article.center) {
      routes.push({ dir: article.slug, route: { kind: 'center' } });
      routes.push({
        dir: path.posix.join(article.slug, 'essay'),
        route: { kind: 'article', slug: article.slug }
      });
    } else {
      routes.push({ dir: article.slug, route: { kind: 'article', slug: article.slug } });
    }
  }

  routes.push({ dir: 'recent', route: { kind: 'recent' } });
  return routes;
}

function canonicalForDir(dir) {
  return `${BASE_URL}/${dir ? `${dir}/` : ''}`;
}

function branchUrl(routeMap, branch) {
  return `/${routeMap[branch].url}/`;
}

function topicUrl(routeMap, branch, topic) {
  return `/${routeMap[branch].url}/${routeMap[branch].topics[topic]}/`;
}

function articleUrl(article, centerSlug) {
  return article.center ? `/${centerSlug}/essay/` : `/${article.slug}/`;
}

function parentLabel(article, topicKey) {
  const match = siteConfig[article.branch].parents.find(([key]) => key === topicKey);
  return match ? match[1] : topicKey;
}

function parentLabels(article) {
  return (article.parents || []).map(topic => parentLabel(article, topic));
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => b.date.localeCompare(a.date));
}

function pageMeta(route, dir, articles) {
  let title = 'Cornerstone';
  let description = DEFAULT_DESCRIPTION;
  let type = 'website';

  if (route.kind === 'branch') {
    const label = siteConfig[route.branch].label;
    title = `${label} — Cornerstone`;
    description = `Independent essays and principles on ${label.toLowerCase()} from Cornerstone.`;
  } else if (route.kind === 'topic') {
    const branch = siteConfig[route.branch];
    const label = branch.parents.find(([key]) => key === route.topic)[1];
    title = `${label} — ${branch.label} — Cornerstone`;
    description = `Independent essays on ${label.toLowerCase()} within ${branch.label.toLowerCase()} from Cornerstone.`;
  } else if (route.kind === 'article') {
    const article = articles.find(candidate => candidate.slug === route.slug);
    title = `${article ? article.title : 'Essay'} — Cornerstone`;
    description = article?.dek || article?.subtitle || DEFAULT_DESCRIPTION;
    type = 'article';
  } else if (route.kind === 'recent') {
    title = 'Recent — Cornerstone';
    description = 'Recent independent essays on the systems shaping American politics.';
  } else if (route.kind === 'notfound') {
    title = 'Page not found — Cornerstone';
    description = 'The requested page could not be found.';
  }

  return {
    title,
    description,
    type,
    canonical: route.kind === 'notfound' ? null : canonicalForDir(dir),
    noindex: route.kind === 'notfound'
  };
}

function renderHeadMeta(meta, route, articles) {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:site_name" content="Cornerstone">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`
  ];

  if (meta.canonical) {
    tags.push(`<link rel="canonical" href="${meta.canonical}">`);
    tags.push(`<meta property="og:url" content="${meta.canonical}">`);
  }
  if (meta.noindex) tags.push('<meta name="robots" content="noindex,follow">');

  const structured = structuredData(route, meta, articles);
  if (structured) {
    tags.push(`<script type="application/ld+json">${jsonForHtml(structured)}</script>`);
  }

  return tags.join('\n  ');
}

function structuredData(route, meta, articles) {
  if (route.kind === 'home') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Cornerstone',
      url: BASE_URL,
      description: meta.description,
      publisher: { '@type': 'Organization', name: 'Cornerstone', url: BASE_URL }
    };
  }

  if (route.kind === 'article') {
    const article = articles.find(candidate => candidate.slug === route.slug);
    if (!article) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: meta.description,
      datePublished: article.date,
      dateModified: article.updated || article.date,
      mainEntityOfPage: meta.canonical,
      author: { '@type': 'Organization', name: 'Cornerstone', url: BASE_URL },
      publisher: { '@type': 'Organization', name: 'Cornerstone', url: BASE_URL }
    };
  }

  return null;
}

function routeBranch(route, articles) {
  if (route.branch) return route.branch;
  if (route.kind === 'article') {
    return articles.find(article => article.slug === route.slug)?.branch || null;
  }
  return null;
}

function renderHeader(route, articles, wheelPage) {
  const activeBranch = routeBranch(route, articles);
  const current = value => (value ? ' aria-current="page"' : '');
  const wheelAttr = wheelPage ? ' data-wheel-nav' : '';

  return `<header class="nav">
    <a class="nav-logo" href="/"${wheelAttr}>Cornerstone</a>
    <nav class="nav-links" aria-label="Sections">
      <a style="color:var(--economics-on-dark)" href="/economics/"${wheelAttr}${current(activeBranch === 'economics')}>Economics</a>
      <a style="color:var(--culture-on-dark)" href="/culture/"${wheelAttr}${current(activeBranch === 'culture')}>Culture</a>
      <a style="color:var(--governance-on-dark)" href="/governance/"${wheelAttr}${current(activeBranch === 'governance')}>Governance</a>
      <a style="color:var(--text-muted-on-dark)" href="/recent/"${current(route.kind === 'recent')}>Recent</a>
    </nav>
  </header>`;
}

function renderFooter() {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-mark">
        <div class="footer-name">Cornerstone</div>
        <p class="footer-line">Serve the long-term interests of the American people.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/recent/">Recent</a>
        <a href="/economics/">Economics</a>
        <a href="/culture/">Culture</a>
        <a href="/governance/">Governance</a>
        <a href="mailto:cornerstoneproject7@gmail.com">Contact</a>
      </nav>
    </div>
  </footer>`;
}

function renderArticleList(list, mode, emptyText, routeMap, centerSlug) {
  const sorted = sortArticles(list);
  if (!sorted.length) return `<p class="empty-state">${escapeHtml(emptyText)}</p>`;

  return sorted.map(article => {
    const metaColor = article.center ? 'var(--warm-muted)' : siteConfig[article.branch].color;
    let meta = 'Cornerstone';
    if (!article.center) {
      const labels = parentLabels(article).join(' / ');
      if (mode === 'branch') meta = labels;
      else if (mode === 'topic') meta = siteConfig[article.branch].label;
      else meta = `${siteConfig[article.branch].label} · ${labels}`;
    }
    return `<a class="article-row" href="${articleUrl(article, centerSlug)}">
      <time class="article-date" datetime="${article.date}">${fmtDate(article.date)}</time>
      <span class="article-meta" style="color:${metaColor}">${escapeHtml(meta)}</span>
      <span>
        <span class="article-list-title">${escapeHtml(article.title)}</span>
        ${article.dek ? `<span class="article-dek">${escapeHtml(article.dek)}</span>` : ''}
      </span>
    </a>`;
  }).join('\n');
}

function renderHomeContent(articles, routeMap, centerSlug) {
  const center = articles.find(article => article.center);
  const posts = sortArticles(articles.filter(article => !article.center)).slice(0, 3);
  const feature = center ? `<div class="center-row">
    <a class="center-row-title" href="${articleUrl(center, centerSlug)}">${escapeHtml(center.title)}</a>
    <time class="center-row-date" datetime="${center.date}">${fmtDate(center.date)}</time>
    <a class="center-row-link" href="${articleUrl(center, centerSlug)}">Read essay</a>
  </div>` : '';
  const principles = `<ul class="principles-list home-principles">${cornerstonePrinciples
    .map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;

  const rows = posts.length
    ? posts.map(article => {
        const branch = siteConfig[article.branch];
        return `<a class="essay-row" href="${articleUrl(article, centerSlug)}" style="--accent:${branch.color}">
          <span class="essay-row-meta">
            <time class="essay-row-date" datetime="${article.date}">${fmtDate(article.date)}</time>
            <span class="essay-row-branch" style="color:${branch.color}">${escapeHtml(branch.label)} · ${escapeHtml(parentLabels(article).join(' / '))}</span>
          </span>
          <span class="essay-row-body">
            <span class="essay-row-title">${escapeHtml(article.title)}</span>
            ${article.dek ? `<span class="essay-row-dek">${escapeHtml(article.dek)}</span>` : ''}
          </span>
        </a>`;
      }).join('\n')
    : '<p class="empty-state">Essays are coming.</p>';
  const more = articles.filter(article => !article.center).length > 3
    ? '<a class="home-all" href="/recent/">All essays</a>'
    : '';

  return `${feature}${principles}
    <div class="home-recent content-section">
      <h2 class="home-recent-heading" id="content-heading">Recent essays</h2>
      <div class="essay-list">${rows}</div>
      ${more}
    </div>`;
}

function renderBranchContent(branchKey, articles, routeMap, centerSlug) {
  const branch = siteConfig[branchKey];
  const principles = branch.principles.map(line => `<li>${escapeHtml(line)}</li>`).join('');
  const list = renderArticleList(
    articles.filter(article => article.branch === branchKey),
    'branch',
    `Essays on ${branch.label} are coming.`,
    routeMap,
    centerSlug
  );
  return `<div class="branch-block" style="--accent:${branch.color}">
    <div class="content-eyebrow" style="color:${branch.color}">Branch</div>
    <h1 class="content-title" id="content-heading">${escapeHtml(branch.label)}</h1>
    <ul class="principles-list">${principles}</ul>
    <div class="content-section">
      <div class="content-label">Recent in ${escapeHtml(branch.label)}</div>
      <div class="article-list">${list}</div>
    </div>
  </div>`;
}

function renderTopicContent(branchKey, topicKey, articles, routeMap, centerSlug) {
  const branch = siteConfig[branchKey];
  const label = branch.parents.find(([key]) => key === topicKey)[1];
  const list = renderArticleList(
    articles.filter(article => article.branch === branchKey && article.parents.includes(topicKey)),
    'topic',
    `Essays on ${label} are coming.`,
    routeMap,
    centerSlug
  );
  return `<div class="topic-block" style="--accent:${branch.color}">
    <div class="content-eyebrow" style="color:${branch.color}">
      <a href="${branchUrl(routeMap, branchKey)}" data-wheel-nav>${escapeHtml(branch.label)}</a>
    </div>
    <h1 class="content-title" id="content-heading">${escapeHtml(label)}</h1>
    <div class="content-section"><div class="article-list">${list}</div></div>
    <a class="back-link" href="${branchUrl(routeMap, branchKey)}" data-wheel-nav>All of ${escapeHtml(branch.label)}</a>
  </div>`;
}

function renderMobileTopics(route, routeMap) {
  if (!route.branch) return { hidden: ' hidden', html: '' };
  const branch = siteConfig[route.branch];
  const html = branch.parents.map(([topicKey, label]) =>
    `<a href="${topicUrl(routeMap, route.branch, topicKey)}" data-wheel-nav style="--accent:${branch.color}">${escapeHtml(label)}</a>`
  ).join('');
  return { hidden: '', html };
}

function renderWheelMain(route, articles, routeMap, centerSlug) {
  const wheelTemplate = readFile(path.join(TEMPLATE_DIR, 'wheel.html'));
  let content;
  if (route.kind === 'branch') content = renderBranchContent(route.branch, articles, routeMap, centerSlug);
  else if (route.kind === 'topic') content = renderTopicContent(route.branch, route.topic, articles, routeMap, centerSlug);
  else content = renderHomeContent(articles, routeMap, centerSlug);

  const mobile = renderMobileTopics(route, routeMap);
  const pageHeading = ['home', 'center'].includes(route.kind)
    ? '<h1 class="sr-only">Cornerstone</h1>'
    : '';

  return wheelTemplate
    .replaceAll('/*__PAGE_HEADING__*/', pageHeading)
    .replaceAll('/*__MOBILE_HIDDEN__*/', mobile.hidden)
    .replaceAll('/*__MOBILE_TOPICS__*/', mobile.html)
    .replaceAll('/*__WARM_CONTENT__*/', content);
}

function renderRecentMain(articles, routeMap, centerSlug) {
  const list = renderArticleList(articles, 'recent', 'Essays are coming.', routeMap, centerSlug);
  return `<main id="recent">
    <div class="page-head">
      <div class="page-wrap">
        <a class="back-btn" href="/">← Home</a>
        <div class="page-eyebrow">Recent</div>
        <h1 id="recent-title" class="page-title">Latest from Cornerstone</h1>
      </div>
    </div>
    <section class="warm-surface" aria-labelledby="recent-title">
      <div class="warm-inner"><div class="article-list">${list}</div></div>
    </section>
  </main>`;
}

function splitFootnotes(bodyHtml) {
  const sectionMatch = bodyHtml.match(/\n?<section class="footnotes" data-footnotes>[\s\S]*?<\/section>\s*$/);
  if (!sectionMatch) return { body: bodyHtml, sources: '' };
  const listMatch = sectionMatch[0].match(/<ol>[\s\S]*?<\/ol>/);
  if (!listMatch) return { body: bodyHtml, sources: '' };
  return {
    body: bodyHtml.replace(sectionMatch[0], '').trim(),
    sources: `<div class="sources-block"><h2 class="sources-heading">Sources</h2>${listMatch[0].replace('<ol>', '<ol class="sources-list">')}</div>`
  };
}

function pickRelated(article, articles) {
  const others = articles.filter(candidate => candidate.slug !== article.slug);
  if (!others.length) return null;
  if (!article.center) {
    const sharedTopic = others.filter(candidate =>
      !candidate.center &&
      candidate.branch === article.branch &&
      candidate.parents.some(topic => article.parents.includes(topic))
    );
    if (sharedTopic.length) return sortArticles(sharedTopic)[0];
    const sameBranch = others.filter(candidate => !candidate.center && candidate.branch === article.branch);
    if (sameBranch.length) return sortArticles(sameBranch)[0];
  }
  return sortArticles(others)[0];
}

function renderArticleMain(article, articles, routeMap, centerSlug) {
  const footnotes = splitFootnotes(article.body);
  let breadcrumb;
  let metadata;
  let back;

  if (article.center) {
    breadcrumb = '<a href="/">Home</a>';
    metadata = `<span class="meta-author">Cornerstone</span><span class="meta-sep">·</span><time datetime="${article.date}">${fmtDate(article.date)}</time>`;
    back = '<a href="/">Return home</a>';
  } else {
    const branch = siteConfig[article.branch];
    const topicLinks = article.parents.map(topic =>
      `<a href="${topicUrl(routeMap, article.branch, topic)}">${escapeHtml(parentLabel(article, topic))}</a>`
    ).join('<span class="sep">/</span>');
    breadcrumb = `<a href="${branchUrl(routeMap, article.branch)}">${escapeHtml(branch.label)}</a><span class="sep">/</span>${topicLinks}`;
    metadata = `<span class="meta-author">Cornerstone</span>
      <span class="meta-sep">·</span><time datetime="${article.date}">${fmtDate(article.date)}</time>
      <span class="meta-sep">·</span><a href="${branchUrl(routeMap, article.branch)}" style="color:${branch.light}">${escapeHtml(branch.label)}</a>
      <span class="meta-sep">·</span>${article.parents.map(topic =>
        `<a href="${topicUrl(routeMap, article.branch, topic)}" style="color:${branch.light}">${escapeHtml(parentLabel(article, topic))}</a>`
      ).join('<span class="meta-sep">/</span>')}
      ${article.updated ? `<span class="meta-sep">·</span><span class="meta-updated">Updated ${fmtDate(article.updated)}</span>` : ''}`;
    const firstTopic = article.parents[0];
    back = `<a href="${topicUrl(routeMap, article.branch, firstTopic)}">More on ${escapeHtml(parentLabel(article, firstTopic))}</a>`;
  }

  const related = pickRelated(article, articles);
  const relatedHtml = related ? `<div class="end-related">
    <div class="related-label">Read next</div>
    <a class="related-link" href="${articleUrl(related, centerSlug)}">
      <span class="related-title">${escapeHtml(related.title)}</span>
      ${related.dek ? `<span class="related-dek">${escapeHtml(related.dek)}</span>` : ''}
    </a>
  </div>` : '';

  return `<main id="article-page" class="article-view">
    <article class="page-wrap article-shell">
      <nav class="breadcrumb" aria-label="Breadcrumb">${breadcrumb}</nav>
      <div class="article-meta-line">${metadata}</div>
      <h1 class="article-title-display">${escapeHtml(article.title)}</h1>
      ${article.subtitle ? `<p class="article-subtitle-display" style="display:block">${escapeHtml(article.subtitle)}</p>` : ''}
      <div class="page-rule"></div>
      <div class="article-content">${footnotes.body}</div>
      <footer class="article-end">
        ${footnotes.sources}
        <div class="end-actions">
          <button type="button" id="copy-link" class="copy-link">Copy link</button>
          <span id="copy-status" class="copy-status" role="status" aria-live="polite"></span>
        </div>
        <div class="end-back">${back}</div>
        ${relatedHtml}
      </footer>
    </article>
  </main>`;
}

function renderNotFoundMain() {
  return `<main id="notfound-page">
    <div class="page-head">
      <div class="page-wrap">
        <div class="page-eyebrow">Not found</div>
        <h1 class="page-title">This page could not be found.</h1>
      </div>
    </div>
    <section class="warm-surface">
      <div class="warm-inner">
        <ul class="notfound-links">
          <li><a href="/">Home</a></li>
          <li><a href="/recent/">Recent</a></li>
          <li><a href="/economics/">Economics</a></li>
          <li><a href="/culture/">Culture</a></li>
          <li><a href="/governance/">Governance</a></li>
        </ul>
      </div>
    </section>
  </main>`;
}

function renderMain(route, articles, routeMap, centerSlug) {
  if (['home', 'center', 'branch', 'topic'].includes(route.kind)) {
    return renderWheelMain(route, articles, routeMap, centerSlug);
  }
  if (route.kind === 'recent') return renderRecentMain(articles, routeMap, centerSlug);
  if (route.kind === 'article') {
    const article = articles.find(candidate => candidate.slug === route.slug);
    return article ? renderArticleMain(article, articles, routeMap, centerSlug) : renderNotFoundMain();
  }
  return renderNotFoundMain();
}

function buildSiteData(articles, routeMap) {
  return {
    siteConfig,
    branchOrder,
    cornerstonePrinciples,
    routeMap,
    articles: articles.map(({ body, ...metadata }) => metadata),
    baseUrl: BASE_URL,
    defaultDescription: DEFAULT_DESCRIPTION
  };
}

function renderPage(shell, route, dir, articles, routeMap, centerSlug, versions) {
  const wheelPage = ['home', 'center', 'branch', 'topic'].includes(route.kind);
  const meta = pageMeta(route, dir, articles);
  const scripts = wheelPage
    ? `<script src="/assets/site-data.js?v=${versions.data}" defer></script>\n  <script src="/assets/wheel.js?v=${versions.wheel}" defer></script>`
    : '';

  const output = shell
    .replaceAll('/*__TITLE__*/', escapeHtml(meta.title))
    .replaceAll('/*__HEAD_META__*/', renderHeadMeta(meta, route, articles))
    .replaceAll('/*__STYLE_VERSION__*/', versions.styles)
    .replaceAll('/*__SITE_VERSION__*/', versions.site)
    .replaceAll('/*__HEADER__*/', renderHeader(route, articles, wheelPage))
    .replaceAll('/*__MAIN__*/', renderMain(route, articles, routeMap, centerSlug))
    .replaceAll('/*__FOOTER__*/', renderFooter())
    .replaceAll('/*__PAGE_SCRIPTS__*/', scripts);
  return `${output.split('\n').map(line => line.trimEnd()).join('\n').trim()}\n`;
}

function lastModifiedForRoute(route, articles) {
  let relevant = articles;
  if (route.kind === 'branch') relevant = articles.filter(article => article.branch === route.branch);
  if (route.kind === 'topic') {
    relevant = articles.filter(article => article.branch === route.branch && article.parents.includes(route.topic));
  }
  if (route.kind === 'article') relevant = articles.filter(article => article.slug === route.slug);
  const dates = relevant.flatMap(article => [article.date, article.updated].filter(Boolean)).sort();
  return dates.at(-1) || null;
}

function renderSitemap(routes, articles) {
  const urls = routes.map(({ dir, route }) => {
    const lastmod = lastModifiedForRoute(route, articles);
    return `  <url>\n    <loc>${escapeXml(canonicalForDir(dir))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function build() {
  const articles = loadArticles();
  const routeMap = buildRouteMap();
  const routes = collectRoutes(articles, routeMap);
  const centerSlug = articles.find(article => article.center)?.slug || 'cornerstone';
  const shell = readFile(path.join(TEMPLATE_DIR, 'index.html'));
  const styles = readFile(path.join(TEMPLATE_DIR, 'styles.css'));
  const siteScript = readFile(path.join(TEMPLATE_DIR, 'site.js'));
  const wheelScript = readFile(path.join(TEMPLATE_DIR, 'wheel.js'));
  const siteDataScript = `window.CORNERSTONE_DATA = ${jsonForHtml(buildSiteData(articles, routeMap))};\n`;
  const versions = {
    styles: hash(styles),
    site: hash(siteScript),
    wheel: hash(wheelScript),
    data: hash(siteDataScript)
  };

  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  writeFile(path.join(ASSETS_DIR, 'styles.css'), styles);
  writeFile(path.join(ASSETS_DIR, 'site.js'), siteScript);
  writeFile(path.join(ASSETS_DIR, 'wheel.js'), wheelScript);
  writeFile(path.join(ASSETS_DIR, 'site-data.js'), siteDataScript);

  for (const { dir, route } of routes) {
    const output = renderPage(shell, route, dir, articles, routeMap, centerSlug, versions);
    writeFile(path.join(DIST_DIR, dir, 'index.html'), output);
  }

  const notFoundRoute = { kind: 'notfound' };
  writeFile(
    path.join(DIST_DIR, '404.html'),
    renderPage(shell, notFoundRoute, '', articles, routeMap, centerSlug, versions)
  );
  writeFile(path.join(DIST_DIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  writeFile(path.join(DIST_DIR, 'sitemap.xml'), renderSitemap(routes, articles));
  writeFile(path.join(DIST_DIR, '.nojekyll'), '');

  console.log(`Built ${routes.length + 1} page(s) into docs/`);
  console.log(`  ${articles.length} article(s): ${articles.map(article => article.slug).join(', ')}`);
  console.log('  Shared assets: styles.css, site.js, wheel.js, site-data.js');
  console.log('  SEO: canonical metadata, social metadata, structured data, sitemap.xml, robots.txt');
}

build();
