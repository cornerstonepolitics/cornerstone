const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DOCS = path.join(ROOT, 'docs');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function hrefToFile(href) {
  const pathname = href.split('#')[0].split('?')[0];
  if (!pathname || pathname === '/') return path.join(DOCS, 'index.html');
  if (pathname.startsWith('/assets/')) return path.join(DOCS, pathname.slice(1));
  return path.join(DOCS, pathname.slice(1), 'index.html');
}

const allFiles = walk(DOCS);
const htmlFiles = allFiles.filter(file => file.endsWith('.html'));
assert(htmlFiles.length >= 20, 'Expected the complete set of route pages.');

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(DOCS, file);
  assert(!html.includes('/*__'), `${relative} contains an unreplaced build placeholder.`);
  assert.equal(count(html, /<main\b/g), 1, `${relative} must contain exactly one main element.`);
  assert.equal(count(html, /<h1\b/g), 1, `${relative} must contain exactly one h1.`);
  assert(html.includes('meta name="description"'), `${relative} is missing a description.`);
  assert(html.includes('meta property="og:title"'), `${relative} is missing Open Graph metadata.`);
  assert(html.includes('meta name="twitter:title"'), `${relative} is missing Twitter metadata.`);
  assert(!html.includes('const ARTICLES'), `${relative} embeds the global article database.`);
  assert(Buffer.byteLength(html) < 60000, `${relative} is unexpectedly large.`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${relative} contains duplicate ids.`);

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
    const target = hrefToFile(href);
    assert(fs.existsSync(target), `${relative} links to missing target ${href}.`);
  }
}

const home = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
assert(!home.includes('This page could not be found.'), 'Homepage contains the 404 view.');
assert(!home.includes('The officeholder does not have to be bought.'), 'Homepage embeds full article bodies.');
assert(home.includes('"@type":"WebSite"'), 'Homepage is missing WebSite structured data.');

const article = fs.readFileSync(path.join(DOCS, 'unnatural-selection', 'index.html'), 'utf8');
assert(article.includes('<article class="page-wrap article-shell">'), 'Essay lacks article semantics.');
assert(article.includes('"@type":"Article"'), 'Essay is missing Article structured data.');
assert(!article.includes('This page could not be found.'), 'Essay contains the 404 view.');

const notFound = fs.readFileSync(path.join(DOCS, '404.html'), 'utf8');
assert(notFound.includes('name="robots" content="noindex,follow"'), '404 page must be noindex.');
assert(!notFound.includes('rel="canonical"'), '404 page must not declare the homepage as canonical.');

for (const asset of ['styles.css', 'site.js', 'wheel.js', 'site-data.js']) {
  assert(fs.existsSync(path.join(DOCS, 'assets', asset)), `Missing shared asset ${asset}.`);
}
assert(fs.existsSync(path.join(DOCS, 'sitemap.xml')), 'Missing sitemap.xml.');
assert(fs.existsSync(path.join(DOCS, 'robots.txt')), 'Missing robots.txt.');
assert(fs.existsSync(path.join(DOCS, '.nojekyll')), 'Missing .nojekyll.');

console.log(`Verified ${htmlFiles.length} HTML pages and ${allFiles.length} generated files.`);
