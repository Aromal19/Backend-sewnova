const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken');

const ACCESS_TOKEN_EXPIRES_IN = '10m'; // 10 minutes
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expires = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);
  const refreshToken = new RefreshToken({ user: userId, token, expires });
  return refreshToken.save();
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};