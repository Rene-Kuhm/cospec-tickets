const router = require('express').Router();
const { pool } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// Obtener todos los clientes (para secretarias y técnicos)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, dni, phone, address, lat, lng FROM clients ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar clientes en tiempo real por nombre, DNI o dirección
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const searchTerm = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT id, name, dni, phone, address, lat, lng 
       FROM clients 
       WHERE name ILIKE $1 OR dni ILIKE $1 OR address ILIKE $1
       ORDER BY name LIMIT 10`,
      [searchTerm]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Importar clientes desde Excel (array de objetos)
router.post('/import', requireRole('admin'), async (req, res) => {
  try {
    const { clients } = req.body;
    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ error: 'No se recibieron clientes' });
    }

    let imported = 0;
    let errors = [];

    for (const client of clients) {
      try {
        // Upsert: buscar por DNI o nombre+teléfono
        let existing = null;
        if (client.dni) {
          const existingRes = await pool.query(
            'SELECT id FROM clients WHERE dni = $1',
            [client.dni]
          );
          existing = existingRes.rows[0];
        }

        if (existing) {
          // Actualizar
          await pool.query(
            `UPDATE clients SET name = $1, phone = $2, address = $3, lat = $4, lng = $5 WHERE id = $6`,
            [client.name, client.phone, client.address, client.lat, client.lng, existing.id]
          );
        } else {
          // Crear
          await pool.query(
            `INSERT INTO clients (name, dni, phone, address, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)`,
            [client.name, client.dni, client.phone, client.address, client.lat, client.lng]
          );
        }
        imported++;
      } catch (err) {
        errors.push({ client: client.name || client.dni, error: err.message });
      }
    }

    res.json({ imported, errors, total: clients.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un cliente
router.post('/', async (req, res) => {
  try {
    const { name, dni, phone, address, lat, lng } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO clients (name, dni, phone, address, lat, lng) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, dni, phone, address, lat, lng]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
