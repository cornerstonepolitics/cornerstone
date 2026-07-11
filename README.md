# Cornerstone

The site is built from source files into a single deployable HTML file.
You write essays in Markdown; a build step assembles the finished site.

## Project layout

```
cornerstone/
├── content/
│   ├── config.js            Branches, topics, colors, principles (rarely edited)
│   └── articles/            One Markdown file per essay — THIS is where you write
│       ├── cornerstone.md
│       └── unnatural-selection.md
├── template/
│   ├── index.html           The page shell (rarely edited)
│   ├── styles.css           All styling (rarely edited)
│   └── wheel.js             Wheel engine + navigation (rarely edited)
├── build.js                 Assembles everything into dist/index.html
└── dist/
    └── index.html           The finished site you deploy
```

## One-time setup

You need Node.js installed (you already have it). Then, in this folder:

```
npm install
```

This installs the three small libraries the build uses (marked,
marked-footnote, gray-matter).

## Writing a new article

1. Create a new file in `content/articles/`, e.g. `my-essay.md`.
2. Start it with a frontmatter block, then write in plain Markdown:

```
---
title: My Essay Title
subtitle: An optional subtitle
date: 2026-07-15
branch: economics
parents: [markets, fiscal]
slug: my-essay
dek: A one-line description shown in article lists
---

Your first paragraph. Just write. No HTML, no escaped quotes.

Your second paragraph. Use "quotes" freely, *italics*, and footnotes[^1].

[^1]: Footnotes are numbered automatically.
```

3. Run the build:

```
node build.js
```

4. `dist/index.html` is your updated site. Deploy it.

### Frontmatter fields

- `title`      (required) the headline
- `slug`       (required) the URL-safe id; must be unique
- `date`       (required) YYYY-MM-DD; controls sort order
- `branch`     (required for articles) economics | culture | governance
- `parents`    (required for articles) list of topic keys, e.g. [elections, institutions]
- `subtitle`   (optional) shown under the title on the article page
- `dek`        (optional) shown in article lists and feeds
- `eyebrow`    (optional) small label above the title
- `center: true`  marks the centerpiece instead of using branch/parents

### Topic keys per branch

- economics:  labor, monetary, fiscal, markets
- culture:    education, community, justice, identity
- governance: elections, institutions, foreign, ruleoflaw

## Editing structure (branches, principles, topic names)

Edit `content/config.js`, then rebuild. You will rarely need this.

## Deploying

`dist/index.html` is fully self-contained. Upload it anywhere that serves
static files. (Deployment steps are covered separately.)
