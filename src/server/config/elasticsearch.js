const { Client } = require('elasticsearch');
const logger = require('../utils/logger');

class ElasticsearchClient {
  constructor() {
    this.client = new Client({
      host: `${process.env.ELASTIC_HOST}:${process.env.ELASTIC_PORT}`,
      log: 'error'
    });
  }

  async init() {
    try {
      await this.client.ping();
      await this.createIndices();
      logger.info('Elasticsearch initialized successfully');
    } catch (error) {
      logger.error('Elasticsearch initialization failed:', error);
      throw error;
    }
  }

  async createIndices() {
    const documentationIndex = {
      index: 'documentation',
      body: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'standard' },
            content: { type: 'text', analyzer: 'standard' },
            tags: { type: 'keyword' },
            keywords: { type: 'keyword' },
            category: { type: 'keyword' },
            priority: { type: 'integer' },
            source: { type: 'keyword' },
            created_at: { type: 'date' }
          }
        }
      }
    };

    const contextIndex = {
      index: 'context',
      body: {
        mappings: {
          properties: {
            user_id: { type: 'integer' },
            activity_type: { type: 'keyword' },
            commands: { type: 'text' },
            files: { type: 'keyword' },
            processes: { type: 'keyword' },
            logs: { type: 'text' },
            timestamp: { type: 'date' }
          }
        }
      }
    };

    try {
      const docExists = await this.client.indices.exists({ index: 'documentation' });
      if (!docExists) {
        await this.client.indices.create(documentationIndex);
      }

      const contextExists = await this.client.indices.exists({ index: 'context' });
      if (!contextExists) {
        await this.client.indices.create(contextIndex);
      }
    } catch (error) {
      logger.error('Index creation error:', error);
    }
  }

  async indexDocument(index, id, document) {
    try {
      return await this.client.index({
        index,
        id,
        body: document
      });
    } catch (error) {
      logger.error('Document indexing error:', error);
      throw error;
    }
  }

  async search(index, query) {
    try {
      return await this.client.search({
        index,
        body: query
      });
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  async searchDocumentation(searchTerm, filters = {}) {
    const query = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: searchTerm,
                fields: ['title^2', 'content', 'keywords^3'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }
          ],
          filter: []
        }
      },
      sort: [
        { priority: { order: 'desc' } },
        { _score: { order: 'desc' } }
      ],
      size: 10
    };

    if (filters.category) {
      query.query.bool.filter.push({ term: { category: filters.category } });
    }

    if (filters.tags && filters.tags.length > 0) {
      query.query.bool.filter.push({ terms: { tags: filters.tags } });
    }

    return await this.search('documentation', query);
  }
}

module.exports = new ElasticsearchClient();