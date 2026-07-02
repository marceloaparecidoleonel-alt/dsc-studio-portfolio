/**
 * routes/renders.js — CRUD completo de Renders/Projetos (lowdb)
 */

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const { db, nextId } = require('../db');
const auth     = require('../middleware/auth');
const upload   = require('../middleware/upload');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function deleteFile(filename) {
    if (!filename) return;
    const fp = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch {}
}

function parseId(id) { return isNaN(id) ? id : Number(id); }

/* ── GET /api/renders ── */
router.get('/', (req, res) => {
    const { category, all } = req.query;
    let list = db.get('renders').value();
    if (all !== '1') list = list.filter(r => r.published);
    if (category) list = list.filter(r => r.category === category);
    res.json(list);
});

/* ── GET /api/renders/:id ── */
router.get('/:id', (req, res) => {
    const r = db.get('renders').find({ id: parseId(req.params.id) }).value();
    if (!r) return res.status(404).json({ error: 'Projeto não encontrado.' });
    res.json(r);
});

/* ── POST /api/renders ── */
router.post('/', auth, upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'images', maxCount: 20 }
]), (req, res) => {
    const { title, category, year, software, description, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Título obrigatório.' });

    const coverFile  = req.files?.cover?.[0]?.filename || null;
    const imageFiles = (req.files?.images || []).map((f, i) => ({ id: nextId(), filename: f.filename, order_pos: i }));

    const render = {
        id:          nextId(),
        title,
        category:    category || null,
        year:        year || null,
        software:    software || null,
        description: description || null,
        cover:       coverFile,
        images:      imageFiles,
        published:   !(published === 'false' || published === '0'),
        order_pos:   0,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
    };

    db.get('renders').unshift(render).write();
    res.status(201).json(render);
});

/* ── PUT /api/renders/:id ── */
router.put('/:id', auth, upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'images', maxCount: 20 }
]), (req, res) => {
    const id = parseId(req.params.id);
    const render = db.get('renders').find({ id }).value();
    if (!render) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const { title, category, year, software, description, published, remove_images } = req.body;

    let cover = render.cover;
    if (req.files?.cover?.[0]) {
        deleteFile(render.cover);
        cover = req.files.cover[0].filename;
    }

    let images = [...(render.images || [])];

    /* Remover imagens por id */
    if (remove_images) {
        try {
            const ids = JSON.parse(remove_images).map(Number);
            images = images.filter(img => {
                if (ids.includes(img.id)) { deleteFile(img.filename); return false; }
                return true;
            });
        } catch {}
    }

    /* Adicionar novas */
    const maxOrder = images.reduce((m, i) => Math.max(m, i.order_pos || 0), 0);
    (req.files?.images || []).forEach((f, i) => {
        images.push({ id: nextId(), filename: f.filename, order_pos: maxOrder + i + 1 });
    });

    const updated = {
        ...render,
        title:       title       || render.title,
        category:    category    !== undefined ? category    : render.category,
        year:        year        !== undefined ? year        : render.year,
        software:    software    !== undefined ? software    : render.software,
        description: description !== undefined ? description : render.description,
        cover,
        images,
        published:   !(published === 'false' || published === '0'),
        updated_at:  new Date().toISOString(),
    };

    db.get('renders').find({ id }).assign(updated).write();
    res.json(updated);
});

/* ── DELETE /api/renders/:id ── */
router.delete('/:id', auth, (req, res) => {
    const id = parseId(req.params.id);
    const render = db.get('renders').find({ id }).value();
    if (!render) return res.status(404).json({ error: 'Projeto não encontrado.' });

    (render.images || []).forEach(img => deleteFile(img.filename));
    deleteFile(render.cover);
    db.get('renders').remove({ id }).write();
    res.json({ message: 'Projeto excluído.' });
});

module.exports = router;
