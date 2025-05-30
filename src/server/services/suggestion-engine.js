const natural = require('natural');
const elasticsearch = require('../config/elasticsearch');
const redis = require('../config/redis');
const database = require('../config/database');
const logger = require('../utils/logger');

class SuggestionEngine {
  constructor() {
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.suggestionThreshold = parseFloat(process.env.SUGGESTION_THRESHOLD) || 0.7;
  }

  async analyzeContext(contextData) {
    try {
      const extractedKeywords = this.extractKeywords(contextData);
      const contextVector = this.buildContextVector(extractedKeywords);
      const suggestions = await this.findRelevantDocumentation(contextVector, contextData);
      
      return {
        keywords: extractedKeywords,
        contextVector,
        suggestions: suggestions.filter(s => s.relevanceScore >= this.suggestionThreshold)
      };
    } catch (error) {
      logger.error('Context analysis error:', error);
      throw error;
    }
  }

  extractKeywords(contextData) {
    const keywords = new Set();
    
    // Extract from commands
    if (contextData.commands) {
      contextData.commands.forEach(command => {
        const tokens = this.tokenizer.tokenize(command.toLowerCase());
        tokens.forEach(token => {
          if (token.length > 2 && !this.isStopWord(token)) {
            keywords.add(this.stemmer.stem(token));
          }
        });
        
        // Extract specific DevOps tools and commands
        const devopsPatterns = [
          /kubectl/g, /docker/g, /terraform/g, /ansible/g, /jenkins/g,
          /nginx/g, /apache/g, /mysql/g, /postgres/g, /redis/g,
          /kubernetes/g, /k8s/g, /aws/g, /azure/g, /gcp/g,
          /git/g, /ssh/g, /systemctl/g, /service/g, /cron/g
        ];
        
        devopsPatterns.forEach(pattern => {
          const matches = command.match(pattern);
          if (matches) {
            matches.forEach(match => keywords.add(match.toLowerCase()));
          }
        });
      });
    }
    
    // Extract from file paths
    if (contextData.file || contextData.files) {
      const files = Array.isArray(contextData.files) ? contextData.files : [contextData.file];
      files.forEach(file => {
        if (file) {
          const pathTokens = file.split('/').filter(token => token.length > 0);
          pathTokens.forEach(token => {
            if (token.includes('.')) {
              const extension = token.split('.').pop();
              keywords.add(extension);
            }
            keywords.add(token.toLowerCase());
          });
        }
      });
    }
    
    // Extract from processes
    if (contextData.processes) {
      contextData.processes.forEach(process => {
        if (process.command) {
          const processName = process.command.split(' ')[0];
          keywords.add(processName.toLowerCase());
        }
      });
    }
    
    // Extract from log entries
    if (contextData.entries) {
      contextData.entries.forEach(entry => {
        if (entry.message) {
          const errorPatterns = [
            /error/gi, /failed/gi, /exception/gi, /timeout/gi,
            /connection refused/gi, /permission denied/gi,
            /not found/gi, /cannot/gi, /unable/gi
          ];
          
          errorPatterns.forEach(pattern => {
            const matches = entry.message.match(pattern);
            if (matches) {
              keywords.add('troubleshooting');
              keywords.add('error');
            }
          });
        }
      });
    }
    
    return Array.from(keywords);
  }

  buildContextVector(keywords) {
    const vector = {};
    
    // Weight keywords based on DevOps relevance
    const weights = {
      // Infrastructure tools
      'kubernetes': 3, 'k8s': 3, 'kubectl': 3, 'docker': 3,
      'terraform': 3, 'ansible': 3, 'helm': 3,
      
      // Cloud providers
      'aws': 2, 'azure': 2, 'gcp': 2, 'ec2': 2, 's3': 2,
      
      // Databases
      'mysql': 2, 'postgres': 2, 'redis': 2, 'mongodb': 2,
      
      // Web servers
      'nginx': 2, 'apache': 2, 'haproxy': 2,
      
      // CI/CD
      'jenkins': 2, 'gitlab': 2, 'github': 2, 'actions': 2,
      
      // Monitoring
      'prometheus': 2, 'grafana': 2, 'elk': 2, 'splunk': 2,
      
      // System administration
      'systemctl': 2, 'service': 2, 'cron': 2, 'ssh': 2,
      
      // Error-related
      'troubleshooting': 3, 'error': 2, 'debug': 2, 'fix': 2
    };
    
    keywords.forEach(keyword => {
      const weight = weights[keyword] || 1;
      vector[keyword] = weight;
    });
    
    return vector;
  }

