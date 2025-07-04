/**
 * Configuration constants for the SEO Description Generator
 * Contains brand guidelines, API configurations, and system settings
 */

const BRAND_GUIDELINES = {
  // Business Model Context
  businessModel: {
    type: "Ticket Aggregation Platform",
    description: "We aggregate tickets from multiple sources to provide the best selection and prices",
    emphasis: "We don't sell tickets directly - we help fans find the best available options"
  },

  // Tone and Voice Guidelines
  tone: {
    primary: "Conversational and relatable",
    characteristics: [
      "Write as fellow fans, not corporate marketers",
      "Be passionate and knowledgeable about events",
      "Position as trusted experts who understand fan needs",
      "Use active voice throughout",
      "Maintain enthusiasm without excessive exclamation points"
    ]
  },

  // Content Structure Rules
  structure: {
    length: { min: 350, max: 500 },
    format: {
      firstMention: "Bold the first mention of main keywords",
      headings: "Use sentence case for all headings",
      evergreen: "Avoid dates, prices, or time-sensitive information"
    }
  },

  // Writing Style Guidelines
  style: {
    avoid: [
      "Excessive exclamation points (max 1-2 per description)",
      "Generic marketing speak",
      "Direct selling language",
      "Time-sensitive information",
      "Specific prices or dates"
    ],
    include: [
      "Fan perspective and emotions",
      "Event atmosphere descriptions",
      "Venue information when relevant",
      "Artist/team history and significance",
      "Ticket-buying guidance"
    ]
  }
};

const API_CONFIG = {
  dataForSEO: {
    baseURL: 'https://api.dataforseo.com',
    endpoints: {
      serp: '/v3/serp/google/organic/live/advanced',
      searchVolume: '/v3/keywords_data/google_ads/search_volume/task_post',
      taskResult: '/v3/keywords_data/google_ads/search_volume/task_get'
    },
    defaultLocation: 2840, // United States
    defaultLanguage: 'en'
  },
  openAI: {
    model: 'gpt-4-turbo-preview',
    maxTokens: 800,
    temperature: 0.7
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
  }
};

// Token pricing for cost estimation (as of 2024)
const TOKEN_PRICING = {
  'gpt-4-turbo-preview': {
    input: 0.01 / 1000,  // $0.01 per 1K input tokens
    output: 0.03 / 1000  // $0.03 per 1K output tokens
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