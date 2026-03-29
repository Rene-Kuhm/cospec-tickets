const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedDefaultUsers() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count) > 0) return;

  const hash = await bcrypt.hash('cospec123', 10);
  await pool.query(`
    INSERT INTO users (name, username, password_hash, role, phone) VALUES
    ($1, 'admin',       $2, 'admin',      NULL),
    ($3, 'secretaria1', $2, 'secretary',  NULL),
    ($4, 'secretaria2', $2, 'secretary',  NULL),
    ($5, 'tecnico1',    $2, 'technician', NULL),
    ($6, 'tecnico2',    $2, 'technician', NULL),
    ($7, 'tecnico3',    $2, 'technician', NULL),
    ($8, 'tecnico4',    $2, 'technician', NULL)
  `, ['Administrador', hash, 'Secretaria 1', 'Secretaria 2',
      'Técnico 1', 'Técnico 2', 'Técnico 3', 'Técnico 4']);

  console.log('✅ Usuarios creados. Password por defecto: cospec123');
}

module.exports = { pool, seedDefaultUsers };
