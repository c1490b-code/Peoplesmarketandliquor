const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const createUser = db.prepare(`
  INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)
`);

const getUserByEmail = db.prepare(`
  SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = ?
`);

const getUserById = db.prepare(`
  SELECT id, email, name, role, created_at FROM users WHERE id = ?
`);

const getAllUsers = db.prepare(`
  SELECT id, email, name, role, created_at FROM users
`);

if (getAllUsers.all().length === 0) {
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const cashierPassword = bcrypt.hashSync('cashier123', 10);
  createUser.run('admin@market.com', adminPassword, 'Admin User', 'admin');
  createUser.run('cashier@market.com', cashierPassword, 'Cashier User', 'cashier');
}

module.exports = { db, createUser, getUserByEmail, getUserById, getAllUsers };
