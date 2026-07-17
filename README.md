# Cornerstone

Cornerstone is a multi-page static publication built from Markdown. Each public URL receives its own semantic HTML page, while styling, wheel behavior, and the small site index are shared as cacheable assets.

## Project layout

```text
content/
  config.js                 Branches, topics, colors, and principles
  articles/                 One Markdown file per essay
template/
  index.html                Shared page shell
  wheel.html                Wheel-page markup
  styles.css                Site styling
  site.js                   Shared article controls
  wheel.js                  Wheel drawing and in-page wheel navigation
build.js                    Static-site generator
verify.js                   Generated-output checks
docs/                       GitHub Pages output
```

## Install, build, and test

```bash
npm install
npm run build
npm test
```

`npm run build` writes the finished site to `docs/`. `npm test` rebuilds it and verifies page structure, metadata, internal links, generated assets, the sitemap, and robots rules.

## Writing an article

Create a Markdown file in `content/articles/` with frontmatter followed by the essay:

```markdown
---
title: My Essay Title
subtitle: An optional subtitle
date: 2026-07-15
branch: economics
parents: [markets, fiscal]
slug: my-essay
dek: A one-line description shown in article lists
---

Your essay begins here.
```

Supported frontmatter:

- `title`, `slug`, and `date` are required.
- Non-center essays require `branch` and `parents`.
- `subtitle`, `dek`, `eyebrow`, and `updated` are optional.
- `center: true` marks the founding centerpiece.

Topic keys:

- Economics: `labor`, `monetary`, `fiscal`, `markets`
- Culture: `education`, `community`, `justice`, `identity`
- Governance: `elections`, `institutions`, `foreign`, `ruleoflaw`

After editing content, run `npm test` and commit the regenerated `docs/` output with the source changes. GitHub Pages serves the `docs/` directory.
