// ============================================================
//  CORNERSTONE — BUILD SCRIPT
// ============================================================
//  Reads your content and templates, then produces a single
//  deployable file at dist/index.html.
//
//  Run it with:   node build.js
//
//  What it does:
//    1. Reads every .md file in content/articles/
//    2. Parses frontmatter (title, date, branch, etc.)
//    3. Converts the Markdown body to HTML (with footnotes)
//    4. Injects config + articles + CSS + wheel engine into
//       the HTML shell
//    5. Writes the finished site to dist/index.html
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
const DIST_DIR = path.join(ROOT, 'dist');

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

  // Sort newest-first so the injected array is human-readable;
  // the site re-sorts anyway, but this keeps the output tidy.
  articles.sort((a, b) => b.article.date.localeCompare(a.article.date));

  return articles.map(a => a.article);
}

// ---- 2. stitch everything into the shell --------------------

function build() {
  const articles = loadArticles();

  const shell = readFile(path.join(TEMPLATE_DIR, 'index.html'));
  const styles = readFile(path.join(TEMPLATE_DIR, 'styles.css'));
  const wheel = readFile(path.join(TEMPLATE_DIR, 'wheel.js'));
  const config = readFile(path.join(ROOT, 'content', 'config.js'));

  const articlesJs = 'const ARTICLES = ' + JSON.stringify(articles, null, 2) + ';';

  // Inject each block. We use split/join rather than String.replace
  // so that any "$" characters in the content are treated literally.
  let out = shell;
  out = out.split('/*__STYLES__*/').join(styles);
  out = out.split('/*__CONFIG__*/').join(config);
  out = out.split('/*__ARTICLES__*/').join(articlesJs);
  out = out.split('/*__WHEEL__*/').join(wheel);

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), out, 'utf8');

  const sizeKb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
  console.log(`Built dist/index.html`);
  console.log(`  ${articles.length} article(s): ${articles.map(a => a.slug).join(', ')}`);
  console.log(`  ${sizeKb} KB`);
}

build();
