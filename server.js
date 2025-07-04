/**
 * SEO Description Generator v2 - Main Server
 * Professional API for generating SEO-optimized descriptions with AI
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import services and utilities
const DataForSEOService = require('./services/dataForSEO');
const OpenAIService = require('./services/openAI');
const { SYSTEM_CONFIG } = require('./config/constants');
const { logger } = require('./utils/logger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services with error handling
let dataForSEO = null;
let openAI = null;
let servicesInitialized = false;

try {
  // Check if credentials exist
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    logger.warn('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file');
  } else {
    openAI = new OpenAIService(process.env.OPENAI_API_KEY);
    logger.success('OpenAI service initialized');
  }

  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD || 
      process.env.DATAFORSEO_LOGIN === 'your_dataforseo_login_here') {
    logger.warn('DataForSEO credentials not configured. Please add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to your .env file');
  } else {
    dataForSEO = new DataForSEOService(
      process.env.DATAFORSEO_LOGIN,
      process.env.DATAFORSEO_PASSWORD
    );
    logger.success('DataForSEO service initialized');
  }

  servicesInitialized = !!(openAI && dataForSEO);
} catch (error) {
  logger.error('Failed to initialize services', error);
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: SYSTEM_CONFIG.rateLimits.windowMs,
  max: SYSTEM_CONFIG.rateLimits.max,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.api(req.method, req.path, req.method === 'POST' ? req.body : null);
  next();
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: servicesInitialized ? 'ok' : 'partial',
    timestamp: new Date().toISOString(),
    services: {
      dataForSEO: !!dataForSEO,
      openAI: !!openAI
    },
    message: servicesInitialized ? 'All services operational' : 'Some services not configured. Check server logs.'
  });
});

/**
 * Generate SEO descriptions for multiple pages
 * Supports parallel processing and optional competitor analysis
 */
app.post('/api/generate', async (req, res) => {
  try {
    // Check if services are available
    if (!openAI) {
      return res.status(503).json({
        error: 'OpenAI service not configured',
        message: 'Please add your OPENAI_API_KEY to the .env file and restart the server'
      });
    }

    const { 
      pages, 
      language = 'English', 
      includeCompetitorAnalysis = false,
      includeSearchVolume = true 
    } = req.body;

    // Validation
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of page names'
      });
    }

    if (pages.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 pages per request'
      });
    }

    logger.header('Processing SEO Description Generation');
    logger.info('Request details', {
      pageCount: pages.length,
      language,
      includeCompetitorAnalysis,
      includeSearchVolume
    });

    // Reset token tracking for this batch
    openAI.resetUsageTracking();

    // Process pages in parallel (with concurrency limit)
    const results = await processPagesConcurrently(
      pages,
      language,
      includeCompetitorAnalysis,
      includeSearchVolume
    );

    // Get final usage summary
    const usageSummary = openAI.getUsageSummary();

    logger.success('Generation completed', {
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalCost: usageSummary.totalCost
    });

    res.json({
      success: true,
      results,
      summary: {
        totalPages: pages.length,
        successfulGenerations: results.filter(r => r.success).length,
        usage: usageSummary
      }
    });

  } catch (error) {
    logger.error('Generation failed', error);
    res.status(500).json({
      error: 'Failed to generate descriptions',
      message: error.message
    });
  }
});

/**
 * Get search volume data for keywords
 */
