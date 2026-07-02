/**
 * routes/auth.js — Login e troca de senha (lowdb)
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();

/* POST /api/auth/login */
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

    const user = db.get('users').find({ email: email.trim().toLowerCase() }).value();
    if (!user || !bcrypt.compareSync(password, user.password))
        return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

/* GET /api/auth/me */
router.get('/me', auth, (req, res) => {
    const user = db.get('users').find({ id: req.user.id }).value();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const { password, ...safe } = user;
    res.json(safe);
});

/* PUT /api/auth/password */
router.put('/password', auth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ error: 'Campos obrigatórios.' });
    if (newPassword.length < 6)
        return res.status(400).json({ error: 'Mínimo 6 caracteres.' });

    const user = db.get('users').find({ id: req.user.id }).value();
    if (!bcrypt.compareSync(currentPassword, user.password))
        return res.status(401).json({ error: 'Senha atual incorreta.' });

    const hash = bcrypt.hashSync(newPassword, 10);
    db.get('users').find({ id: req.user.id }).assign({ password: hash }).write();
    res.json({ message: 'Senha alterada com sucesso.' });
});

module.exports = router;
