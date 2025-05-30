const express = require('express');
const database = require('../config/database');
const redis = require('../config/redis');
const elasticsearch = require('../config/elasticsearch');
const logger = require('../utils/logger');

const router = express.Router();

// Update user context
router.post('/update', async (req, res) => {
  try {
    const { userId, contextData } = req.body;
    
    if (!contextData) {
      return res.status(400).json({ error: 'Context data is required' });
    }
    
    // Store in database
    await database.query(
      'INSERT INTO context_activities (user_id, activity_type, activity_data) VALUES ($1, $2, $3)',
      [userId || 1, contextData.type, contextData]
    );
    
    // Cache in Redis for real-time access
    await redis.cacheUserContext(userId || 1, contextData, 300);
    
    // Index in Elasticsearch for searchability
    await elasticsearch.indexDocument('context', `${userId}-${Date.now()}`, {
      user_id: userId || 1,
      activity_type: contextData.type,
      commands: contextData.commands || [],
      files: contextData.file || contextData.files || [],
      processes: contextData.processes || [],
      logs: contextData.entries || [],
      timestamp: new Date()
    });
    
    res.json({ success: true, message: 'Context updated successfully' });
    
  } catch (error) {
    logger.error('Context update error:', error);
    res.status(500).json({ error: 'Failed to update context' });
  }
});

// Get user activity history
router.get('/activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0, type } = req.query;
    
    let query = `
      SELECT * FROM context_activities 
      WHERE user_id = $1
    `;
    const params = [userId];
    
    if (type) {
      query += ' AND activity_type = $2';
      params.push(type);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await database.query(query, params);
    
    res.json({
      activities: result.rows,
      total: result.rowCount
    });
    
  } catch (error) {
    logger.error('Activity history error:', error);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

// Get current user context from cache
router.get('/current/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const currentContext = await redis.getUserContext(userId);
    
    if (currentContext) {
      res.json({
        context: currentContext,
        timestamp: Date.now()
      });
    } else {
      res.status(404).json({ error: 'No current context found' });
    }
    
  } catch (error) {
    logger.error('Current context error:', error);
    res.status(500).json({ error: 'Failed to fetch current context' });
  }
});

// Search context history
router.get('/search', async (req, res) => {
  try {
    const { query, userId, startDate, endDate, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const searchQuery = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['commands', 'files', 'processes', 'logs']
              }
            }
          ],
          filter: []
        }
      },
      sort: [{ timestamp: { order: 'desc' } }],
      size: 50
    };
    
    if (userId) {
      searchQuery.query.bool.filter.push({ term: { user_id: userId } });
    }
    
    if (type) {
      searchQuery.query.bool.filter.push({ term: { activity_type: type } });
    }
    
    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) dateRange.gte = startDate;
      if (endDate) dateRange.lte = endDate;
      searchQuery.query.bool.filter.push({ range: { timestamp: dateRange } });
    }
    
    const results = await elasticsearch.search('context', searchQuery);
    
    res.json({
      results: results.hits.hits.map(hit => hit._source),
      total: results.hits.total.value || results.hits.total
    });
    
  } catch (error) {
    logger.error('Context search error:', error);
    res.status(500).json({ error: 'Failed to search context' });
  }
});

// Get context analytics
router.get('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '7d' } = req.query;
    
    // Convert period to SQL interval
    const intervals = {
      '1d': '1 day',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };
    
    const interval = intervals[period] || '7 days';
    
    const analytics = await database.query(`
      SELECT 
        activity_type,
        COUNT(*) as count,
        DATE_TRUNC('day', timestamp) as date
      FROM context_activities 
      WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${interval}'
      GROUP BY activity_type, DATE_TRUNC('day', timestamp)
      ORDER BY date DESC
    `, [userId]);
    
    const summary = await database.query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT activity_type) as unique_types,
        MIN(timestamp) as first_activity,
        MAX(timestamp) as last_activity
      FROM context_activities 
      WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${interval}'
    `, [userId]);
    
    res.json({
      summary: summary.rows[0],
      timeline: analytics.rows
    });
    
  } catch (error) {
    logger.error('Context analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch context analytics' });
  }
});

module.exports = router;