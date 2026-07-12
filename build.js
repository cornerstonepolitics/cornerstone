// ============================================================
//  CORNERSTONE — BUILD SCRIPT
// ============================================================
//  Reads your content and templates, then produces a real
//  multi-page static site in docs/.
//
//  Run it with:   node build.js
//
//  What it does:
//    1. Reads every .md file in content/articles/
//    2. Parses frontmatter (title, date, branch, etc.)
//    3. Converts the Markdown body to HTML (with footnotes)
//    4. Injects config + articles + CSS + wheel engine into
//       the HTML shell
//    5. Writes ONE PAGE PER ROUTE so that every branch, topic,
//       and article has a real URL that works on refresh and
//       when shared:
//
//         docs/index.html                        ->  /
//         docs/economics/index.html              ->  /economics/
//         docs/economics/labor/index.html        ->  /economics/labor/
//         docs/unnatural-selection/index.html    ->  /unnatural-selection/
//         docs/404.html                          ->  custom 404
//
//  Each page is the same app shell, but carries a ROUTE object
//  telling the site which state to paint on first load. In-page
//  clicks never reload; they use history.pushState. Landing on a
//  URL cold (or refreshing) renders the right state immediately.
//
//  NOTE: this script never wipes docs/. It only writes the files
//  it generates, so CNAME, .nojekyll and anything else you keep
//  in docs/ survives a rebuild.
// ============================================================

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const footnote = require('marked-footnote');

marked.use(footnote());

const ROOT = __dirname;
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const DIST_DIR = path.join(ROOT, 'docs');

const { siteConfig, branchOrder } = require(path.join(ROOT, 'content', 'config.js'));

// ---- helpers ------------------------------------------------

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

// Turn a date value from YAML into a plain "YYYY-MM-DD" string.
// gray-matter parses unquoted dates into JS Date objects, so we
// normalize back to the string form the site expects.
function normalizeDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

