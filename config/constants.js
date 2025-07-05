/**
 * Configuration constants for the SEO Description Generator
 * Contains brand guidelines, API configurations, and system settings
 */

const BRAND_GUIDELINES = {
  // Word count limits for content validation
  structure: {
    length: { min: 350, max: 500 }
  },

  // Default location and language
  defaultLocation: 2826,
  defaultLanguage: 'en'
};

const API_CONFIG = {
  dataForSEO: {
    baseURL: 'https://api.dataforseo.com',
    endpoints: {
      serp: '/v3/serp/google/organic/live/advanced',
      searchVolumeLive: '/v3/keywords_data/google_ads/search_volume/live'
    },
    defaultLocation: 2826, // United Kingdom (better for Arsenal tickets)
    defaultLanguage: 'en'
  },
  openAI: {
    model: 'gpt-4o',
    maxTokens: 800,
    temperature: 0.7
  },
  gemini: {
    model: 'gemini-2.0-flash',
    maxTokens: 800,
    temperature: 0.7,
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
  }
};

const SYSTEM_CONFIG = {
  rateLimits: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  parallel: {
    maxConcurrent: 3, // Maximum concurrent page processing
    competitorAnalysis: 3 // Top N competitors to analyze
  },
  retries: {
    maxAttempts: 5,
    delayMs: 5000
  },
  // Default location (UK for better Arsenal ticket data)
  defaultLocation: 2826,
  defaultLanguage: 'en'
};

// Token pricing for cost estimation (as of 2024)
const TOKEN_PRICING = {
  'gpt-4o': {
    input: 2.50 / 1000000,  // $2.50 per 1M input tokens
    output: 10.00 / 1000000  // $10.00 per 1M output tokens
  },
  'gemini-2.0-flash': {
    input: 0.30 / 1000000,  // $0.30 per 1M input tokens
    output: 2.50 / 1000000  // $2.50 per 1M output tokens
  },
  // Legacy pricing for reference
  'gpt-4-turbo-preview': {
    input: 0.01 / 1000,
    output: 0.03 / 1000
  },
  'gpt-4': {
    input: 0.03 / 1000,
    output: 0.06 / 1000
  },
  'gpt-3.5-turbo': {
    input: 0.001 / 1000,
    output: 0.002 / 1000
  }
};

module.exports = {
  BRAND_GUIDELINES,
  API_CONFIG,
  SYSTEM_CONFIG,
  TOKEN_PRICING
}; 