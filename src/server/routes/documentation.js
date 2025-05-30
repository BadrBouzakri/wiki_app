const express = require('express');
const database = require('../config/database');
const elasticsearch = require('../config/elasticsearch');
const logger = require('../utils/logger');

const router = express.Router();

// Get all documentation
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, source, search } = req.query;
    
    let query = 'SELECT * FROM documentation WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (source) {
      query += ` AND source = $${paramIndex++}`;
      params.push(source);
    }
    
    if (search) {
      query += ` AND (title ILIKE $${paramIndex++} OR content ILIKE $${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY priority DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await database.query(query, params);
    
    res.json({
      documentation: result.rows,
      total: result.rowCount
    });
    
  } catch (error) {
    logger.error('Documentation fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch documentation' });
  }
});

// Get single documentation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.query(
      'SELECT * FROM documentation WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documentation not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    logger.error('Documentation get error:', error);
    res.status(500).json({ error: 'Failed to fetch documentation' });
  }
});

// Create new documentation
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      tags = [],
      source,
      source_url,
      keywords = [],
      category,
      priority = 5
    } = req.body;
    
    if (!title || !content || !source) {
      return res.status(400).json({ 
        error: 'Title, content, and source are required' 
      });
    }
    
    const result = await database.query(`
      INSERT INTO documentation (title, content, tags, source, source_url, keywords, category, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, content, tags, source, source_url, keywords, category, priority]);
    
    const doc = result.rows[0];
    
    // Index in Elasticsearch
    await elasticsearch.indexDocument('documentation', doc.id, {
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      keywords: doc.keywords,
      category: doc.category,
      priority: doc.priority,
      source: doc.source,
      created_at: doc.created_at
    });
    
    res.status(201).json(doc);
    
  } catch (error) {
    logger.error('Documentation creation error:', error);
    res.status(500).json({ error: 'Failed to create documentation' });
  }
});

// Update documentation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      tags,
      source_url,
      keywords,
      category,
      priority
    } = req.body;
    
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      params.push(tags);
    }
    if (source_url !== undefined) {
      updateFields.push(`source_url = $${paramIndex++}`);
      params.push(source_url);
    }
    if (keywords !== undefined) {
      updateFields.push(`keywords = $${paramIndex++}`);
      params.push(keywords);
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const query = `
      UPDATE documentation 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await database.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documentation not found' });
    }
    
    const doc = result.rows[0];
    
    // Re-index in Elasticsearch
    await elasticsearch.indexDocument('documentation', doc.id, {
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      keywords: doc.keywords,
      category: doc.category,
      priority: doc.priority,
      source: doc.source,
      created_at: doc.created_at
    });
    
    res.json(doc);
    
  } catch (error) {
    logger.error('Documentation update error:', error);
    res.status(500).json({ error: 'Failed to update documentation' });
  }
});

// Delete documentation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.query(
      'DELETE FROM documentation WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documentation not found' });
    }
    
    // Remove from Elasticsearch
    try {
      await elasticsearch.client.delete({
        index: 'documentation',
        id: id
      });
    } catch (esError) {
      logger.warn('Failed to delete from Elasticsearch:', esError);
    }
    
    res.json({ success: true, message: 'Documentation deleted' });
    
  } catch (error) {
    logger.error('Documentation deletion error:', error);
    res.status(500).json({ error: 'Failed to delete documentation' });
  }
});

// Search documentation
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { category, tags, limit = 20 } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (tags) filters.tags = tags.split(',');
    
    const results = await elasticsearch.searchDocumentation(query, filters);
    
    res.json({
      results: results.hits.hits.map(hit => ({
        ...hit._source,
        id: hit._id,
        score: hit._score
      })),
      total: results.hits.total.value || results.hits.total
    });
    
  } catch (error) {
    logger.error('Documentation search error:', error);
    res.status(500).json({ error: 'Failed to search documentation' });
  }
});

// Get documentation categories
router.get('/meta/categories', async (req, res) => {
  try {
    const result = await database.query(`
      SELECT category, COUNT(*) as count
      FROM documentation
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    
    res.json(result.rows);
    
  } catch (error) {
    logger.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get documentation sources
router.get('/meta/sources', async (req, res) => {
  try {
    const result = await database.query(`
      SELECT source, COUNT(*) as count
      FROM documentation
      GROUP BY source
      ORDER BY count DESC
    `);
    
    res.json(result.rows);
    
  } catch (error) {
    logger.error('Sources fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

module.exports = router;