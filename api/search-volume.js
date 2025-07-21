/**
 * Search Volume Endpoint - Serverless Function for Vercel
 * DataForSEO integration for keyword volume data
 */

const DataForSEOService = require('../services/dataForSEO');
const { logger } = require('../utils/logger');

// Initialize service (will be cached by Vercel)
let dataForSEO = null;
let serviceInitialized = false;

function initializeService() {
  if (serviceInitialized) return;

  try {
    if (process.env.DATAFORSEO_LOGIN && 
        process.env.DATAFORSEO_PASSWORD && 
        process.env.DATAFORSEO_LOGIN !== 'your_dataforseo_login_here') {
      dataForSEO = new DataForSEOService(
        process.env.DATAFORSEO_LOGIN,
        process.env.DATAFORSEO_PASSWORD
      );
      logger.success('DataForSEO service initialized');
    }

    serviceInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize DataForSEO service', error);
  }
}

export default async function handler(req, res) {
  // Initialize service on first request
  initializeService();

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if DataForSEO is available
    if (!dataForSEO) {
      return res.status(503).json({
        error: 'DataForSEO service not configured',
        message: 'Please add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to the environment variables'
      });
    }

    const { keywords, location, language } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of keywords'
      });
    }

    logger.info('Getting search volume data', { keywordCount: keywords.length });

    const volumeData = await dataForSEO.getSearchVolume(keywords, location, language);

    return res.json({
      success: true,
      data: volumeData
    });

  } catch (error) {
    logger.error('Failed to get search volume', error);
    return res.status(500).json({
      error: 'Failed to retrieve search volume data',
      message: error.message
    });
  }
}