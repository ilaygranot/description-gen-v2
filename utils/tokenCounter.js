/**
 * Token counting utility for OpenAI API cost estimation
 * Uses tiktoken for accurate token counting
 */

const { encoding_for_model } = require('tiktoken');
const { TOKEN_PRICING } = require('../config/constants');
const { logger } = require('./logger');

class TokenCounter {
  constructor(model = 'gpt-4-turbo-preview') {
    this.model = model;
    try {
      // Get the appropriate encoding for the model
      this.encoding = encoding_for_model(model);
    } catch (error) {
      logger.warn(`Could not load encoding for model ${model}, using default cl100k_base`, error);
      // Fallback to cl100k_base encoding
      const { get_encoding } = require('tiktoken');
      this.encoding = get_encoding('cl100k_base');
    }
  }

  /**
   * Count tokens in a text string
   */
  countTokens(text) {
    try {
      const tokens = this.encoding.encode(text);
      return tokens.length;
    } catch (error) {
      logger.error('Error counting tokens:', error);
      // Rough estimation fallback: ~4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Count tokens in chat messages format
   */
  countChatTokens(messages) {
    let totalTokens = 0;
    
    for (const message of messages) {
      // Each message has overhead tokens
      totalTokens += 4; // <im_start>{role/name}\n{content}<im_end>\n
      
      if (message.role) {
        totalTokens += this.countTokens(message.role);
      }
      
      if (message.content) {
        totalTokens += this.countTokens(message.content);
      }
      
      if (message.name) {
        totalTokens += this.countTokens(message.name);
        totalTokens -= 1; // Role is omitted when name is present
      }
    }
    
    totalTokens += 2; // Every reply is primed with <im_start>assistant
    
    return totalTokens;
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(inputTokens, outputTokens) {
    const pricing = TOKEN_PRICING[this.model];
    if (!pricing) {
      logger.warn(`No pricing data for model ${this.model}`);
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6))
    };
  }

  /**
   * Estimate tokens for a completion request
   */
  estimateRequestTokens(prompt, maxCompletionTokens = 800) {
    const promptTokens = typeof prompt === 'string' 
      ? this.countTokens(prompt)
      : this.countChatTokens(prompt);

    const estimatedOutputTokens = Math.min(maxCompletionTokens, Math.floor(promptTokens * 0.8));
    
    return {
      promptTokens,
      estimatedOutputTokens,
      totalEstimatedTokens: promptTokens + estimatedOutputTokens,
      estimatedCost: this.calculateCost(promptTokens, estimatedOutputTokens)
    };
  }

  /**
   * Clean up encoding resources
   */
  dispose() {
    if (this.encoding && this.encoding.free) {
      this.encoding.free();
    }
  }
}

/**
 * Token usage tracker for aggregating costs across multiple requests
 */
class TokenUsageTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCost = 0;
    this.requests = [];
  }

  /**
   * Add a request to the tracker
   */
  addRequest(inputTokens, outputTokens, cost, metadata = {}) {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.totalCost += cost.totalCost;
    
    this.requests.push({
      timestamp: new Date().toISOString(),
      inputTokens,
      outputTokens,
      cost,
      metadata
    });

    logger.process('Token usage updated', {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalCost: this.totalCost.toFixed(4),
      requestCount: this.requests.length
    });
  }

  /**
   * Get summary of token usage
   */
  getSummary() {
    return {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalTokens: this.totalInputTokens + this.totalOutputTokens,
      totalCost: Number(this.totalCost.toFixed(4)),
      requestCount: this.requests.length,
      averageTokensPerRequest: this.requests.length > 0 
        ? Math.round((this.totalInputTokens + this.totalOutputTokens) / this.requests.length)
        : 0
    };
  }
}

module.exports = {
  TokenCounter,
  TokenUsageTracker
}; 