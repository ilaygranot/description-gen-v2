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
   * Get search volume for multiple keywords
   */
  async getSearchVolume(keywords, location = API_CONFIG.dataForSEO.defaultLocation, language = API_CONFIG.dataForSEO.defaultLanguage) {
    try {
      this.logger.process('Getting search volume', { keywords, location, language });

      // Step 1: Create task
      const taskData = [{
        keywords,
        location_code: location,
        language_code: language,
        search_partners: false,
        date_from: this.getDateMonthsAgo(12), // Last 12 months of data
        sort_by: 'search_volume'
      }];

      const taskResponse = await this.makeRequest(
        API_CONFIG.dataForSEO.endpoints.searchVolume,
        'POST',
        taskData
      );

      if (!taskResponse.tasks || taskResponse.tasks.length === 0) {
        throw new Error('No task created');
      }

      const taskId = taskResponse.tasks[0].id;
      this.logger.info(`Search volume task created: ${taskId}`);

      // Step 2: Wait and get results
      await this.delay(2000); // Wait 2 seconds for processing

      const results = await this.getTaskResults(taskId);
      
      // Process and format results
      const searchVolumeData = this.processSearchVolumeResults(results, keywords);
      
      this.logger.success('Search volume data retrieved', {
        keywordCount: searchVolumeData.length
      });

      return searchVolumeData;
    } catch (error) {
      this.logger.error('Failed to get search volume', error);
      throw error;
    }
  }

  /**
   * Get task results with retry logic
   */
  async getTaskResults(taskId, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const endpoint = `${API_CONFIG.dataForSEO.endpoints.taskResult}/${taskId}`;
        const response = await this.makeRequest(endpoint, 'GET');

        if (response.tasks && response.tasks[0] && response.tasks[0].result) {
          return response.tasks[0].result;
        }

        if (i < retries - 1) {
          this.logger.info(`Task not ready, retrying in 3 seconds... (${i + 1}/${retries})`);
          await this.delay(3000);
        }
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(3000);
      }
    }

    throw new Error('Failed to get task results after maximum retries');
  }

  /**
   * Process search volume results
   */
  processSearchVolumeResults(results, originalKeywords) {
    const volumeMap = new Map();

    if (results && Array.isArray(results)) {
      results.forEach(item => {
        if (item.keyword_info) {
          volumeMap.set(item.keyword.toLowerCase(), {
            keyword: item.keyword,
            searchVolume: item.keyword_info.search_volume || 0,
            competition: item.keyword_info.competition || 'Unknown',
            cpc: item.keyword_info.cpc || 0,
            monthlySearches: item.keyword_info.monthly_searches || []
          });
        }
      });
    }

    // Ensure all original keywords are included
    return originalKeywords.map(keyword => {
      const data = volumeMap.get(keyword.toLowerCase());
      return data || {
        keyword,
        searchVolume: 0,
        competition: 'Unknown',
        cpc: 0,
        monthlySearches: []
      };
    });
  }

  /**
   * Get SERP results for competitor analysis
   */
  async getSERPResults(keyword, location = API_CONFIG.dataForSEO.defaultLocation, language = API_CONFIG.dataForSEO.defaultLanguage) {
    try {
      this.logger.process('Getting SERP results', { keyword, location, language });

      const serpData = [{
        keyword,
        location_code: location,
        language_code: language,
        device: 'desktop',
        os: 'windows',
        depth: 10, // Top 10 results
        calculate_rectangles: false
      }];

      const response = await this.makeRequest(
        API_CONFIG.dataForSEO.endpoints.serp,
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
   * Get competitor content for analysis
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
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          // Extract text content from HTML
          const cheerio = require('cheerio');
          const $ = cheerio.load(response.data);
          
          // Remove script and style elements
          $('script, style').remove();
          
          // Get main content areas
          const title = $('title').text() || $('h1').first().text();
          const metaDescription = $('meta[name="description"]').attr('content') || '';
          
          // Try to find main content
          const contentSelectors = ['main', 'article', '.content', '#content', '[role="main"]'];
          let mainContent = '';
          
          for (const selector of contentSelectors) {
            const content = $(selector).text();
            if (content && content.length > mainContent.length) {
              mainContent = content;
            }
          }

          // Fallback to body if no main content found
          if (!mainContent) {
            mainContent = $('body').text();
          }

          // Clean and truncate content
          mainContent = mainContent
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000); // Limit to 5000 chars

          return {
            url,
            title,
            metaDescription,
            content: mainContent,
            wordCount: mainContent.split(/\s+/).length
          };
        } catch (error) {
          this.logger.warn(`Failed to fetch content from ${url}`, error.message);
          return null;
        }
      });

      const results = await Promise.all(contentPromises);
      const validResults = results.filter(r => r !== null);

      this.logger.success(`Competitor content fetched: ${validResults.length}/${urls.length} successful`);
      
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
   * Helper: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DataForSEOService; 