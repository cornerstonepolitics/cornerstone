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
  if (path.posix.extname(pathname)) return path.join(DOCS, pathname.slice(1));
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
  assert(html.includes('meta property="og:image"'), `${relative} is missing the social-sharing image.`);
  assert(html.includes('meta property="og:image:width" content="1200"'), `${relative} has the wrong social image width.`);
  assert(html.includes('meta property="og:image:height" content="630"'), `${relative} has the wrong social image height.`);
  assert(html.includes('meta name="twitter:card" content="summary_large_image"'), `${relative} must use a large social preview.`);
  assert(html.includes('meta name="twitter:image"'), `${relative} is missing the Twitter sharing image.`);
  assert(html.includes('meta name="twitter:title"'), `${relative} is missing Twitter metadata.`);
  assert(html.includes('href="/favicon.ico"'), `${relative} is missing the ICO favicon.`);
  assert(html.includes('href="/favicon-32x32.png"'), `${relative} is missing the 32px favicon.`);
  assert(html.includes('href="/apple-touch-icon.png"'), `${relative} is missing the Apple touch icon.`);
  assert(html.includes('href="/site.webmanifest"'), `${relative} is missing the web app manifest.`);
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
assert(
  home.includes('<title>Cornerstone Politics — Essays on American Politics</title>'),
  'Homepage title must identify both the publication and its subject.'
);
assert(
  home.includes('meta name="description" content="Essays examining the systems, incentives, and principles that shape American politics."'),
  'Homepage description must describe the publication without making a positioning claim.'
);
assert(home.includes('"@type":"WebSite"'), 'Homepage is missing WebSite structured data.');
assert(
  home.includes('href="/#cornerstone" class="center-link"'),
  'The wheel center must link to the Cornerstone overview.'
);
assert(
  home.includes('<div class="center-row" id="cornerstone">'),
  'The Cornerstone overview needs a stable fragment target.'
);

const legacyCenter = fs.readFileSync(path.join(DOCS, 'cornerstone', 'index.html'), 'utf8');
assert(
  legacyCenter.includes('rel="canonical" href="https://cornerstonepolitics.org/"'),
  'The legacy center route must canonicalize to the homepage.'
);
assert(
  fs.readFileSync(path.join(ROOT, 'template', 'wheel.js'), 'utf8').includes("route.kind === 'center'"),
  'Client-side metadata must preserve the legacy center canonical.'
);

const article = fs.readFileSync(path.join(DOCS, 'unnatural-selection', 'index.html'), 'utf8');
assert(article.includes('<article class="page-wrap article-shell">'), 'Essay lacks article semantics.');
assert(article.includes('"@type":"Article"'), 'Essay is missing Article structured data.');
assert(!article.includes('This page could not be found.'), 'Essay contains the 404 view.');

const cornerstoneEssay = fs.readFileSync(path.join(DOCS, 'cornerstone', 'essay', 'index.html'), 'utf8');
assert(
  cornerstoneEssay.includes('Defending what you are building without striking first requires strength.'),
  'Cornerstone essay is missing the finalized persuasion passage.'
);
assert(
  cornerstoneEssay.includes('Only persuasion removes the reason to fight. Force creates new reasons for conflict.'),
  'Cornerstone essay is missing the finalized force-and-persuasion contrast.'
);
assert(!cornerstoneEssay.includes('claude.ai'), 'Cornerstone essay contains a temporary drafting link.');
assert(!cornerstoneEssay.includes('meta-updated'), 'Cornerstone essay must not display a revision label.');

const notFound = fs.readFileSync(path.join(DOCS, '404.html'), 'utf8');
assert(notFound.includes('name="robots" content="noindex,follow"'), '404 page must be noindex.');
assert(!notFound.includes('rel="canonical"'), '404 page must not declare the homepage as canonical.');

for (const asset of ['styles.css', 'site.js', 'wheel.js', 'site-data.js']) {
  assert(fs.existsSync(path.join(DOCS, 'assets', asset)), `Missing shared asset ${asset}.`);
}

