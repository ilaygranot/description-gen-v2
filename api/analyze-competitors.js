/**
 * Analyze Competitors Endpoint - Serverless Function for Vercel
 * SERP analysis with AI-powered competitor insights
 */

const DataForSEOService = require('../services/dataForSEO');
const OpenAIService = require('../services/openAI');
const GeminiService = require('../services/gemini');
const { SYSTEM_CONFIG } = require('../config/constants');
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

export default async function handler(req, res) {
  // Initialize services on first request
  initializeServices();

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, location, language, model = 'gpt-4o' } = req.body;

    // Check if requested model service is available
    const isGeminiModel = model && model.startsWith('gemini');
    const aiService = isGeminiModel ? gemini : openAI;
    const serviceName = isGeminiModel ? 'Gemini' : 'OpenAI';
    
    // Check if services are available
    if (!dataForSEO || !aiService) {
      return res.status(503).json({
        error: 'Required services not configured',
        message: `Both DataForSEO and ${serviceName} services are required for competitor analysis. Please configure your environment variables.`
      });
    }

    if (!keyword) {
      return res.status(400).json({
        error: 'Please provide a keyword'
      });
    }

    logger.info('Analyzing competitors', { keyword });

    // Get SERP results
    const serpResults = await dataForSEO.getSERPResults(keyword, location, language);
    
    // Get competitor content
    const topUrls = serpResults.organicResults
      .slice(0, SYSTEM_CONFIG.parallel.competitorAnalysis)
      .map(r => r.url);
    
    const competitorContent = await dataForSEO.getCompetitorContent(topUrls);
    
    // Analyze content with AI
    const insights = await aiService.analyzeCompetitorContent(keyword, competitorContent);

    return res.json({
      success: true,
      data: {
        keyword,
        totalResults: serpResults.totalResults,
        competitorsAnalyzed: competitorContent.length,
        insights
      }
    });

  } catch (error) {
    logger.error('Failed to analyze competitors', error);
    return res.status(500).json({
      error: 'Failed to analyze competitors',
      message: error.message
    });
  }
}