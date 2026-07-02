/**
 * server.js — DSC Studio Backend
 * Express + SQLite + JWT + Multer
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');


const app  = express();
const PORT = process.env.PORT || 3001;

/* ── CORS ────────────────────────────────────────── */
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    credentials: true,
}));

/* ── BODY PARSERS ────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── ARQUIVOS ESTÁTICOS (uploads) ────────────────── */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ── ROTAS API ───────────────────────────────────── */
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/renders',  require('./routes/renders'));
app.use('/api/tours',    require('./routes/tours'));
app.use('/api/settings', require('./routes/settings'));

/* ── HEALTH CHECK ────────────────────────────────── */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── 404 ─────────────────────────────────────────── */
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
});

/* ── ERROR HANDLER ───────────────────────────────── */
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'Arquivo muito grande. Máximo: 30MB.' });
    res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
});

/* ── START ───────────────────────────────────────── */
app.listen(PORT, () => {
    console.log(`\n✅ DSC Studio Backend rodando em http://localhost:${PORT}`);
    console.log(`📁 Uploads em: ${path.join(__dirname, 'uploads')}`);
    console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL || 'admin@dscstudio.com'}\n`);
});
