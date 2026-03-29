const router = require('express').Router();
const { pool } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { sendWhatsApp } = require('../whatsapp');

router.use(authMiddleware);

const TICKET_SELECT = `
  SELECT t.*,
    c.name AS client_name, c.phone AS client_phone,
    c.address AS client_address, c.lat AS client_lat, c.lng AS client_lng,
    u.name AS assigned_name,
    cb.name AS created_by_name
  FROM tickets t
  LEFT JOIN clients c ON t.client_id = c.id
  LEFT JOIN users u ON t.assigned_to = u.id
  LEFT JOIN users cb ON t.created_by = cb.id
`;

router.get('/', async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (req.user.role === 'technician') {
      params.push(req.user.id);
      where += ` AND t.assigned_to = $${params.length}`;
    }
    if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); where += ` AND t.assigned_to = $${params.length}`; }

    const { rows } = await pool.query(`${TICKET_SELECT} ${where} ORDER BY t.created_at DESC`, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`${TICKET_SELECT} WHERE t.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Ticket no encontrado' });

    const history = await pool.query(
      `SELECT th.*, u.name AS changed_by_name FROM ticket_history th
       LEFT JOIN users u ON th.changed_by = u.id
       WHERE th.ticket_id = $1 ORDER BY th.created_at ASC`,
      [req.params.id]
    );
    res.json({ ...rows[0], history: history.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('admin', 'secretary'), async (req, res) => {
  try {
    const { client_name, client_phone, client_address, lat, lng, description, priority } = req.body;

    const clientResult = await pool.query(
      'INSERT INTO clients (name, phone, address, lat, lng) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [client_name, client_phone || null, client_address || null, lat || null, lng || null]
    );
    const clientId = clientResult.rows[0].id;

    const countResult = await pool.query('SELECT COUNT(*) FROM tickets');
    const ticketNumber = `COS-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    const { rows } = await pool.query(
      `INSERT INTO tickets (ticket_number, client_id, description, priority, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [ticketNumber, clientId, description, priority || 'normal', req.user.id]
    );

    const ticket = { ...rows[0], client_name, client_address, client_phone, client_lat: lat, client_lng: lng };
    req.app.get('io').emit('ticket:new', ticket);

    // Notificar a todos los técnicos por WhatsApp
    const techResult = await pool.query(
      `SELECT phone FROM users WHERE role = 'technician' AND active = true AND phone IS NOT NULL`
    );
    const msg = `🔔 *NUEVO RECLAMO - COSPEC*\n\n*Ticket:* ${ticketNumber}\n*Cliente:* ${client_name}\n*Dirección:* ${client_address || 'No especificada'}\n*Descripción:* ${description}\n*Prioridad:* ${priority || 'normal'}\n\n_Ingresá al panel para verlo._`;
    for (const tech of techResult.rows) {
      await sendWhatsApp(tech.phone, msg);
    }

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const current = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Ticket no encontrado' });

    const oldStatus = current.rows[0].status;
    const isResolved = status === 'resolved';

    const updateQuery = isResolved
      ? 'UPDATE tickets SET status=$1, resolution_notes=COALESCE($2,resolution_notes), updated_at=NOW(), resolved_at=NOW() WHERE id=$3 RETURNING *'
      : 'UPDATE tickets SET status=$1, resolution_notes=COALESCE($2,resolution_notes), updated_at=NOW() WHERE id=$3 RETURNING *';

    const { rows } = await pool.query(updateQuery, [status, notes || null, req.params.id]);

    await pool.query(
      'INSERT INTO ticket_history (ticket_id, changed_by, old_status, new_status, notes) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, req.user.id, oldStatus, status, notes || null]
    );

    req.app.get('io').emit('ticket:updated', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/assign', requireRole('admin', 'secretary'), async (req, res) => {
  try {
    const { technician_id } = req.body;
    const { rows } = await pool.query(
      'UPDATE tickets SET assigned_to=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [technician_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ticket no encontrado' });

    await pool.query(
      'INSERT INTO ticket_history (ticket_id, changed_by, old_status, new_status, notes) VALUES ($1,$2,$3,$3,$4)',
      [req.params.id, req.user.id, rows[0].status, `Asignado a técnico`]
    );

    req.app.get('io').emit('ticket:updated', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
