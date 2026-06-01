# OES 实验室官网 (OES Lab Website)

这是一个为 **OES (Optics, Electronics, Sensing)** 实验室构建的静态响应式网站。它包含前台展示页面和后台管理系统，支持内容动态更新。

## ✨ 功能特性

*   **单页应用 (SPA)**: 基于 Hash 路由，无刷新页面切换，体验流畅。
*   **后台管理系统**: 提供可视化的后台界面，支持对团队成员、新闻、论文、研究方向等数据进行增删改查。
*   **本地数据持久化**: 通过内置的 Node.js 服务器，支持在本地直接保存修改到 JSON 文件，无需导入导出。
*   **响应式设计**: 完美适配桌面端和移动端设备。
*   **部署便捷**: 支持一键部署到 GitHub Pages 或 Vercel。

## 📂 目录结构

```text
.
├── data/                  # 数据存储目录 (JSON 格式)
│   ├── directions.json    # 研究方向数据
│   ├── members.json       # 团队成员数据
│   ├── news.json          # 新闻动态数据
│   ├── publications.json  # 发表论文数据
│   ├── messages.json      # 留言数据
│   └── carousel.json      # 轮播图数据
├── image/                 # 上传的图片文件
├── src/
│   └── js/
│       └── app.js         # 前端核心逻辑 (路由、渲染、交互)
├── admin.html             # 后台管理页面
├── index.html             # 前台展示入口
├── start-server.js        # 本地开发服务器 (Node.js)
├── config/
│   └── admin.json         # 管理员账号密码 (不纳入 Git)
├── .nojekyll              # 禁用 GitHub Pages Jekyll 构建
└── README.md              # 项目说明文档
```

## 🚀 快速开始

### 1. 环境准备
确保你的电脑上已安装 [Node.js](https://nodejs.org/)。

### 2. 安装与运行
克隆项目后，进入项目目录：

```bash
cd oes-lab-website
```

启动本地服务器：

```bash
node start-server.js
```

服务器启动后，访问以下地址：
*   **前台展示**: http://localhost:8080
*   **后台管理**: http://localhost:8080/admin.html (默认账号密码见 `config/admin.json`)

## 🛠 后台管理说明

1.  **登录**: 访问 `/admin.html`，使用 `config/admin.json` 中的账号密码登录。
2.  **修改数据**: 在对应的标签页（如团队成员、新闻）进行编辑。
3.  **保存**: 点击右上角的 **"保存"** 按钮。数据将直接写入本地的 `data/` 目录下的 JSON 文件中。
4.  **生效**: 刷新前台页面即可看到更新后的内容。

> **注意**: 线上部署版本（如 GitHub Pages）不支持 Node.js 后端，因此线上的后台无法保存数据。请仅在本地电脑上使用后台管理功能。

##  部署上线

### 方案一：GitHub Pages (免费)
1.  将代码推送到 GitHub 仓库。
2.  进入仓库 **Settings** -> **Pages**。
3.  Source 选择 `Deploy from a branch`，Branch 选择 `main`。
4.  保存后等待约 1-2 分钟，即可通过生成的链接访问网站。

### 方案二：Vercel (推荐，支持私有仓库)
1.  将 GitHub 仓库设为 **Private**（保护源码隐私）。
2.  登录 [Vercel](https://vercel.com)，导入该仓库。
3.  点击 **Deploy**，Vercel 会自动构建并发布网站。
4.  获得专属域名，且源码对外不可见。

## 📦 技术栈

*   **HTML5 / CSS3**
*   **纯 CSS** (自定义设计系统，无框架依赖)
*   **Vanilla JavaScript** (原生 JS，无框架依赖)
*   **Node.js** (仅用于本地开发服务器)

## 📝 更新日志

*   **2026-05-29**: PRISM v2.0 重新设计 — VOID 暗色主题，自定义动画系统，纯 CSS。
*   **2026-05-21**: 初始版本发布，包含基础展示与后台管理功能。
*   **2026-05-21**: 优化后台保存逻辑，支持 API 直接写入本地文件。
*   **2026-05-21**: 增加地图定位功能（湖北工业大学）。

## 📄 许可证

本项目仅供学习交流使用。
