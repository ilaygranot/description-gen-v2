/**
 * Gemini Service
 * Handles Google Generative AI content generation with brand guidelines
 */

const axios = require('axios');
const { BRAND_GUIDELINES, API_CONFIG } = require('../config/constants');
const { TokenCounter, TokenUsageTracker } = require('../utils/tokenCounter');
const { logger } = require('../utils/logger');
const Prompt = require('../utils/prompt');

class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = API_CONFIG.gemini.model;
    this.apiEndpoint = API_CONFIG.gemini.apiEndpoint;
    this.tokenCounter = new TokenCounter(this.model);
    this.usageTracker = new TokenUsageTracker();
    this.logger = logger.child('Gemini');
  }

  /**
   * Generate SEO description for a single page
   */
  async generateDescription(pageName, language = 'English', competitorInsights = null, searchVolume = null) {
    try {
      this.logger.process(`Generating description for: ${pageName}`, { language });

      // Build prompts from template files
      const systemPrompt = Prompt.render('system.txt', {
        language,
        minWords: BRAND_GUIDELINES.structure.length.min,
        maxWords: BRAND_GUIDELINES.structure.length.max
      });

      const userPrompt = Prompt.render('description_user.txt', {
        pageName,
        minWords: BRAND_GUIDELINES.structure.length.min,
        maxWords: BRAND_GUIDELINES.structure.length.max,
        competitorInsights,
        searchVolume: searchVolume?.searchVolume ? searchVolume.searchVolume.toLocaleString() : null,
        competition: searchVolume?.competition,
        cpc: searchVolume?.cpc?.toFixed ? searchVolume.cpc.toFixed(2) : null
      });

      // Combine prompts for Gemini
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Log the full prompt being sent to Gemini
      this.logger.info('Gemini > Full Prompt', {
        pageName,
        language,
        hasCompetitorInsights: !!competitorInsights,
        promptLength: fullPrompt.length,
        prompt: fullPrompt
      });

      // Estimate tokens before making the request
      const estimation = this.tokenCounter.estimateRequestTokens(fullPrompt);
      this.logger.info('Token estimation', estimation);

      // Make the API call
      const response = await this.makeAPICall(fullPrompt);
      
      // Add detailed logging for debugging
      this.logger.info('Gemini API Response Structure', {
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length || 0,
        firstCandidate: response.candidates?.[0] ? 'exists' : 'missing',
        hasContent: !!response.candidates?.[0]?.content,
        hasParts: !!response.candidates?.[0]?.content?.parts,
        partsLength: response.candidates?.[0]?.content?.parts?.length || 0,
        fullResponse: JSON.stringify(response, null, 2)
      });
      
      // Safely extract description with proper error handling
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini API');
      }
      
      const candidate = response.candidates[0];
      if (!candidate.content) {
        throw new Error('No content in Gemini API response');
      }
      
      let description;
      
      // Try different response structures based on Gemini API documentation
      if (candidate.content.parts && candidate.content.parts.length > 0) {
        // Standard structure: content.parts[0].text
        description = candidate.content.parts[0].text;
      } else if (candidate.content.text) {
        // Alternative structure: content.text
        description = candidate.content.text;
      } else if (typeof candidate.content === 'string') {
        // Direct string content
        description = candidate.content;
      } else {
        // Last resort: try to find text anywhere in content
        description = this.extractTextFromContent(candidate.content);
      }
      
      if (!description || description.trim().length === 0) {
        throw new Error('No text content found in Gemini API response');
      }
      
      // Calculate token usage (Gemini provides this in metadata)
      const usage = {
        prompt_tokens: response.usageMetadata?.promptTokenCount || estimation.promptTokens,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || this.tokenCounter.countTokens(description),
        total_tokens: (response.usageMetadata?.promptTokenCount || estimation.promptTokens) + 
                     (response.usageMetadata?.candidatesTokenCount || this.tokenCounter.countTokens(description))
      };

      // Calculate actual cost
      const cost = this.tokenCounter.calculateCost(usage.prompt_tokens, usage.completion_tokens);
      
      // Track usage
      this.usageTracker.addRequest(
        usage.prompt_tokens,
        usage.completion_tokens,
        cost,
        { pageName, language }
      );

      // Validate word count
      const wordCount = this.countWords(description);
      const isValidLength = wordCount >= BRAND_GUIDELINES.structure.length.min && 
                           wordCount <= BRAND_GUIDELINES.structure.length.max;

      this.logger.success(`Description generated`, {
        pageName,
        wordCount,
        isValidLength,
        tokens: usage.total_tokens,
        cost: cost.totalCost
      });

      return {
        pageName,
        description,
        wordCount,
        isValidLength,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost: cost.totalCost
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate description for ${pageName}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Make API call to Gemini
   */
  async makeAPICall(prompt) {
    const url = `${this.apiEndpoint}/${this.model}:generateContent`;
    
    try {
      const response = await axios.post(
        `${url}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: API_CONFIG.gemini.temperature,
            maxOutputTokens: API_CONFIG.gemini.maxTokens,
            topP: 0.8,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.candidates || response.data.candidates.length === 0) {
        throw new Error('No content generated');
      }

      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Format API errors
   */
  formatError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.response.statusText;
      
      if (status === 429) {
        return new Error(`Gemini API rate limit exceeded. ${message}`);
      } else if (status === 401) {
        return new Error('Invalid Gemini API key. Please check your credentials.');
      } else if (status === 400) {
        return new Error(`Invalid request: ${message}`);
      }
      
      return new Error(`Gemini API Error: ${status} - ${message}`);
    } else if (error.request) {
      return new Error('Gemini API: No response received');
    } else {
      return error;
    }
  }

  /**
   * Analyze competitor content for insights
   */
  async analyzeCompetitorContent(keyword, competitorContent) {
    try {
      this.logger.process(`Analyzing competitor content for: ${keyword}`);

      if (!competitorContent || competitorContent.length === 0) {
        return null;
      }

      const competitorBlocks = competitorContent.map((c, i) => `=== Competitor ${i + 1}: ${c.domain} ===\nPage Title: ${c.title}\nMeta Description: ${c.metaDescription}\nContent (plain text): ${c.content}`).join('\n\n');

      const analysisPrompt = Prompt.render('competitor_analysis.txt', {
        keyword,
        competitorBlocks
      });

      // Log the competitor analysis prompt
      this.logger.info('Gemini > Competitor Analysis Prompt', {
        keyword,
        competitorCount: competitorContent.length,
        promptLength: analysisPrompt.length,
        prompt: analysisPrompt
      });

      const response = await this.makeAPICall(analysisPrompt);
      
      // Extract insights using the same safe extraction method
      const candidate = response.candidates[0];
      let insights;
      
      if (candidate.content.parts && candidate.content.parts.length > 0) {
        insights = candidate.content.parts[0].text;
      } else if (candidate.content.text) {
        insights = candidate.content.text;
      } else if (typeof candidate.content === 'string') {
        insights = candidate.content;
      } else {
        insights = this.extractTextFromContent(candidate.content);
      }
      
      const usage = {
        prompt_tokens: response.usageMetadata?.promptTokenCount || this.tokenCounter.countTokens(analysisPrompt),
        completion_tokens: response.usageMetadata?.candidatesTokenCount || this.tokenCounter.countTokens(insights)
      };

      // Track usage
      const cost = this.tokenCounter.calculateCost(usage.prompt_tokens, usage.completion_tokens);
      this.usageTracker.addRequest(
        usage.prompt_tokens,
        usage.completion_tokens,
        cost,
        { type: 'competitor_analysis', keyword }
      );

      this.logger.success('Competitor analysis completed', {
        keyword,
        competitorCount: competitorContent.length,
        tokensUsed: usage.prompt_tokens + usage.completion_tokens
      });

      return insights;
    } catch (error) {
      this.logger.error('Failed to analyze competitor content', error);
      // Return null instead of throwing to allow description generation to continue
      return null;
    }
  }

  /**
   * Generate descriptions with retry logic for word count compliance
   */
  async generateWithRetry(pageName, language, competitorInsights, searchVolume = null, maxRetries = 3) {
    let lastResult = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.info(`Generation attempt ${attempt}/${maxRetries} for ${pageName}`);
      
      try {
        const result = await this.generateDescription(pageName, language, competitorInsights, searchVolume);
        
        if (result.isValidLength) {
          return result;
        }
        
        lastResult = result;
        
        // Add word count feedback to competitor insights for next attempt
        if (attempt < maxRetries) {
          const wordCountFeedback = result.wordCount < BRAND_GUIDELINES.structure.length.min
            ? `IMPORTANT: The previous attempt had only ${result.wordCount} words. You MUST write at least ${BRAND_GUIDELINES.structure.length.min} words.`
            : `IMPORTANT: The previous attempt had ${result.wordCount} words. You MUST keep it under ${BRAND_GUIDELINES.structure.length.max} words.`;
          
          competitorInsights = `${wordCountFeedback}\n\n${competitorInsights || ''}`;
        }
      } catch (error) {
        if (attempt === maxRetries) throw error;
        this.logger.warn(`Attempt ${attempt} failed, retrying...`, error.message);
      }
    }
    
    // Return last result even if word count is invalid
    this.logger.warn(`Failed to achieve valid word count after ${maxRetries} attempts`);
    return lastResult;
  }

  /**
   * Helper method to extract text from various content structures
   */
  extractTextFromContent(content) {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content && typeof content === 'object') {
      // Try to find text in various possible properties
      if (content.text) return content.text;
      if (content.parts && Array.isArray(content.parts) && content.parts.length > 0) {
        return content.parts[0].text || content.parts[0];
      }
      
      // Recursively search for text in nested objects
      for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          return value;
        }
        if (typeof value === 'object') {
          const extracted = this.extractTextFromContent(value);
          if (extracted) return extracted;
        }
      }
    }
    
    return null;
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get usage summary
   */
  getUsageSummary() {
    return this.usageTracker.getSummary();
  }

  /**
   * Reset usage tracking
   */
  resetUsageTracking() {
    this.usageTracker.reset();
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.tokenCounter.dispose();
  }
}

module.exports = GeminiService; 