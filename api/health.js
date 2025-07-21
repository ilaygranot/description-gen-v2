/**
 * Health Check Endpoint - Serverless Function for Vercel
 * Checks service availability and configuration status
 */

const DataForSEOService = require('../services/dataForSEO');
const OpenAIService = require('../services/openAI');
const GeminiService = require('../services/gemini');
const { logger } = require('../utils/logger');

// Initialize services (will be cached by Vercel)
let dataForSEO = null;
let openAI = null;
let gemini = null;
let servicesInitialized = false;

function initializeServices() {
  if (servicesInitialized) return;

  try {
    // Check if credentials exist
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      openAI = new OpenAIService(process.env.OPENAI_API_KEY);
      logger.success('OpenAI service initialized');
    }

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      gemini = new GeminiService(process.env.GEMINI_API_KEY);
      logger.success('Gemini service initialized');
    }

    if (process.env.DATAFORSEO_LOGIN && 
        process.env.DATAFORSEO_PASSWORD && 
        process.env.DATAFORSEO_LOGIN !== 'your_dataforseo_login_here') {
      dataForSEO = new DataForSEOService(
        process.env.DATAFORSEO_LOGIN,
        process.env.DATAFORSEO_PASSWORD
      );
      logger.success('DataForSEO service initialized');
    }

    servicesInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize services', error);
  }
}

export default function handler(req, res) {
  // Initialize services on first request
  initializeServices();

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasAIService = !!(openAI || gemini);
  const isFullyFunctional = hasAIService && !!dataForSEO;

  return res.json({
    status: isFullyFunctional ? 'ok' : hasAIService ? 'partial' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      dataForSEO: !!dataForSEO,
      openAI: !!openAI,
      gemini: !!gemini
    },
    message: isFullyFunctional 
      ? 'All services operational' 
      : hasAIService 
        ? 'AI services available, some features may be limited'
        : 'No AI services configured. Please check environment variables.',
    environment: process.env.NODE_ENV || 'development'
  });
}