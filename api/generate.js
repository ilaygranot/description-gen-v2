/**
 * Generate SEO Descriptions - Serverless Function for Vercel
 * Main generation endpoint with parallel processing and AI services
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

/**
 * Process multiple pages concurrently with rate limiting
 */
async function processPagesConcurrently(pages, location, language, includeCompetitorAnalysis, includeSearchVolume, aiService) {
  const results = [];
  const batchSize = SYSTEM_CONFIG.parallel.maxConcurrent;

  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    logger.process(`Processing batch ${Math.floor(i / batchSize) + 1}`, { pages: batch });

    const batchPromises = batch.map(async (pageName) => {
      try {
        const result = await processSinglePage(
          pageName,
          location,
          language,
          includeCompetitorAnalysis,
          includeSearchVolume,
          aiService
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
async function processSinglePage(pageName, location, language, includeCompetitorAnalysis, includeSearchVolume, aiService) {
  const pageLogger = logger.child(`[${pageName}]`);
  pageLogger.process('Starting page processing');

  let searchVolume = null;
  let competitorInsights = null;
  let competitorDomains = [];

  // Parallel data gathering
  const dataPromises = [];

  // Get search volume if requested
  if (includeSearchVolume && dataForSEO) {
    pageLogger.info('Starting search volume request', { pageName, location, language });
    dataPromises.push(
      dataForSEO.getSearchVolume([pageName], location, language)
        .then(data => {
          pageLogger.info('Raw search volume response', { data, length: data?.length });
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
  if (includeCompetitorAnalysis && dataForSEO && aiService) {
    dataPromises.push(
      (async () => {
        try {
          pageLogger.process('Starting competitor analysis');
          const serpResults = await dataForSEO.getSERPResults(pageName, location, language);
          const topUrls = serpResults.organicResults
            .slice(0, SYSTEM_CONFIG.parallel.competitorAnalysis)
            .map(r => r.url);

          competitorDomains = topUrls.map(url => {
            try {
              return new URL(url).hostname.replace('www.', '');
            } catch (_) {
              return null;
            }
          }).filter(Boolean);
          
          if (topUrls.length > 0) {
            const competitorContent = await dataForSEO.getCompetitorContent(topUrls);
            competitorInsights = await aiService.analyzeCompetitorContent(pageName, competitorContent);
            pageLogger.success('Competitor analysis completed', {
              competitorsAnalyzed: competitorContent.length
            });
          } else {
            pageLogger.warn('No competitor URLs found for analysis');
          }
        } catch (error) {
          pageLogger.warn('Failed to analyze competitors', error.message);
        }
      })()
    );
  } else if (includeCompetitorAnalysis && (!dataForSEO || !aiService)) {
    pageLogger.warn('Competitor analysis requested but required services not configured');
  }

  // Wait for all data gathering to complete
  await Promise.all(dataPromises);

  // Check if SeatPick already ranks in top 3 SERP results
  const seatpickTop3 = competitorDomains.some(domain => domain && domain.toLowerCase().includes('seatpick.com'));

  // Generate description with retry logic
  const descriptionResult = await aiService.generateWithRetry(
    pageName,
    language,
    competitorInsights,
    searchVolume
  );

  return {
    pageName,
    description: descriptionResult.description,
    wordCount: descriptionResult.wordCount,
    isValidLength: descriptionResult.isValidLength,
    searchVolume: searchVolume?.searchVolume || null,
    usage: descriptionResult.usage,
    hasCompetitorInsights: !!competitorInsights,
    competitorDomains,
    seatpickTop3
  };
}

export default async function handler(req, res) {
  // Initialize services on first request
  initializeServices();

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      pages,
      location = SYSTEM_CONFIG.defaultLocation,
      language = 'English',
      includeCompetitorAnalysis = false,
      includeSearchVolume = true,
      model = 'gpt-4o' 
    } = req.body;

    // Check if requested model service is available
    const isGeminiModel = model && model.startsWith('gemini');
    const aiService = isGeminiModel ? gemini : openAI;
    const serviceName = isGeminiModel ? 'Gemini' : 'OpenAI';
    
    if (!aiService) {
      return res.status(503).json({
        error: `${serviceName} service not configured`,
        message: `Please add your ${serviceName === 'Gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} to the environment variables`
      });
    }

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
      includeSearchVolume,
      model,
      service: serviceName
    });

    // Reset token tracking for this batch
    aiService.resetUsageTracking();

    // Process pages in parallel (with concurrency limit)
    const results = await processPagesConcurrently(
      pages,
      location,
      language,
      includeCompetitorAnalysis,
      includeSearchVolume,
      aiService
    );

    // Get final usage summary
    const usageSummary = aiService.getUsageSummary();

    logger.success('Generation completed', {
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalCost: usageSummary.totalCost
    });

    return res.json({
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
    return res.status(500).json({
      error: 'Failed to generate descriptions',
      message: error.message
    });
  }
}