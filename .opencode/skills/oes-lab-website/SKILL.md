---
name: oes-lab-website
description: OES lab website static SPA with local admin panel, Tailwind CSS JIT CDN, data in JSON files, deployed on GitHub Pages
license: MIT
---

## Overview

Static SPA for OES laboratory. Frontend on GitHub Pages, admin panel works only locally via Node.js server.

## Quick Start

```bash
cd oes-lab-website
node start-server.js
# Visit http://localhost:8080 (frontend)
# Visit http://localhost:8080/admin.html (admin, login: admin/admin)
```

## Project Structure

```
oes-lab-website/
├── index.html              # SPA entry (hash routing: home, research, members, news, publications, contact)
├── admin.html              # Admin panel (directions, members, publications, news, carousel)
├── start-server.js         # Node.js server: /api/load, /api/save, /api/login, /api/upload, /api/git-push
├── config/
│   └── admin.json          # Login credentials (gitignored)
├── data/                   # JSON data files (no base64, only URL paths)
│   ├── directions.json
│   ├── members.json
│   ├── publications.json
│   ├── news.json
│   ├── carousel.json
│   └── messages.json
├── image/                  # Uploaded images (referenced as "image/filename.ext")
├── src/
│   └── js/
│       └── app.js          # Frontend logic, carousel, member detail page
├── .opencode/skills/oes-lab-website/SKILL.md
├── .gitignore
└── README.md
```

## Key Conventions

1. **Tailwind CSS**: Uses `cdn.tailwindcss.com` JIT CDN (do NOT replace with local/build approach)
2. **Images**: Stored in `image/` folder, referenced as `image/xxx.png` in JSON. No base64 in data files.
3. **Image upload via admin**: File → `/api/upload` → saved to `image/` → URL path stored in JSON
4. **Image URL input**: Can also enter relative path (`image/xxx.png`) or external URL directly
5. **Hash routing**: All page routes use `#home`, `#members`, etc.
6. **Admin save**: Writes directly to `data/*.json` files via `/api/save`
7. **Git push via admin**: Green "推送至 GitHub" button runs git add/commit/push via `/api/git-push`
8. **Map**: External link (Baidu/Amap), not iframe
9. **CDN only**: Do NOT attempt to switch to local Tailwind build

## Deployment Workflow

```bash
# Local testing
node start-server.js

# Deploy to GitHub Pages
git add -A
git commit -m "description of changes"
git push
# Wait 1-2 min for Pages build
```

Or use the green "推送至 GitHub" button in the admin panel.

## URLs

- GitHub Pages: https://dcq123456789.github.io/oes-lab-website/
- GitHub Repo: https://github.com/dcq123456789/oes-lab-website
- Live site limitations: Admin API does NOT work online (no Node.js backend on GitHub Pages)

## Admin API Endpoints (localhost:8080)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/load | GET | Read all data/*.json |
| /api/login | POST | Verify credentials from config/admin.json |
| /api/save | POST | Write data to data/*.json |
| /api/upload | POST | Save image to image/, return URL |
| /api/git-push | POST | git add + commit + push |
