# OES 实验室官网

OES（光学·电学·传感）实验室展示网站，纯原生前端 SPA + 本地 Node.js 管理后台。

## 架构

```
云端 (GitHub Pages / Vercel)          本地 (localhost:8080)
┌──────────────────────┐           ┌──────────────────────┐
│ index.html           │           │ admin.html           │
│ styles.css           │           │ start-server.js      │
│ src/app.js           │  git push │ server/db.js (SQLite) │
│ data/data.json       │ ←──────── │ API: save/upload     │
│ image/               │           │                      │
│                      │           │ 编辑 → 保存 → 推送     │
└──────────────────────┘           └──────────────────────┘
```

- **前台**：纯静态 SPA，部署到云端，访问者可见
- **后台**：Node.js 服务器，仅本地运行，用于内容管理
- **同步**：后台保存 → 自动生成 `data/data.json` → Git Push → 云端自动部署

## 目录结构

```
├── index.html              # 前台入口 (cloud)
├── styles.css              # 前台样式 (cloud)
├── admin.html              # 后台页面 (local)
├── start-server.js         # 后台服务器入口 (local)
├── package.json            # 依赖 (local)
│
├── src/
│   └── app.js              # 前端核心逻辑 (cloud)
│
├── server/
│   └── db.js               # SQLite 数据库模块 (local)
│
├── data/
│   ├── data.json           # 合并数据 (cloud, 自动生成)
│   ├── messages.json       # 用户留言 (local)
│   └── oes.db              # SQLite 数据库 (local, gitignored)
│
├── image/                  # 图片资源 (cloud)
│   └── *.jpg
│
└── config/
    └── admin.json          # 管理员账号 (local, gitignored)
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动后台
node start-server.js

# 访问后台: http://localhost:8080
# 默认账号密码见 config/admin.json
```

按 `ESC` 退出服务器。

## 工作流程

1. `npm install` → `node start-server.js`
2. 打开 `http://localhost:8080` 登录后台
3. 编辑内容 → 点击**保存**（自动写入 SQLite + 生成 data.json）
4. 点击**推送至 GitHub** → 云端自动部署

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | HTML5 / CSS3 / Vanilla JS (ES6)，零框架 |
| 后端 | Node.js 原生 `http` 模块 |
| 数据库 | SQLite（sql.js，WebAssembly） |
| 图片处理 | sharp（上传自动压缩至 ≤20KB） |
| 后台 UI | Tailwind CSS CDN |
| 字体 | Inter + Space Grotesk（Google Fonts 异步加载） |

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/load` | GET | 读取全部数据 |
| `/api/login` | POST | 验证账号密码 |
| `/api/save` | POST | 保存数据（SQLite + JSON） |
| `/api/upload` | POST | 上传图片（自动压缩） |
| `/api/git-push` | POST | Git add → commit → push |

## 部署

### 前台（云端）

推送代码后 GitHub Pages / Vercel 自动部署静态文件：
`index.html` `styles.css` `src/app.js` `data/data.json` `image/`

### 后台（本地）

仅本地运行 `node start-server.js`，不需要也不应该在云端运行。
