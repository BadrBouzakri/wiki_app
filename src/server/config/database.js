const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async init() {
    try {
      await this.createTables();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const queries = [
      `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS documentation (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        tags TEXT[],
        source VARCHAR(100) NOT NULL,
        source_url VARCHAR(1000),
        keywords TEXT[],
        category VARCHAR(100),
        priority INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS context_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        activity_type VARCHAR(100) NOT NULL,
        activity_data JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        documentation_id INTEGER REFERENCES documentation(id),
        context_data JSONB NOT NULL,
        relevance_score DECIMAL(3,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        feedback VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_documentation_keywords ON documentation USING GIN(keywords);
      CREATE INDEX IF NOT EXISTS idx_documentation_tags ON documentation USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_context_activities_timestamp ON context_activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_suggestions_relevance ON suggestions(relevance_score DESC);
      `
    ];

    for (const query of queries) {
      await this.pool.query(query);
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query error', { text, error: error.message });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();