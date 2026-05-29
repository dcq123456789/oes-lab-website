# OES 实验室官网 — 实现方案

## 一、项目定位

静态 SPA 展示网站 + 本地 Node.js 后台管理工具。前台部署到 GitHub Pages 对外公开，后台仅在本地 `localhost:8080` 运行。

## 二、架构

```
用户浏览器 ─→ GitHub Pages（index.html + app.js 静态文件）
                                           |
                              data/*.json（只读，预编译数据）
```

```
管理员 ─→ localhost:8080/admin.html ─→ server/start-server.js（Node.js）
                                            │
                                     ┌──────┼──────┐
                                     ↓      ↓      ↓
                              data/*.json  image/  git push
```

## 三、前端（index.html + app.js）

| 特性 | 实现方式 |
|------|---------|
| 页面路由 | Hash 路由（`#home`、`#research`、`#members` 等） |
| 样式 | Tailwind CSS JIT CDN（`cdn.tailwindcss.com`） |
| 轮播 | 纯 JS 手动实现，支持自动播放 + 圆点导航 + 可点击跳转 |
| 成员详情页 | 动态加载，包含头像、简历、教育/工作经历、研究方向 |
| 地图 | 外链（百度/高德），不用 iframe |
| 图片引用 | URL 相对路径（`image/xxx.jpg`） |

## 四、后端（server/start-server.js）

| API | 方法 | 功能 |
|-----|------|------|
| `/api/load` | GET | 读取全部 `data/*.json` 返回给前端 |
| `/api/login` | POST | 从 `config/admin.json` 验证账号密码 |
| `/api/save` | POST | 将前端修改写入 `data/*.json` |
| `/api/upload` | POST | 保存图片到 `image/` 并自动压缩至 ≤20KB（sharp） |
| `/api/git-push` | POST | 三步骤执行 git add → commit → push |

## 五、数据存储

| 文件 | 内容 |
|------|------|
| `data/directions.json` | 研究方向（标题、图标、描述、子项、图片） |
| `data/members.json` | 团队成员（姓名、职位、简介、照片、简历、经历） |
| `data/publications.json` | 发表论文（年份、标题、作者、期刊、DOI） |
| `data/news.json` | 新闻动态（标题、日期、内容、分类） |
| `data/carousel.json` | 轮播图（标题、描述、图片、跳转链接、排序） |
| `data/messages.json` | 访客留言 |
| `config/admin.json` | 管理后台登录凭据（已加入 `.gitignore`，不提交） |

原则：
- 图片只存 URL 路径，不存 base64（JSON 体积小、加载快）
- 图片统一存到 `image/` 目录，上传时自动压缩

## 六、图片处理

| 步骤 | 说明 |
|------|------|
| 上传 | 通过管理后台选择文件 |
| 传输 | FileReader 转 base64，POST 到 `/api/upload` |
| 压缩 | sharp 自动压缩至 ≤20KB（JPEG quality 从 80 逐级降低） |
| 存储 | 保存为 `.jpg` 到 `image/` 目录 |
| 引用 | JSON 中存 `image/文件名.jpg` |
| 显示 | 前端用 `<img src="image/xxx.jpg">` 或 CSS background-image |

同时支持手动输入 URL（可填相对路径或外部链接）。

## 七、部署

### GitHub Pages
- `git push` → 自动部署
- 前台 `index.html` 可正常访问
- **后台 `admin.html` 不可用**（无 Node.js 后端）

### Railway（备选，后台线上可用）
- 完整部署 `server/start-server.js`
- 使用 Volume 持久化 `data/` 和 `image/`
- 后台线上可操作

## 八、Git 工作流

1. 本地编辑 / 通过管理后台修改数据
2. 保存后通过"推送至 GitHub"按钮或手动 `git push`
3. 等待 1-2 分钟 GitHub Pages 部署

注意：提交前需确认是否真的要推送。

## 九、安全措施

| 措施 | 说明 |
|------|------|
| 登录验证 | 后台通过 `/api/login` 验证，密码存在 `config/admin.json` |
| 配置文件 | `config/admin.json` 已加入 `.gitignore`，不提交到仓库 |
| BOM 防护 | 服务端读取 JSON 时自动去除 BOM 字符 |
| 密码不泄露 | README 不展示默认凭据 |

## 十、依赖

- Node.js（运行服务器）
- npm 包：sharp（图片压缩）
- 启动前执行 `npm install`

## 十一、更新日志

| 日期 | 变更 |
|------|------|
| 2026-05-21 | 初始版本 |
| 2026-05-21 | 后台保存改为 API 直接写本地文件 |
| 2026-05-22 | 图片从 base64 切换为 URL 路径 |
| 2026-05-22 | 新增 `/api/upload` 上传接口 |
| 2026-05-22 | 新增 `/api/login` + `config/admin.json` |
| 2026-05-22 | 新增 `/api/git-push` 推送按钮 |
| 2026-05-22 | 所有图片压缩（1.7MB → 56KB） |
| 2026-05-22 | 轮播图支持点击跳转 |
| 2026-05-22 | Git push 拆分三步执行 |
| 2026-05-25 | 上传图片自动压缩至 20KB 以内 |
