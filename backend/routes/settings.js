/**
 * routes/settings.js — Configurações do site (lowdb)
 */

const express = require('express');
const { db }  = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();

/* GET /api/settings — público */
router.get('/', (req, res) => {
    res.json(db.get('settings').value());
});

/* PUT /api/settings — admin */
router.put('/', auth, (req, res) => {
    const allowed = [
        'studio_name', 'specialty', 'hero_desc',
        'whatsapp', 'email', 'instagram',
        'stat_projects', 'stat_clients', 'stat_years',
    ];

    const patch = {};
    allowed.forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
    db.get('settings').assign(patch).write();
    res.json(db.get('settings').value());
});

module.exports = router;
