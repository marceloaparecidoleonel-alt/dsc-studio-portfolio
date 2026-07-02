/**
 * db.js — Banco de dados JSON com lowdb v1
 * Sem dependências nativas — funciona em qualquer ambiente
 */

const low    = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const path   = require('path');
require('dotenv').config();

const adapter = new FileSync(path.join(__dirname, 'database.json'));
const db = low(adapter);

/* ── SCHEMA / DEFAULTS ───────────────────────────── */
db.defaults({
    users:    [],
    renders:  [],
    tours:    [],
    settings: {
        studio_name:   'DSC Studio',
        specialty:     'Visualização Arquitetônica',
        hero_desc:     'Criamos renderizações fotorrealistas que transformam projetos arquitetônicos em apresentações impactantes.',
        whatsapp:      '+55 43 99125-4884',
        email:         'dscstudio3d@gmail.com',
        instagram:     '@dscstudio.oficial',
        stat_projects: '150',
        stat_clients:  '80',
        stat_years:    '5',
    }
}).write();

/* ── SEED: Admin padrão ─────────────────────────── */
const adminEmail = process.env.ADMIN_EMAIL || 'admin@dscstudio.com';
const existing   = db.get('users').find({ email: adminEmail }).value();

if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'dsc@2025', 10);
    db.get('users').push({
        id:         1,
        email:      adminEmail,
        password:   hash,
        name:       'Admin DSC Studio',
        created_at: new Date().toISOString(),
    }).write();
    console.log('[DB] Admin criado:', adminEmail);
}

/* ── HELPERS ─────────────────────────────────────── */
let _nextId = Date.now();
function nextId() { return ++_nextId; }

module.exports = { db, nextId };
