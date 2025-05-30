const express = require('express');
const suggestionEngine = require('../services/suggestion-engine');
const database = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Generate suggestions based on context
router.post('/generate', async (req, res) => {
  try {
    const { contextData, userId } = req.body;
    
    if (!contextData) {
      return res.status(400).json({ error: 'Context data is required' });
    }
    
    // Check cache first
    const cacheKey = `context:${userId}:${JSON.stringify(contextData).slice(0, 100)}`;
    const cachedSuggestions = await redis.get(cacheKey);
    
    if (cachedSuggestions) {
      logger.info('Returning cached suggestions');
      return res.json({
        suggestions: cachedSuggestions,
        cached: true,
        timestamp: Date.now()
      });
    }
    
    // Generate new suggestions
    const analysis = await suggestionEngine.analyzeContext(contextData);
    
    // Store context activity
    await database.query(
      'INSERT INTO context_activities (user_id, activity_type, activity_data) VALUES ($1, $2, $3)',
      [userId || 1, contextData.type || 'unknown', contextData]
    );
    
    // Store suggestions in database
    const suggestionPromises = analysis.suggestions.map(suggestion => 
      database.query(
        'INSERT INTO suggestions (user_id, documentation_id, context_data, relevance_score) VALUES ($1, $2, $3, $4)',
        [userId || 1, suggestion.id, contextData, suggestion.relevanceScore]
      )
    );
    
    await Promise.all(suggestionPromises);
    
    // Cache results
    await redis.set(cacheKey, analysis.suggestions, 300);
    
    res.json({
      suggestions: analysis.suggestions,
      keywords: analysis.keywords,
      contextVector: analysis.contextVector,
      cached: false,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Suggestion generation error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Get suggestion history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await database.query(`
      SELECT s.*, d.title, d.source, d.category 
      FROM suggestions s
      LEFT JOIN documentation d ON s.documentation_id = d.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    
    res.json({
      suggestions: result.rows,
      total: result.rowCount
    });
    
  } catch (error) {
    logger.error('Suggestion history error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion history' });
  }
});

// Provide feedback on a suggestion
router.post('/:suggestionId/feedback', async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { feedback, userId } = req.body; // 'helpful', 'not_helpful', 'irrelevant'
    
    if (!['helpful', 'not_helpful', 'irrelevant'].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback value' });
    }
    
    await database.query(
      'UPDATE suggestions SET feedback = $1, status = $2 WHERE id = $3',
      [feedback, 'reviewed', suggestionId]
    );
    
    // Store feedback for learning
    const feedbackData = {
      suggestionId,
      feedback,
      userId,
      timestamp: Date.now()
    };
    
    await redis.set(`feedback:${suggestionId}`, feedbackData, 86400); // 24 hours
    
    res.json({ success: true, message: 'Feedback recorded' });
    
  } catch (error) {
    logger.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get suggestion analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await database.query(`
      SELECT 
        COUNT(*) as total_suggestions,
        AVG(relevance_score) as avg_relevance,
        COUNT(CASE WHEN feedback = 'helpful' THEN 1 END) as helpful_count,
        COUNT(CASE WHEN feedback = 'not_helpful' THEN 1 END) as not_helpful_count,
        COUNT(CASE WHEN feedback = 'irrelevant' THEN 1 END) as irrelevant_count
      FROM suggestions
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    const topCategories = await database.query(`
      SELECT d.category, COUNT(*) as suggestion_count
      FROM suggestions s
      JOIN documentation d ON s.documentation_id = d.id
      WHERE s.created_at > NOW() - INTERVAL '7 days'
      GROUP BY d.category
      ORDER BY suggestion_count DESC
      LIMIT 10
    `);
    
    res.json({
      overview: analytics.rows[0],
      topCategories: topCategories.rows
    });
    
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Real-time suggestions endpoint (for WebSocket alternative)
router.get('/realtime/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get recent context
    const recentContext = await redis.getUserContext(userId);
    
    if (recentContext) {
      const analysis = await suggestionEngine.analyzeContext(recentContext);
      res.json({
        suggestions: analysis.suggestions,
        context: recentContext,
        timestamp: Date.now()
      });
    } else {
      res.json({ suggestions: [], message: 'No recent context available' });
    }
    
  } catch (error) {
    logger.error('Real-time suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time suggestions' });
  }
});

module.exports = router;