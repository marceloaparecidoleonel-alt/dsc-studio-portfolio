/**
 * routes/tours.js — CRUD completo de Tours 360° (lowdb)
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
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

function parseId(id) { return isNaN(id) ? id : Number(id); }

/* ── GET /api/tours ── */
router.get('/', (req, res) => {
    let list = db.get('tours').value();
    if (req.query.all !== '1') list = list.filter(t => t.published);
    res.json(list);
});

/* ── GET /api/tours/:id ── */
router.get('/:id', (req, res) => {
    const tour = db.get('tours').find({ id: parseId(req.params.id) }).value();
    if (!tour) return res.status(404).json({ error: 'Tour não encontrado.' });
    res.json(tour);
});

/* ── POST /api/tours ── */
router.post('/', auth, (req, res) => {
    const { title, category, description, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Título obrigatório.' });

    const tour = {
        id:          nextId(),
        title,
        category:    category    || null,
        description: description || null,
        published:   !(published === 'false' || published === '0'),
        scenes:      [],
        order_pos:   0,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
    };

    db.get('tours').unshift(tour).write();
    res.status(201).json(tour);
});

/* ── PUT /api/tours/:id ── */
router.put('/:id', auth, (req, res) => {
    const id = parseId(req.params.id);
    const tour = db.get('tours').find({ id }).value();
    if (!tour) return res.status(404).json({ error: 'Tour não encontrado.' });

    const { title, category, description, published } = req.body;
    const updated = {
        ...tour,
        title:       title       || tour.title,
        category:    category    !== undefined ? category    : tour.category,
        description: description !== undefined ? description : tour.description,
        published:   !(published === 'false' || published === '0'),
        updated_at:  new Date().toISOString(),
    };

    db.get('tours').find({ id }).assign(updated).write();
    res.json(updated);
});

/* ── DELETE /api/tours/:id ── */
router.delete('/:id', auth, (req, res) => {
    const id = parseId(req.params.id);
    const tour = db.get('tours').find({ id }).value();
    if (!tour) return res.status(404).json({ error: 'Tour não encontrado.' });

    (tour.scenes || []).forEach(s => deleteFile(s.filename));
    db.get('tours').remove({ id }).write();
    res.json({ message: 'Tour excluído.' });
});

/* ── POST /api/tours/:id/scenes ── */
router.post('/:id/scenes', auth, upload.single('image'), (req, res) => {
    const tourId = parseId(req.params.id);
    const tour = db.get('tours').find({ id: tourId }).value();
    if (!tour) return res.status(404).json({ error: 'Tour não encontrado.' });

    const { name, order_pos } = req.body;
    const maxOrder = (tour.scenes || []).reduce((m, s) => Math.max(m, s.order_pos || 0), 0);
    const scene = {
        id:        nextId(),
        tour_id:   tourId,
        name:      name || null,
        filename:  req.file?.filename || null,
        order_pos: order_pos !== undefined ? Number(order_pos) : maxOrder + 1,
    };

    const scenes = [...(tour.scenes || []), scene];
    db.get('tours').find({ id: tourId }).assign({ scenes, updated_at: new Date().toISOString() }).write();
    res.status(201).json(scene);
});

/* ── PUT /api/tours/:tourId/scenes/:sceneId ── */
router.put('/:tourId/scenes/:sceneId', auth, upload.single('image'), (req, res) => {
    const tourId  = parseId(req.params.tourId);
    const sceneId = parseId(req.params.sceneId);
    const tour = db.get('tours').find({ id: tourId }).value();
    if (!tour) return res.status(404).json({ error: 'Tour não encontrado.' });

    const sceneIdx = (tour.scenes || []).findIndex(s => s.id === sceneId);
    if (sceneIdx === -1) return res.status(404).json({ error: 'Cena não encontrada.' });

    const scene = tour.scenes[sceneIdx];
    const { name, order_pos } = req.body;
    let filename = scene.filename;

    if (req.file) {
        deleteFile(scene.filename);
        filename = req.file.filename;
    }

    const updatedScene = {
        ...scene,
        name:      name      !== undefined ? name      : scene.name,
        order_pos: order_pos !== undefined ? Number(order_pos) : scene.order_pos,
        filename,
    };

    const scenes = [...tour.scenes];
    scenes[sceneIdx] = updatedScene;
    db.get('tours').find({ id: tourId }).assign({ scenes, updated_at: new Date().toISOString() }).write();
    res.json(updatedScene);
});

/* ── DELETE /api/tours/:tourId/scenes/:sceneId ── */
router.delete('/:tourId/scenes/:sceneId', auth, (req, res) => {
    const tourId  = parseId(req.params.tourId);
    const sceneId = parseId(req.params.sceneId);
    const tour = db.get('tours').find({ id: tourId }).value();
    if (!tour) return res.status(404).json({ error: 'Tour não encontrado.' });

    const scene = (tour.scenes || []).find(s => s.id === sceneId);
    if (!scene) return res.status(404).json({ error: 'Cena não encontrada.' });

    deleteFile(scene.filename);
    const scenes = tour.scenes.filter(s => s.id !== sceneId);
    db.get('tours').find({ id: tourId }).assign({ scenes }).write();
    res.json({ message: 'Cena excluída.' });
});

module.exports = router;
