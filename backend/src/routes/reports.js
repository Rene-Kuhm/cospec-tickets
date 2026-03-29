const router = require('express').Router();
const ExcelJS = require('exceljs');
const { pool } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_ES = { new: 'Nuevo', reviewing: 'En Revisión', on_the_way: 'En Camino', resolved: 'Resuelto' };
const PRIORITY_ES = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };

router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, todayCount, resolvedToday, pending, urgent] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM tickets'),
      pool.query('SELECT COUNT(*) FROM tickets WHERE DATE(created_at AT TIME ZONE \'America/Argentina/Buenos_Aires\') = $1', [today]),
      pool.query('SELECT COUNT(*) FROM tickets WHERE status=$1 AND DATE(resolved_at AT TIME ZONE \'America/Argentina/Buenos_Aires\')=$2', ['resolved', today]),
      pool.query('SELECT COUNT(*) FROM tickets WHERE status != $1', ['resolved']),
      pool.query('SELECT COUNT(*) FROM tickets WHERE priority=$1 AND status!=$2', ['urgent', 'resolved']),
    ]);
    res.json({
      total: parseInt(total.rows[0].count),
      today: parseInt(todayCount.rows[0].count),
      resolved_today: parseInt(resolvedToday.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      urgent: parseInt(urgent.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const y = parseInt(req.query.year)  || new Date().getFullYear();

    const { rows } = await pool.query(`
      SELECT t.ticket_number, t.description, t.priority, t.status,
        c.name AS client_name, c.address AS client_address, c.phone AS client_phone,
        u.name AS assigned_name, cb.name AS created_by_name,
        t.created_at, t.resolved_at, t.resolution_notes
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users cb ON t.created_by = cb.id
      WHERE EXTRACT(MONTH FROM t.created_at) = $1 AND EXTRACT(YEAR FROM t.created_at) = $2
      ORDER BY t.created_at
    `, [m, y]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'COSPEC Comunicaciones';
    const ws = wb.addWorksheet('Reclamos');

    ws.columns = [
      { header: 'Ticket',         key: 'ticket_number',   width: 12 },
      { header: 'Fecha',          key: 'created_at',      width: 22 },
      { header: 'Cliente',        key: 'client_name',     width: 22 },
      { header: 'Dirección',      key: 'client_address',  width: 32 },
      { header: 'Teléfono',       key: 'client_phone',    width: 16 },
      { header: 'Descripción',    key: 'description',     width: 42 },
      { header: 'Prioridad',      key: 'priority',        width: 12 },
      { header: 'Estado',         key: 'status',          width: 16 },
      { header: 'Técnico',        key: 'assigned_name',   width: 22 },
      { header: 'Cargado por',    key: 'created_by_name', width: 22 },
      { header: 'Resuelto el',    key: 'resolved_at',     width: 22 },
      { header: 'Notas resolución', key: 'resolution_notes', width: 42 },
    ];

    // Header style
    ws.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    const fmt = (d) => d ? new Date(d).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '';

    rows.forEach(r => {
      ws.addRow({
        ...r,
        status:     STATUS_ES[r.status]     || r.status,
        priority:   PRIORITY_ES[r.priority] || r.priority,
        created_at: fmt(r.created_at),
        resolved_at: fmt(r.resolved_at),
      });
    });

    ws.addRow([]);
    const summaryRow = ws.addRow(['RESUMEN DEL MES', '', '', '', '', '', '', '', '', '', '', '']);
    summaryRow.font = { bold: true };
    ws.addRow(['Total reclamos:', rows.length]);
    ws.addRow(['Resueltos:', rows.filter(r => r.status === 'Resuelto').length]);
    ws.addRow(['Pendientes:', rows.filter(r => r.status !== 'Resuelto').length]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reclamos-${MONTH_NAMES[m-1]}-${y}.xlsx`);
    await wb.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
