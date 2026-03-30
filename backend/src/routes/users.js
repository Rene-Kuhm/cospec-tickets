const router = require('express').Router();
const { pool } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, username, role, phone, active FROM users ORDER BY role, name'
  );
  res.json(rows);
});

router.get('/technicians', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, username, phone FROM users WHERE role = 'technician' AND active = true ORDER BY name`
  );
  res.json(rows);
});

router.patch('/:id/phone', requireRole('admin'), async (req, res) => {
  const { phone } = req.body;
  await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, req.params.id]);
  res.json({ success: true });
});

// Crear usuario (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, username, password, role, phone } = req.body;
    
    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (!['admin', 'secretary', 'technician'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const { rows } = await pool.query(
      `INSERT INTO users (name, username, password_hash, role, phone) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, role, phone, active`,
      [name, username, password_hash, role, phone || null]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El username ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Actualizar usuario
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, active } = req.body;
    const updates = [];
    const params = [];
    
    if (name) { params.push(name); updates.push(`name = $${params.length}`); }
    if (phone !== undefined) { params.push(phone); updates.push(`phone = $${params.length}`); }
    if (active !== undefined) { params.push(active); updates.push(`active = $${params.length}`); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    params.push(req.params.id);
    
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} 
       RETURNING id, name, username, role, phone, active`,
      params
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar contraseña de usuario
router.patch('/:id/password', requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Contraseña requerida' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.params.id]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar usuario
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    // No permitir eliminarse a sí mismo
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