app.post('/api/search-volume', async (req, res) => {
  try {
    // Check if DataForSEO is available
    if (!dataForSEO) {
      return res.status(503).json({
        error: 'DataForSEO service not configured',
        message: 'Please add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to the .env file and restart the server'
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

    res.json({
      success: true,
      data: volumeData
    });

  } catch (error) {
    logger.error('Failed to get search volume', error);
    res.status(500).json({
      error: 'Failed to retrieve search volume data',
      message: error.message
    });
  }
});

/**
 * Analyze competitors for a keyword
 */
app.post('/api/analyze-competitors', async (req, res) => {
  try {
    // Check if services are available
    if (!dataForSEO || !openAI) {
      return res.status(503).json({
        error: 'Required services not configured',
        message: 'Both DataForSEO and OpenAI services are required for competitor analysis. Please configure your .env file.'
      });
    }

    const { keyword, location, language } = req.body;

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
    const insights = await openAI.analyzeCompetitorContent(keyword, competitorContent);

    res.json({
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
    res.status(500).json({
      error: 'Failed to analyze competitors',
      message: error.message
    });
  }
});

/**
 * Process multiple pages concurrently with rate limiting
 */
async function processPagesConcurrently(pages, language, includeCompetitorAnalysis, includeSearchVolume) {
  const results = [];
  const batchSize = SYSTEM_CONFIG.parallel.maxConcurrent;

  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    logger.process(`Processing batch ${Math.floor(i / batchSize) + 1}`, { pages: batch });

    const batchPromises = batch.map(async (pageName) => {
      try {
        const result = await processSinglePage(
          pageName,
          language,
          includeCompetitorAnalysis,
          includeSearchVolume
        );
        return { ...result, success: true };
      } catch (error) {
        logger.error(`Failed to process ${pageName}`, error);
        return {
          pageName,
          success: false,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Process a single page with all features
 */
async function processSinglePage(pageName, language, includeCompetitorAnalysis, includeSearchVolume) {
  const pageLogger = logger.child(`[${pageName}]`);
  pageLogger.process('Starting page processing');

  let searchVolume = null;
  let competitorInsights = null;

  // Parallel data gathering
  const dataPromises = [];

  // Get search volume if requested
  if (includeSearchVolume && dataForSEO) {
    dataPromises.push(
      dataForSEO.getSearchVolume([pageName])
        .then(data => {
          searchVolume = data[0];
          pageLogger.success('Search volume retrieved', searchVolume);
        })
        .catch(error => {
          pageLogger.warn('Failed to get search volume', error.message);
        })
    );
  } else if (includeSearchVolume && !dataForSEO) {
    pageLogger.warn('Search volume requested but DataForSEO not configured');
  }

  // Get competitor analysis if requested
  if (includeCompetitorAnalysis && process.env.ENABLE_COMPETITOR_ANALYSIS === 'true' && dataForSEO && openAI) {
    dataPromises.push(
      (async () => {
        try {
          const serpResults = await dataForSEO.getSERPResults(pageName);
          const topUrls = serpResults.organicResults
            .slice(0, SYSTEM_CONFIG.parallel.competitorAnalysis)
            .map(r => r.url);
          
          if (topUrls.length > 0) {
            const competitorContent = await dataForSEO.getCompetitorContent(topUrls);
            competitorInsights = await openAI.analyzeCompetitorContent(pageName, competitorContent);
            pageLogger.success('Competitor analysis completed');
          }
        } catch (error) {
          pageLogger.warn('Failed to analyze competitors', error.message);
        }
      })()
    );
  } else if (includeCompetitorAnalysis && (!dataForSEO || !openAI)) {
    pageLogger.warn('Competitor analysis requested but required services not configured');
  }

  // Wait for all data gathering to complete
  await Promise.all(dataPromises);

  // Generate description with retry logic
  const descriptionResult = await openAI.generateWithRetry(
    pageName,
    language,
    competitorInsights
  );

  return {
    pageName,
    description: descriptionResult.description,
    wordCount: descriptionResult.wordCount,
    isValidLength: descriptionResult.isValidLength,
    searchVolume: searchVolume?.searchVolume || null,
    usage: descriptionResult.usage,
    hasCompetitorInsights: !!competitorInsights
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  logger.header('SEO Description Generator v2 Started');
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info('Environment', {
    nodeEnv: process.env.NODE_ENV || 'development',
    competitorAnalysis: process.env.ENABLE_COMPETITOR_ANALYSIS === 'true' ? 'Enabled' : 'Disabled'
  });
  
  if (!servicesInitialized) {
    logger.separator();
    logger.warn('⚠️  IMPORTANT: Not all services are configured!');
    logger.info('To use all features, please:');
    logger.info('1. Create a .env file in the root directory');
    logger.info('2. Add your API credentials:');
    logger.info('   OPENAI_API_KEY=your_actual_api_key');
    logger.info('   DATAFORSEO_LOGIN=your_actual_login');
    logger.info('   DATAFORSEO_PASSWORD=your_actual_password');
    logger.info('3. Restart the server');
    logger.separator();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (openAI) {
    openAI.dispose();
  }
  process.exit(0);
}); 