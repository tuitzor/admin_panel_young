const express = require('express');
const ExcelJS = require('exceljs');
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/users
router.get('/', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM users ORDER BY id');
  res.json(result.rows);
});

// POST /api/users
router.post('/', auth, async (req, res) => {
  const { name, email } = req.body;
  const result = await pool.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  res.json(result.rows[0]);
});

// PUT /api/users/:id
router.put('/:id', auth, async (req, res) => {
  const { name, email } = req.body;
  const result = await pool.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
    [name, email, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE /api/users/:id
router.delete('/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// GET /api/users/export
router.get('/export', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM users');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');
  sheet.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' }
  ];
  sheet.addRows(result.rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
  await workbook.xlsx.write(res);
});

module.exports = router;