  async findRelevantDocumentation(contextVector, contextData) {
    const suggestions = [];
    
    try {
      // Search in Elasticsearch
      const searchTerms = Object.keys(contextVector).join(' ');
      const elasticResults = await elasticsearch.searchDocumentation(searchTerms);
      
      if (elasticResults && elasticResults.hits && elasticResults.hits.hits) {
        elasticResults.hits.hits.forEach(hit => {
          const relevanceScore = this.calculateRelevanceScore(
            contextVector, 
            hit._source, 
            hit._score
          );
          
          suggestions.push({
            id: hit._id,
            title: hit._source.title,
            content: hit._source.content.substring(0, 300) + '...',
            source: hit._source.source,
            category: hit._source.category,
            tags: hit._source.tags,
            relevanceScore: relevanceScore,
            elasticScore: hit._score,
            matchedKeywords: this.findMatchedKeywords(contextVector, hit._source)
          });
        });
      }
      
      // Add rule-based suggestions
      const ruleBasedSuggestions = await this.getRuleBasedSuggestions(contextData);
      suggestions.push(...ruleBasedSuggestions);
      
      // Sort by relevance score
      suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      return suggestions.slice(0, 10); // Top 10 suggestions
    } catch (error) {
      logger.error('Error finding relevant documentation:', error);
      return [];
    }
  }

  calculateRelevanceScore(contextVector, document, elasticScore) {
    let score = 0;
    let matches = 0;
    
    // Check keyword matches
    Object.keys(contextVector).forEach(keyword => {
      const weight = contextVector[keyword];
      
      if (document.keywords && document.keywords.includes(keyword)) {
        score += weight * 0.4;
        matches++;
      }
      
      if (document.tags && document.tags.includes(keyword)) {
        score += weight * 0.3;
        matches++;
      }
      
      if (document.title && document.title.toLowerCase().includes(keyword)) {
        score += weight * 0.2;
        matches++;
      }
      
      if (document.content && document.content.toLowerCase().includes(keyword)) {
        score += weight * 0.1;
        matches++;
      }
    });
    
    // Normalize by elastic score and number of matches
    const normalizedScore = (score * matches * elasticScore) / 100;
    
    // Ensure score is between 0 and 1
    return Math.min(normalizedScore / Object.keys(contextVector).length, 1);
  }

  findMatchedKeywords(contextVector, document) {
    const matched = [];
    
    Object.keys(contextVector).forEach(keyword => {
      if (
        (document.keywords && document.keywords.includes(keyword)) ||
        (document.tags && document.tags.includes(keyword)) ||
        (document.title && document.title.toLowerCase().includes(keyword)) ||
        (document.content && document.content.toLowerCase().includes(keyword))
      ) {
        matched.push(keyword);
      }
    });
    
    return matched;
  }

  async getRuleBasedSuggestions(contextData) {
    const suggestions = [];
    
    // Rule 1: Kubernetes troubleshooting
    if (this.containsKeywords(contextData, ['kubectl', 'kubernetes', 'k8s'])) {
      suggestions.push({
        id: 'rule-k8s-troubleshooting',
        title: 'Kubernetes Troubleshooting Guide',
        content: 'Common Kubernetes debugging commands and troubleshooting steps...',
        source: 'built-in',
        category: 'troubleshooting',
        tags: ['kubernetes', 'kubectl', 'debugging'],
        relevanceScore: 0.9,
        matchedKeywords: ['kubernetes', 'kubectl'],
        type: 'rule-based'
      });
    }
    
    // Rule 2: Docker issues
    if (this.containsKeywords(contextData, ['docker']) && 
        this.containsKeywords(contextData, ['error', 'failed'])) {
      suggestions.push({
        id: 'rule-docker-errors',
        title: 'Docker Common Errors and Solutions',
        content: 'Solutions for common Docker build and runtime errors...',
        source: 'built-in',
        category: 'troubleshooting',
        tags: ['docker', 'errors', 'troubleshooting'],
        relevanceScore: 0.85,
        matchedKeywords: ['docker', 'error'],
        type: 'rule-based'
      });
    }
    
    // Rule 3: SSH connection issues
    if (this.containsKeywords(contextData, ['ssh']) && 
        this.containsKeywords(contextData, ['connection', 'refused', 'timeout'])) {
      suggestions.push({
        id: 'rule-ssh-connection',
        title: 'SSH Connection Troubleshooting',
        content: 'Steps to diagnose and fix SSH connection problems...',
        source: 'built-in',
        category: 'networking',
        tags: ['ssh', 'connection', 'networking'],
        relevanceScore: 0.8,
        matchedKeywords: ['ssh', 'connection'],
        type: 'rule-based'
      });
    }
    
    return suggestions;
  }

  containsKeywords(contextData, keywords) {
    const contextString = JSON.stringify(contextData).toLowerCase();
    return keywords.some(keyword => contextString.includes(keyword.toLowerCase()));
  }

  isStopWord(word) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  async cacheSuggestions(userId, suggestions) {
    const cacheKey = `suggestions:${userId}:${Date.now()}`;
    await redis.set(cacheKey, suggestions, 300); // Cache for 5 minutes
    return cacheKey;
  }

  async getCachedSuggestions(cacheKey) {
    return await redis.get(cacheKey);
  }
}

module.exports = new SuggestionEngine();