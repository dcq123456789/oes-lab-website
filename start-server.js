// ===== OES Lab Admin Server (Local Only) =====
// Serves: admin.html + APIs (load, save, upload, login, git-push)
// Frontend (index.html, styles.css, app.js) → deployed to cloud separately
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const db = require('./server/db');

const PORT = 8080;

// 设为 true 时本地同时服务前台 index.html 方便预览
const SERVE_FRONTEND = true;

// Auto-generate merged data.json from database (committed to git → cloud deployment)
function rebuildDataJSON() {
    try {
        const all = db.getAllTables();
        const frontend = {
            directions: all.directions || [],
            members: all.members || [],
            publications: all.publications || [],
            news: all.news || [],
            carousel: all.carousel || []
        };
        fs.writeFileSync(path.join(__dirname, 'data', 'data.json'), JSON.stringify(frontend, null, 2));
        console.log('[auto] data.json regenerated (' + new Date().toLocaleTimeString() + ')');
        return true;
    } catch(e) {
        console.error('[auto] Failed to rebuild data.json:', e.message);
        return false;
    }
}

// Minimal static file server — only for admin.html and uploaded images (admin previews)
function serveFile(req, res, filePath) {
    try {
        const stat = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
            '.html': 'text/html; charset=utf-8',
            '.js':   'text/javascript',
            '.css':  'text/css',
            '.json': 'application/json',
            '.jpg':  'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png':  'image/png',
            '.svg':  'image/svg+xml',
            '.gif':  'image/gif',
            '.webp': 'image/webp',
            '.ico':  'image/x-icon'
        }[ext] || 'application/octet-stream';

        // ETag: based on file path + modification time (changes when file is edited)
        const etag = '"' + Buffer.from(filePath + stat.mtime.getTime().toString()).toString('base64').slice(0, 27) + '"';

        const headers = { 'Content-Type': mime };

        // 304 if ETag matches (browser has latest version)
        if (req.headers['if-none-match'] === etag) {
            res.writeHead(304, headers);
            res.end();
            return;
        }

        headers['ETag'] = etag;

        // Cache strategy per file type
        if (ext === '.json') {
            headers['Cache-Control'] = 'no-cache';              // data.json: always revalidate
        } else if (ext === '.html' || ext === '.js' || ext === '.css') {
            headers['Cache-Control'] = 'public, max-age=0, must-revalidate';  // code: ask server if changed
        } else {
            headers['Cache-Control'] = 'public, max-age=86400'; // images: cache 1 day
        }

        const content = fs.readFileSync(filePath);
        res.writeHead(200, headers);
        res.end(content);
    } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
    }
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ---- API: Load all data ----
    if (req.url === '/api/load' && req.method === 'GET') {
        const all = db.getAllTables();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(all));
        return;
    }

    // ---- API: Login ----
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username, password } = JSON.parse(body);
                const configPath = path.join(__dirname, 'config', 'admin.json');
                let config = { username: 'admin', password: 'admin' };
                if (fs.existsSync(configPath)) {
                    let raw = fs.readFileSync(configPath, 'utf-8');
                    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
                    config = JSON.parse(raw);
                }
                if (username === config.username && password === config.password) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ---- API: Upload image (auto-compress) ----
    if (req.url === '/api/upload' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { data, name } = JSON.parse(body);
                if (!data || !name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Missing data or name' }));
                    return;
                }
                const imgDir = path.join(__dirname, 'image');
                if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
                const filename = Date.now() + '.jpg';
                const filePath = path.join(imgDir, filename);
                const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
                const buf = Buffer.from(base64Data, 'base64');

                if (buf.length <= 100000) {
                    fs.writeFile(filePath, buf, (err2) => {
                        if (err2) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: err2.message }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, url: 'image/' + filename }));
                        }
                    });
                    return;
                }

                let quality = 85;
                const compress = () => {
                    sharp(buf).jpeg({ quality, progressive: true }).toBuffer((err, outBuf) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: err.message }));
                            return;
                        }
                        if (outBuf.length > 100000 && quality > 40) {
                            quality -= 10;
                            compress();
                            return;
                        }
                        fs.writeFile(filePath, outBuf, (err2) => {
                            if (err2) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, error: err2.message }));
                            } else {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true, url: 'image/' + filename }));
                            }
                        });
                    });
                };
                compress();
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ---- API: Save all data ----
    if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                db.saveAllTables(data);
                if (data.messages !== undefined) {
                    const msgPath = path.join(__dirname, 'data', 'messages.json');
                    fs.writeFileSync(msgPath, JSON.stringify(data.messages, null, 2), 'utf-8');
                }
                rebuildDataJSON();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ---- API: Git push ----
    if (req.url === '/api/git-push' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { message } = JSON.parse(body);
                const exec = require('child_process').exec;
                const repoDir = __dirname;
                const msg = (message || 'update data via admin').replace(/"/g, '\\"');
                const logs = [];

                function run(cmd, cb) {
                    exec(cmd, { cwd: repoDir }, (err, stdout, stderr) => {
                        const out = (stdout || '').trim();
                        const errOut = (stderr || '').trim();
                        if (out) logs.push(out);
                        if (errOut && !err) logs.push(errOut);
                        cb(err, errOut, out);
                    });
                }

                run(`git add -A`, (err1, e1, o1) => {
                    if (err1) { res.end(JSON.stringify({ success: false, error: e1 || 'git add failed' })); return; }
                    run(`git commit -m "${msg}"`, (err2, e2, o2) => {
                        if (err2) {
                            const combined = (e2 || '') + (o2 || '');
                            if (/nothing (to commit|added to commit)/i.test(combined)) {
                                res.end(JSON.stringify({ success: true, output: '没有新变更需要推送' }));
                            } else {
                                res.end(JSON.stringify({ success: false, error: combined || 'git commit failed' }));
                            }
                            return;
                        }
                        run(`git push`, (err3, e3) => {
                            if (err3) {
                                res.end(JSON.stringify({ success: false, error: e3 || 'git push failed' }));
                            } else {
                                res.end(JSON.stringify({ success: true, output: logs.join('\n') }));
                            }
                        });
                    });
                });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ---- Admin static files (admin.html + uploaded images for preview) ----
    const urlPath = req.url.split('?')[0];

    // Serve admin.html at root (or /admin.html) when SERVE_FRONTEND is off
    // When SERVE_FRONTEND is on, root serves index.html instead
    if (urlPath === '/') {
        return serveFile(req, res, path.join(__dirname, SERVE_FRONTEND ? 'index.html' : 'admin.html'));
    }
    if (urlPath === '/admin.html') {
        return serveFile(req, res, path.join(__dirname, 'admin.html'));
    }

    // Serve uploaded images (used in admin previews)
    if (urlPath.startsWith('/image/')) {
        return serveFile(req, res, path.join(__dirname, urlPath));
    }

    // When SERVE_FRONTEND is on, serve frontend static files
    if (SERVE_FRONTEND) {
        const frontendFiles = ['/index.html', '/styles.css', '/src/app.js', '/data/data.json', '/data/messages.json', '/favicon.png'];
        if (frontendFiles.indexOf(urlPath) !== -1 || urlPath.startsWith('/image/')) {
            return serveFile(req, res, path.join(__dirname, urlPath));
        }
    }

    // Everything else: 404
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Not Found</h1>');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[x] 端口 ${PORT} 已被占用，请先关闭占用进程后重试。`);
        console.error(`[x] 运行: netstat -ano | findstr :${PORT}  查看占用 PID，然后 taskkill /F /PID <PID>\n`);
        process.exit(1);
    }
    throw err;
});

// Initialize database then start server
(async () => {
    await db.initDB();
    if (!db.hasData()) {
        console.log('[db] Empty database, migrating from JSON files...');
        db.migrateFromJSON();
    }
    rebuildDataJSON();

    server.listen(PORT, () => {
        console.log('┌─────────────────────────────────────────────┐');
        console.log('│  OES 管理后台 (本地运行)                      │');
        console.log('│                                             │');
        if (SERVE_FRONTEND) {
            console.log(`│  前台:  http://localhost:${PORT}/               │`);
            console.log(`│  后台:  http://localhost:${PORT}/admin.html     │`);
        } else {
            console.log(`│  后台:  http://localhost:${PORT}/               │`);
            console.log('│  前台:  部署在云端 (GitHub Pages / Vercel)     │');
        }
        console.log('│                                             │');
        console.log('│  编辑 → 保存 → 推送至 GitHub → 云端自动更新    │');
        console.log('│  按 ESC 退出                                 │');
        console.log('└─────────────────────────────────────────────┘');
    });
})();

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', key => {
        if (key[0] === 27) { // ESC
            process.stdin.setRawMode(false);
            db.close();
            process.exit();
        }
    });
    process.stdin.resume();
}