const socialCardPath = path.join(DOCS, 'assets', 'cornerstone-social-card.png');
assert(fs.existsSync(socialCardPath), 'Missing the default social-sharing image.');
const socialCard = fs.readFileSync(socialCardPath);
assert.equal(socialCard.toString('ascii', 1, 4), 'PNG', 'Social-sharing image must be a PNG file.');
assert.equal(socialCard.readUInt32BE(16), 1200, 'Social-sharing image must be 1200 pixels wide.');
assert.equal(socialCard.readUInt32BE(20), 630, 'Social-sharing image must be 630 pixels tall.');

for (const icon of [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'site.webmanifest'
]) {
  assert(fs.existsSync(path.join(DOCS, icon)), `Missing favicon asset ${icon}.`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(DOCS, 'site.webmanifest'), 'utf8'));
assert.equal(manifest.name, 'Cornerstone Politics', 'Manifest has the wrong application name.');
assert.equal(manifest.icons.length, 2, 'Manifest must include 192px and 512px icons.');

const wheelScript = fs.readFileSync(path.join(DOCS, 'assets', 'wheel.js'), 'utf8');
const sharedStyles = fs.readFileSync(path.join(DOCS, 'assets', 'styles.css'), 'utf8');
assert(
  wheelScript.includes('wedge(R_IN0, R_IN1, start, end)'),
  'The branch ring no longer matches the original wheel geometry.'
);
assert(
  wheelScript.includes('branch.parents.forEach'),
  'The complete twelve-topic outer ring must be drawn at every viewport width.'
);
assert(
  !wheelScript.includes('mobileMedia.matches'),
  'Mobile must use the complete wheel instead of a replacement three-wedge layout.'
);
assert(
  !sharedStyles.includes('.mobile-topics:not([hidden])'),
  'Mobile must not replace the outer ring with a separate topic grid.'
);

assert(fs.existsSync(path.join(DOCS, 'sitemap.xml')), 'Missing sitemap.xml.');
assert(fs.existsSync(path.join(DOCS, 'robots.txt')), 'Missing robots.txt.');
assert(fs.existsSync(path.join(DOCS, '.nojekyll')), 'Missing .nojekyll.');

const sitemap = fs.readFileSync(path.join(DOCS, 'sitemap.xml'), 'utf8');
assert(
  !sitemap.includes('<loc>https://cornerstonepolitics.org/cornerstone/</loc>'),
  'The duplicate center route must not be listed in the sitemap.'
);
assert(
  sitemap.includes('<loc>https://cornerstonepolitics.org/cornerstone/essay/</loc>'),
  'The founding essay must remain listed in the sitemap.'
);

const placeholderRoutes = [
  'economics',
  'economics/labor',
  'economics/monetary',
  'economics/fiscal',
  'economics/markets',
  'culture',
  'culture/education',
  'culture/community',
  'culture/justice',
  'culture/identity',
  'governance/foreign-policy',
  'governance/rule-of-law'
];

for (const route of placeholderRoutes) {
  const html = fs.readFileSync(path.join(DOCS, ...route.split('/'), 'index.html'), 'utf8');
  assert(
    html.includes('name="robots" content="noindex,follow"'),
    `${route} must remain visible but be excluded from search indexing.`
  );
  assert(
    !sitemap.includes(`<loc>https://cornerstonepolitics.org/${route}/</loc>`),
    `${route} must not be listed in the sitemap while it is a placeholder.`
  );
}

for (const route of ['governance', 'governance/elections', 'governance/institutions']) {
  const html = fs.readFileSync(path.join(DOCS, ...route.split('/'), 'index.html'), 'utf8');
  assert(!html.includes('name="robots" content="noindex'), `${route} contains an essay and must be indexable.`);
  assert(
    sitemap.includes(`<loc>https://cornerstonepolitics.org/${route}/</loc>`),
    `${route} contains an essay and must remain listed in the sitemap.`
  );
}

console.log(`Verified ${htmlFiles.length} HTML pages and ${allFiles.length} generated files.`);
