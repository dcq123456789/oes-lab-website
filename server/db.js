// ===== OES Lab Database Module (SQLite via sql.js) =====
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'oes.db');

let db = null;
let SQL = null;

// Table column definitions (column order matters for INSERT)
const TABLE_COLS = {
    directions: ['id', 'title', 'icon', 'bgColor', 'description', 'subItems', 'sortOrder', 'image', 'achievements'],
    members: ['id', 'name', 'role', 'bio', 'email', 'phone', 'category', 'photo', 'sortOrder',
        'resume', 'education', 'experience', 'research'],
    publications: ['id', 'year', 'title', 'authors', 'journal', 'doi', 'volume', 'pages', 'sortOrder'],
    news: ['id', 'title', 'date', 'content', 'category', 'sortOrder'],
    carousel: ['id', 'title', 'desc', 'bg', 'icon', 'image', 'link', 'sortOrder']
};

const JSON_COLS = {
    directions: ['subItems', 'achievements']
};

// ===== Initialization =====
async function initDB() {
    const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    SQL = await initSqlJs({
        locateFile: () => wasmPath
    });

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('[db] Loaded existing database from data/oes.db');
    } else {
        db = new SQL.Database();
        console.log('[db] Created new database');
    }

    createTables();
    return db;
}

// ===== Create Tables =====
function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS directions (
        id INTEGER PRIMARY KEY, title TEXT, icon TEXT, bgColor TEXT,
        description TEXT, subItems TEXT, sortOrder INTEGER DEFAULT 0, image TEXT,
        achievements TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY, name TEXT, role TEXT, bio TEXT, email TEXT,
        phone TEXT, category TEXT, photo TEXT, sortOrder INTEGER DEFAULT 0,
        resume TEXT, education TEXT, experience TEXT, research TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS publications (
        id INTEGER PRIMARY KEY, year INTEGER, title TEXT, authors TEXT,
        journal TEXT, doi TEXT, volume TEXT, pages TEXT, sortOrder INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY, title TEXT, date TEXT, content TEXT, category TEXT,
        sortOrder INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS carousel (
        id INTEGER PRIMARY KEY, title TEXT, "desc" TEXT, bg TEXT,
        icon TEXT, image TEXT, link TEXT, sortOrder INTEGER DEFAULT 0
    )`);
    // Migration: add achievements column for existing databases
    try { db.run(`ALTER TABLE directions ADD COLUMN achievements TEXT`); console.log('[db] Added achievements column'); } catch(e) {}
}

// ===== Helpers =====
function execResultToRows(result) {
    if (!result || !result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
    });
}

function parseJSONFields(name, rows) {
    const cols = JSON_COLS[name];
    if (!cols) return rows;
    return rows.map(r => {
        cols.forEach(c => {
            try { r[c] = JSON.parse(r[c] || '[]'); } catch (e) { r[c] = []; }
        });
        return r;
    });
}

function serializeJSONFields(name, row) {
    const cols = JSON_COLS[name];
    if (!cols) return { ...row };
    const copy = { ...row };
    cols.forEach(c => {
        if (Array.isArray(copy[c])) copy[c] = JSON.stringify(copy[c]);
    });
    return copy;
}

// ===== Read =====
function getTable(name) {
    const tbl = name === 'carousel' ? `"${name}"` : name;
    const result = db.exec(`SELECT * FROM ${tbl} ORDER BY sortOrder, id`);
    let rows = execResultToRows(result);
    rows = parseJSONFields(name, rows);
    return rows;
}

// Get all tables as a single object (for /api/load)
function getAllTables() {
    const data = {};
    const tables = ['directions', 'members', 'publications', 'news', 'carousel'];

    for (const name of tables) {
        data[name] = getTable(name);
    }

    // Messages stay in JSON (user-submitted, not admin-edited)
    const msgPath = path.join(__dirname, '..', 'data', 'messages.json');
    try {
        if (fs.existsSync(msgPath)) {
            data.messages = JSON.parse(fs.readFileSync(msgPath, 'utf-8'));
        } else {
            data.messages = [];
        }
    } catch (e) {
        data.messages = [];
    }

    return data;
}

// ===== Write =====
function replaceTable(name, rows) {
    const cols = TABLE_COLS[name];
    if (!cols) return;

    db.run('BEGIN TRANSACTION');
    db.run(`DELETE FROM ${name}`);

    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT INTO ${name} (${cols.join(',')}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);

    for (const row of rows) {
        const serialized = serializeJSONFields(name, row);
        const values = cols.map(col => {
            let val = serialized[col];
            if (val === undefined || val === null) return null;
            return val;
        });
        stmt.run(values);
    }

    stmt.free();
    db.run('COMMIT');
}

function saveAllTables(data) {
    const tables = ['directions', 'members', 'publications', 'news', 'carousel'];
    for (const name of tables) {
        if (data[name]) {
            replaceTable(name, data[name]);
        }
    }
    saveToFile();
}

// ===== Persistence =====
function saveToFile() {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
        console.log('[db] Saved to data/oes.db');
    } catch (e) {
        console.error('[db] Failed to save:', e.message);
    }
}

// ===== Migration =====
function migrateFromJSON() {
    const jsonPath = path.join(__dirname, '..', 'data', 'data.json');
    if (!fs.existsSync(jsonPath)) {
        console.log('[db] No data.json found, skipping migration');
        return false;
    }

    try {
        const all = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const tables = ['directions', 'members', 'publications', 'news', 'carousel'];
        let migrated = 0;

        for (const name of tables) {
            const rows = all[name];
            if (!Array.isArray(rows) || rows.length === 0) continue;
            replaceTable(name, rows);
            migrated++;
            console.log(`[db] Migrated ${rows.length} records to table "${name}"`);
        }

        if (migrated > 0) {
            saveToFile();
            console.log(`[db] Migration complete: ${migrated} tables imported from data.json`);
            return true;
        }
    } catch (e) {
        console.error('[db] Migration failed:', e.message);
    }
    return false;
}

// Check if any table has data
function hasData() {
    const tables = ['directions', 'members', 'publications', 'news', 'carousel'];
    for (const name of tables) {
        const result = db.exec(`SELECT COUNT(*) as cnt FROM ${name}`);
        if (result.length && result[0].values[0][0] > 0) return true;
    }
    return false;
}

// Close database gracefully
function close() {
    if (db) {
        saveToFile();
        db.close();
        console.log('[db] Database closed');
    }
}

module.exports = { initDB, getTable, getAllTables, replaceTable, saveAllTables, saveToFile, migrateFromJSON, hasData, close };
