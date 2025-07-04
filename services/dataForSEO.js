/**
 * DataForSEO Service
 * Handles search volume data and SERP competitor analysis
 */

const axios = require('axios');
const { API_CONFIG, SYSTEM_CONFIG } = require('../config/constants');
const { logger } = require('../utils/logger');

class DataForSEOService {
  constructor(login, password) {
    this.auth = {
      username: login,
      password: password
    };
    this.baseURL = API_CONFIG.dataForSEO.baseURL;
    this.logger = logger.child('DataForSEO');
    
    // Language name to code mapping for DataForSEO API
    this.languageMap = {
      'English': 'en',
      'Spanish': 'es', 
      'French': 'fr',
      'German': 'de',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Dutch': 'nl',
      'Russian': 'ru',
      'Japanese': 'ja',
      'Chinese': 'zh'
    };
  }
  
  /**
   * Convert language name to DataForSEO language code
   */
  getLanguageCode(language) {
    return this.languageMap[language] || language.toLowerCase();
  }

  /**
   * Make authenticated request to DataForSEO API
   */
  async makeRequest(endpoint, method = 'POST', data = null) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      this.logger.api(method, endpoint, data);
      
      const config = {
        method,
        url,
        auth: this.auth,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      this.logger.success(`API request successful: ${endpoint}`, {
        status: response.data.status_message,
        tasks_count: response.data.tasks_count
      });

      return response.data;
    } catch (error) {
      this.logger.error(`API request failed: ${endpoint}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Format API errors for better handling
   */
  formatError(error) {
    if (error.response) {
      return new Error(`DataForSEO API Error: ${error.response.status} - ${error.response.data?.status_message || error.response.statusText}`);
    } else if (error.request) {
      return new Error('DataForSEO API: No response received');
    } else {
      return error;
    }
  }

  /**
   * Get search volume for multiple keywords using live endpoint
   */
  async getSearchVolume(keywords, location = API_CONFIG.dataForSEO.defaultLocation, language = API_CONFIG.dataForSEO.defaultLanguage) {
    try {
      // Convert language name to language code
      const languageCode = this.getLanguageCode(language);
      
      this.logger.process('Getting search volume (live)', { keywords, location, language: languageCode });

      // Normalize keywords to lowercase for better results
      const normalizedKeywords = keywords.map(k => k.toLowerCase().trim());
      
      const requestData = [{
        location_code: location,
        keywords: normalizedKeywords,
        date_from: this.getDateMonthsAgo(6),
        search_partners: true
      }];

      // Log the request for debugging
      this.logger.info('Search Volume Request', {
        endpoint: '/v3/keywords_data/google_ads/search_volume/live',
        requestData: requestData
      });

      // Use live endpoint for immediate results
      const response = await this.makeRequest(
        '/v3/keywords_data/google_ads/search_volume/live',
        'POST',
        requestData
      );

      // Log the response structure for debugging
      this.logger.info('Search Volume Response Structure', {
        hasTasks: !!response.tasks,
        tasksCount: response.tasks?.length || 0,
        firstTaskHasResult: !!response.tasks?.[0]?.result,
        firstTaskResultLength: response.tasks?.[0]?.result?.length || 0,
        statusCode: response.status_code,
        statusMessage: response.status_message
      });

      if (!response.tasks || response.tasks.length === 0) {
        throw new Error('No tasks in response');
      }

      const task = response.tasks[0];
      if (!task.result || task.result.length === 0) {
        this.logger.warn('No search volume results returned', {
          taskStatusCode: task.status_code,
          taskStatusMessage: task.status_message
        });
        return keywords.map(keyword => ({
          keyword,
          searchVolume: 0,
          competition: 'Unknown',
          cpc: 0,
          monthlySearches: []
        }));
      }

      // Log the raw results for debugging
      this.logger.info('Raw Search Volume Results', {
        resultLength: task.result.length,
        sampleResult: task.result.length > 0 ? task.result[0] : null,
        allResults: task.result
      });

      // Process results directly (no waiting required with live endpoint)
      const searchVolumeData = this.processSearchVolumeResults(task.result, keywords, normalizedKeywords);
      
      this.logger.success('Search volume data retrieved (live)', {
        keywordCount: searchVolumeData.length,
        processedData: searchVolumeData
      });

      return searchVolumeData;
    } catch (error) {
      this.logger.error('Failed to get search volume (live)', error);
      throw error;
    }
  }

  /**
   * Get task results with retry logic
   */
  async getTaskResults(taskId, retries = 8) {
    for (let i = 0; i < retries; i++) {
      try {
        const endpoint = `${API_CONFIG.dataForSEO.endpoints.taskResult}/${taskId}`;
        const response = await this.makeRequest(endpoint, 'GET');

        if (response.tasks && response.tasks[0] && response.tasks[0].result) {
          return response.tasks[0].result;
        }

        if (i < retries - 1) {
          // Exponential backoff: 5s, 8s, 12s, 18s, 25s, 35s, 45s
          const waitTime = 5000 + (i * 3000);
          this.logger.info(`Task not ready, retrying in ${waitTime/1000} seconds... (${i + 1}/${retries})`);
          await this.delay(waitTime);
        }
      } catch (error) {
        if (i === retries - 1) throw error;
        const waitTime = 5000 + (i * 3000);
        await this.delay(waitTime);
      }
    }

    throw new Error('Failed to get task results after maximum retries');
  }

  /**
   * Process search volume results
   */
  processSearchVolumeResults(results, originalKeywords, normalizedKeywords) {
    this.logger.info('Processing search volume results', {
      resultsType: typeof results,
      resultsIsArray: Array.isArray(results),
      resultsLength: results?.length || 0,
      originalKeywords,
      normalizedKeywords
    });

    const volumeMap = new Map();

    if (results && Array.isArray(results)) {
      results.forEach((item, index) => {
        this.logger.info(`Processing result item ${index}`, {
          hasKeyword: !!item.keyword,
          hasKeywordInfo: !!item.keyword_info,
          keyword: item.keyword,
          keywordInfo: item.keyword_info,
          fullItem: item
        });

        if (item.keyword_info || typeof item.search_volume !== 'undefined') {
          volumeMap.set(item.keyword.toLowerCase(), {
            keyword: item.keyword,
            searchVolume: typeof item.search_volume !== 'undefined'
              ? item.search_volume
              : (item.keyword_info?.search_volume || 0),
            competition: typeof item.competition !== 'undefined'
              ? item.competition
              : (item.keyword_info?.competition || 'Unknown'),
            cpc: typeof item.cpc !== 'undefined'
              ? item.cpc
              : (item.keyword_info?.cpc || 0),
            monthlySearches: item.monthly_searches || item.keyword_info?.monthly_searches || []
          });
        }
      });
    }

    // Map original keywords to their results
    return originalKeywords.map((keyword, index) => {
      const normalizedKeyword = normalizedKeywords ? normalizedKeywords[index] : keyword.toLowerCase();
      const data = volumeMap.get(normalizedKeyword);
      return data ? {
        ...data,
        keyword: keyword // Preserve original keyword format
      } : {
        keyword,
        searchVolume: 0,
        competition: 'Unknown',
        cpc: 0,
        monthlySearches: []
      };
    });
  }

  /**
   * Get SERP results for competitor analysis using live endpoint
   */
  async getSERPResults(keyword, location = API_CONFIG.dataForSEO.defaultLocation, language = API_CONFIG.dataForSEO.defaultLanguage) {
    try {
      // Convert language name to language code
      const languageCode = this.getLanguageCode(language);
      
      this.logger.process('Getting SERP results (live)', { keyword, location, language: languageCode });

      // Use exact format from DataForSEO documentation
      const serpData = [{
        keyword,
        location_code: location,
        language_code: languageCode,
        device: 'desktop',
        os: 'windows',
        depth: 10
      }];

      const response = await this.makeRequest(
        '/v3/serp/google/organic/live/advanced',
        'POST',
        serpData
      );

      if (!response.tasks || response.tasks.length === 0 || !response.tasks[0].result) {
        throw new Error('No SERP results found');
      }

      const results = response.tasks[0].result[0];
      const organicResults = results.items?.filter(item => item.type === 'organic') || [];

      this.logger.success(`SERP results retrieved: ${organicResults.length} organic results`);

      return {
        keyword,
        totalResults: results.se_results_count || 0,
        organicResults: organicResults.map(item => ({
          position: item.rank_absolute,
          title: item.title,
          description: item.description,
          url: item.url,
          domain: item.domain,
          breadcrumb: item.breadcrumb,
          isTopStory: item.is_top_stories || false,
          isFeatured: item.is_featured_snippet || false
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get SERP results', error);
      throw error;
    }
  }

  /**
   * Get competitor content for analysis - simplified to get plain text for AI processing
   */
  async getCompetitorContent(urls, limit = 3) {
    try {
      this.logger.process('Fetching competitor content', { urlCount: urls.length, limit });

      const contentPromises = urls.slice(0, limit).map(async (url, index) => {
        try {
          // Add delay to avoid rate limiting
          await this.delay(index * 1000);
          
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          // Simple HTML to text conversion - let AI do the intelligent parsing
          const cheerio = require('cheerio');
          const $ = cheerio.load(response.data);
          
          // Remove scripts, styles, and navigation elements
          $('script, style, nav, header, footer, .nav, .menu, .sidebar').remove();
          
          // Get basic page info
          const title = $('title').text().trim() || '';
          const metaDescription = $('meta[name="description"]').attr('content') || '';
          
          // Get all text content - let AI filter what's relevant
          const bodyText = $('body').text()
            .replace(/\s+/g, ' ')          // Normalize whitespace
            .replace(/\n+/g, ' ')          // Remove line breaks
            .trim()
            .substring(0, 3000);           // Limit to 3000 chars for AI processing

          // Extract domain for reference
          const domain = this.extractDomain(url);

          return {
            url,
            domain,
            title,
            metaDescription,
            content: bodyText,
            contentLength: bodyText.length
          };
        } catch (error) {
          this.logger.warn(`Failed to fetch content from ${url}`, error.message);
          return {
            url,
            domain: this.extractDomain(url),
            title: 'Content unavailable',
            metaDescription: '',
            content: 'Unable to fetch content from this source.',
            contentLength: 0
          };
        }
      });

      const results = await Promise.all(contentPromises);
      const validResults = results.filter(r => r.contentLength > 100); // Only include meaningful content

      this.logger.success(`Competitor content fetched: ${validResults.length}/${urls.length} with meaningful content`);
      
      return validResults;
    } catch (error) {
      this.logger.error('Failed to get competitor content', error);
      throw error;
    }
  }

  /**
   * Helper: Get date N months ago in required format
   */
  getDateMonthsAgo(months) {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Helper: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DataForSEOService; 