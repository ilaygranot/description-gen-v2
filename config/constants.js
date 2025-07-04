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
  },

  // Available locations for search volume and SERP analysis
  locations: [
    {
      name: 'United Kingdom',
      code: 2826,
      countryCode: 'GB',
      language: 'en'
    },
    {
      name: 'United States',
      code: 2840,
      countryCode: 'US',
      language: 'en'
    },
    {
      name: 'Spain',
      code: 2724,
      countryCode: 'ES',
      language: 'es'
    }
  ],

  // Default location (UK for Arsenal tickets)
  defaultLocation: 2826,
  defaultLanguage: 'en',

  // Brand Compass and Writing Guidance (deck-driven)
  compassPillars: [
    { title: 'We get you the tickets you want', blurb: 'We help fans find the best deals and seats for their event—whether they want the cheapest option or the best seat in the house.' },
    { title: 'Fans for Fans', blurb: 'We understand the excitement of live events because we are fans ourselves. We write as fellow enthusiasts, not just as a ticketing service.' },
    { title: 'Relatable', blurb: 'Speak like a knowledgeable friend — no jargon, no fluff.' },
    { title: 'Safety & Security', blurb: 'We only work with vetted providers, ensuring a safe and reliable ticketing experience.' }
  ],

  copyPrinciples: [
    'Share Our Expertise',
    'Put Fans First',
    'Build the Hype'
  ],

  personaTraits: [
    'Passionate',
    'Knowledgeable',
    'Relatable',
    'Transparent',
    'Trustworthy'
  ],

  howWeTalk: [
    'Friendly & Encouraging',
    'Clear & Helpful',
    'Excited (not OTT)',
    'Reassuring & Trustworthy'
  ],

  toneShortHand: 'Relatable • Passionate • Trusted Expert',

  grammarRules: [
    'No Oxford commas unless necessary for clarity',
    'Use single quotation marks for song / tour titles',
    'Italicise album, tour or event titles',
    'Use numerals for times (e.g. 8:30 am)',
    'Periods in body copy; no periods on bullets',
    'Exclamation points: max 1, never in CTAs'
  ],

  generalDos: [
    'Active voice',
    'Sentence case in body copy',
    'Short, actionable CTAs (e.g. “Find tickets”)'
  ],
  generalDonts: [
    'Over-capitalised headlines',
    '“Click here to buy tickets”',
    'Generic marketing clichés'
  ],

  eventWriting: [
    'Emphasise the fan experience, not just logistics',
    'Build anticipation with inclusive, energetic language',
    'Humour is fine if natural, subtle and on-brand',
    'Avoid generic phrases like “Don’t miss out!” — be specific and personal'
  ],

  seoRules: [
    'Write naturally first, then optimise for search',
    'Integrate keywords seamlessly without stuffing'
  ]
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