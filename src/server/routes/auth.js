const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await database.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User with this email or username already exists' 
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await database.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role, created_at',
      [username, email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user,
      token,
      expiresIn: '24h'
    });
    
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    // Get user
    const result = await database.query(
      'SELECT id, username, email, password_hash, role, created_at FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password hash from response
    delete user.password_hash;
    
    res.json({
      user,
      token,
      expiresIn: '24h'
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.userId;
    
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    if (username) {
      updateFields.push(`username = $${paramIndex++}`);
      params.push(username);
    }
    
    if (email) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(userId);
    
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, role, created_at
    `;
    
    const result = await database.query(query, params);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }
    
    // Get current password hash
    const userResult = await database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    
    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await database.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );
    
    res.json({ success: true, message: 'Password updated successfully' });
    
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { userId: req.user.userId, username: req.user.username, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      expiresIn: '24h'
    });
    
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;