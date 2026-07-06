const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const sharp = require('sharp');

const PORT = 8080;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff'
};

// Cache policy per file type (seconds)
function getCacheMaxAge(extname) {
    const longCache = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff2', '.woff'];
    if (longCache.indexOf(extname) !== -1) return 31536000; // 1 year for images/fonts (immutable)
    if (extname === '.css') return 86400;   // 1 day for CSS
    if (extname === '.js') return 3600;     // 1 hour for JS (changes frequently during dev)
    if (extname === '.html') return 0;      // no cache for HTML
    return 3600; // 1 hour default
}

// Auto-generate merged data.json after save
function rebuildDataJSON() {
    try {
        const dataDir = path.join(__dirname, 'data');
        const files = ['directions', 'members', 'publications', 'news', 'carousel'];
        const result = {};
        let allOk = true;
        files.forEach(f => {
            const filePath = path.join(dataDir, f + '.json');
            try {
                result[f] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch(e) {
                result[f] = [];
                allOk = false;
            }
        });
        fs.writeFileSync(path.join(dataDir, 'data.json'), JSON.stringify(result));
        console.log('[auto] data.json regenerated (' + new Date().toLocaleTimeString() + ')');
        return allOk;
    } catch(e) {
        console.error('[auto] Failed to rebuild data.json:', e.message);
        return false;
    }
}

function serveStatic(req, res, filePath) {
    // ETag calculation
    try {
        const stat = fs.statSync(filePath);
        const etag = crypto.createHash('md5')
            .update(filePath + stat.mtime.getTime())
            .digest('hex');

        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
            res.writeHead(304, { 'ETag': etag });
            res.end();
            return;
        }

        const extname = String(path.extname(filePath)).toLowerCase();
        const contentType = MIME_TYPES[extname] || 'application/octet-stream';
        const maxAge = getCacheMaxAge(extname);

        const content = fs.readFileSync(filePath);
        const acceptEncoding = req.headers['accept-encoding'] || '';

        // Gzip for compressible types
        const compressible = ['.html', '.js', '.css', '.json', '.svg'].indexOf(extname) !== -1;
        if (compressible && acceptEncoding.indexOf('gzip') !== -1) {
            const gzipped = zlib.gzipSync(content);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Encoding': 'gzip',
                'Cache-Control': 'public, max-age=' + maxAge,
                'ETag': etag
            });
            res.end(gzipped);
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': content.length,
            'Cache-Control': 'public, max-age=' + maxAge,
            'ETag': etag
        });
        res.end(content);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
        } else {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>500 Internal Server Error</h1>', 'utf-8');
        }
    }
}

const server = http.createServer((req, res) => {
    // CORS headers (for local admin only)
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API: Load all data
    if (req.url === '/api/load' && req.method === 'GET') {
        const dataDir = path.join(__dirname, 'data');
        const result = {};
        const files = ['directions.json', 'members.json', 'publications.json', 'news.json', 'messages.json', 'carousel.json'];
        let completed = 0;
        files.forEach(file => {
            const filePath = path.join(dataDir, file);
            fs.readFile(filePath, 'utf-8', (err, content) => {
                const key = file.replace('.json', '');
                result[key] = err ? [] : JSON.parse(content);
                completed++;
                if (completed === files.length) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }
            });
        });
        return;
    }

    // API: Login
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

    // API: Upload image (auto-compress to ~20KB)
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

                // Skip compress if already under 20KB
                if (buf.length <= 20000) {
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

                let quality = 80;
                const compress = () => {
                    sharp(buf).jpeg({ quality, progressive: true }).toBuffer((err, outBuf) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: err.message }));
                            return;
                        }
                        if (outBuf.length > 20000 && quality > 10) {
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

    // API: Save all data
    if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const dataDir = path.join(__dirname, 'data');
                const files = ['directions', 'members', 'publications', 'news', 'messages', 'carousel'];
                let completed = 0;
                files.forEach(key => {
                    if (data[key]) {
                        const filePath = path.join(dataDir, `${key}.json`);
                        fs.writeFile(filePath, JSON.stringify(data[key], null, 2), 'utf-8', () => {
                            completed++;
                            if (completed === files.length) {
                                // Auto-regenerate merged data.json for frontend
                                rebuildDataJSON();
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true }));
                            }
                        });
                    } else {
                        completed++;
                        if (completed === files.length) {
                            rebuildDataJSON();
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        }
                    }
                });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API: Git push to GitHub
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

    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    serveStatic(req, res, filePath);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[x] 端口 ${PORT} 已被占用，请先关闭占用进程后重试。`);
        console.error(`[x] 运行: netstat -ano | findstr :${PORT}  查看占用 PID，然后 taskkill /F /PID <PID>\n`);
        process.exit(1);
    }
    throw err;
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('按 ESC 退出');
    rebuildDataJSON();
});

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', key => {
        if (key[0] === 27) { // ESC
            process.stdin.setRawMode(false);
            process.exit();
        }
    });
    process.stdin.resume();
}
