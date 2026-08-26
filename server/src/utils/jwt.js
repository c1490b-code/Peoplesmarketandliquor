const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn('WARNING: JWT_SECRET is not set. Using a randomly generated secret. Set JWT_SECRET in production.');
}

const JWT_EXPIRES = '7d';

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken, JWT_SECRET };
