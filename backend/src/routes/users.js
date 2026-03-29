const router = require('express').Router();
const { pool } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

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

module.exports = router;