// Turn a human label into a clean URL segment.
//   "Rule of Law"    -> "rule-of-law"
//   "Foreign Policy" -> "foreign-policy"
// The internal topic KEY (e.g. "ruleoflaw") stays unchanged; this
// is only how the topic appears in the address bar.
function urlSlug(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Build the lookup that maps between topic keys and URL segments.
// Shipped to the browser so the router can translate both ways.
function buildRouteMap() {
  const branches = {};
  for (const bk of branchOrder) {
    const b = siteConfig[bk];
    const topics = {};
    for (const [key, label] of b.parents) {
      topics[key] = urlSlug(label);
    }
    branches[bk] = {
      url: urlSlug(bk),
      topics // { ruleoflaw: 'rule-of-law', ... }
    };
  }
  return branches;
}

// ---- 1. read and parse every article ------------------------

function loadArticles() {
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  const articles = [];

  for (const file of files) {
    const raw = readFile(path.join(ARTICLES_DIR, file));
    const { data, content } = matter(raw);

    if (!data.slug) {
      throw new Error(`Article "${file}" is missing a "slug" in its frontmatter.`);
    }
    if (!data.title) {
      throw new Error(`Article "${file}" is missing a "title" in its frontmatter.`);
    }
    if (!data.center) {
      if (!data.branch) {
        throw new Error(`Article "${file}" needs a "branch" (or set "center: true").`);
      }
      if (!data.parents && !data.parent) {
        throw new Error(`Article "${file}" needs a "parents" list (e.g. [elections, institutions]).`);
      }
    }

    const article = {
      title: data.title,
      slug: data.slug,
      date: normalizeDate(data.date),
      body: marked.parse(content).trim()
    };

    if (data.subtitle) article.subtitle = data.subtitle;
    if (data.dek) article.dek = data.dek;
    if (data.eyebrow) article.eyebrow = data.eyebrow;

    if (data.center) {
      article.center = true;
    } else {
      article.branch = data.branch;
      article.parents = data.parents || (data.parent ? [data.parent] : []);
    }

    articles.push({ file, article });
  }

  // Warn about duplicate slugs — they would collide in navigation.
  const seen = new Map();
  for (const { file, article } of articles) {
    if (seen.has(article.slug)) {
      throw new Error(`Duplicate slug "${article.slug}" in ${file} and ${seen.get(article.slug)}.`);
    }
    seen.set(article.slug, file);
  }

  articles.sort((a, b) => b.article.date.localeCompare(a.article.date));

  return articles.map(a => a.article);
}

// ---- 2. work out every route the site should expose ---------

function collectRoutes(articles, routeMap) {
  const routes = [];

  // Homepage.
  routes.push({ dir: '', route: { kind: 'home' } });

  // One page per branch, and one per topic inside it.
  for (const bk of branchOrder) {
    const b = siteConfig[bk];
    const bUrl = routeMap[bk].url;

    routes.push({ dir: bUrl, route: { kind: 'branch', branch: bk } });

    for (const [key] of b.parents) {
      const tUrl = routeMap[bk].topics[key];
      routes.push({
        dir: path.posix.join(bUrl, tUrl),
        route: { kind: 'topic', branch: bk, topic: key }
      });
    }
  }

  // One page per article, at the top level. Articles can belong to
  // several topics, so nesting them under one would be arbitrary.
  for (const a of articles) {
    routes.push({ dir: a.slug, route: { kind: 'article', slug: a.slug } });
  }

  // The Recent index.
  routes.push({ dir: 'recent', route: { kind: 'recent' } });

  return routes;
}

// ---- 3. stitch everything into the shell --------------------

function build() {
  const articles = loadArticles();
  const routeMap = buildRouteMap();

  const shell = readFile(path.join(TEMPLATE_DIR, 'index.html'));
  const styles = readFile(path.join(TEMPLATE_DIR, 'styles.css'));
  const wheel = readFile(path.join(TEMPLATE_DIR, 'wheel.js'));
  const config = readFile(path.join(ROOT, 'content', 'config.js'));

  const articlesJs = 'const ARTICLES = ' + JSON.stringify(articles, null, 2) + ';';
  const routeMapJs = 'const ROUTE_MAP = ' + JSON.stringify(routeMap, null, 2) + ';';

  const routes = collectRoutes(articles, routeMap);

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  let written = 0;
  for (const { dir, route } of routes) {
    const routeJs = 'const ROUTE = ' + JSON.stringify(route) + ';';

    let out = shell;
    out = out.split('/*__STYLES__*/').join(styles);
    out = out.split('/*__CONFIG__*/').join(config + '\n' + routeMapJs + '\n' + routeJs);
    out = out.split('/*__ARTICLES__*/').join(articlesJs);
    out = out.split('/*__WHEEL__*/').join(wheel);

    // Give each page a real <title> and canonical URL so shared
    // links and search results read correctly.
    const meta = pageMeta(route, articles);
    out = out.replace('<title>Cornerstone</title>',
      `<title>${escapeHtml(meta.title)}</title>\n  <link rel="canonical" href="https://cornerstonepolitics.org/${dir ? dir + '/' : ''}">`);

    const outDir = dir ? path.join(DIST_DIR, dir) : DIST_DIR;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), out, 'utf8');
    written++;
  }

  // Custom 404. GitHub Pages serves docs/404.html for unknown paths.
  {
    const route = { kind: 'notfound' };
    const routeJs = 'const ROUTE = ' + JSON.stringify(route) + ';';
    let out = shell;
    out = out.split('/*__STYLES__*/').join(styles);
    out = out.split('/*__CONFIG__*/').join(config + '\n' + routeMapJs + '\n' + routeJs);
    out = out.split('/*__ARTICLES__*/').join(articlesJs);
    out = out.split('/*__WHEEL__*/').join(wheel);
    out = out.replace('<title>Cornerstone</title>', '<title>Page not found — Cornerstone</title>');
    fs.writeFileSync(path.join(DIST_DIR, '404.html'), out, 'utf8');
    written++;
  }

  console.log('Built ' + written + ' page(s) into docs/');
  console.log('  ' + articles.length + ' article(s): ' + articles.map(a => a.slug).join(', '));
  for (const bk of branchOrder) {
    const t = Object.values(routeMap[bk].topics).join(', ');
    console.log('  /' + routeMap[bk].url + '/  ->  ' + t);
  }
}

function pageMeta(route, articles) {
  if (route.kind === 'branch') {
    return { title: siteConfig[route.branch].label + ' — Cornerstone' };
  }
  if (route.kind === 'topic') {
    const b = siteConfig[route.branch];
    const label = b.parents.find(p => p[0] === route.topic)[1];
    return { title: label + ' — ' + b.label + ' — Cornerstone' };
  }
  if (route.kind === 'article') {
    const a = articles.find(x => x.slug === route.slug);
    return { title: (a ? a.title : 'Essay') + ' — Cornerstone' };
  }
  if (route.kind === 'recent') {
    return { title: 'Recent — Cornerstone' };
  }
  return { title: 'Cornerstone' };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

build();
