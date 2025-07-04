/**
 * OpenAI Service
 * Handles AI-powered content generation with brand guidelines
 */

const OpenAI = require('openai');
const { BRAND_GUIDELINES, API_CONFIG } = require('../config/constants');
const { TokenCounter, TokenUsageTracker } = require('../utils/tokenCounter');
const { logger } = require('../utils/logger');
const Prompt = require('../utils/prompt');

class OpenAIService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
    this.model = API_CONFIG.openAI.model;
    this.tokenCounter = new TokenCounter(this.model);
    this.usageTracker = new TokenUsageTracker();
    this.logger = logger.child('OpenAI');
  }

  /**
   * Generate SEO description for a single page
   */
  async generateDescription(pageName, language = 'English', competitorInsights = null, searchVolume = null) {
    try {
      this.logger.process(`Generating description for: ${pageName}`, { language });

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

      // Estimate tokens before making the request
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const estimation = this.tokenCounter.estimateRequestTokens(messages);
      this.logger.info('Token estimation', estimation);

      // Make the API call
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        max_tokens: API_CONFIG.openAI.maxTokens,
        temperature: API_CONFIG.openAI.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const description = completion.choices[0].message.content;
      const usage = completion.usage;

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
      throw error;
    }
  }

  /**
   * Build system prompt with brand guidelines
   */
  buildSystemPrompt(language) {
    return `You are an expert SEO content writer for a ticket aggregation platform. Your task is to write compelling, SEO-optimized descriptions that follow these strict guidelines:

BUSINESS MODEL:
- ${BRAND_GUIDELINES.businessModel.description}
- ${BRAND_GUIDELINES.businessModel.emphasis}

TONE & VOICE:
${BRAND_GUIDELINES.tone.characteristics.map(c => `- ${c}`).join('\n')}

CONTENT REQUIREMENTS:
- Length: ${BRAND_GUIDELINES.structure.length.min}-${BRAND_GUIDELINES.structure.length.max} words (STRICTLY ENFORCED)
- Format: ${BRAND_GUIDELINES.structure.format.firstMention}
- Style: ${BRAND_GUIDELINES.structure.format.evergreen}

WRITING RULES:
Must Include:
${BRAND_GUIDELINES.style.include.map(i => `- ${i}`).join('\n')}

Must Avoid:
${BRAND_GUIDELINES.style.avoid.map(a => `- ${a}`).join('\n')}

LANGUAGE:
Write the entire description in ${language}. If not English, maintain the same professional tone and follow all guidelines while using natural expressions in the target language.

FORMAT:
- Use **bold** for the first mention of the main keyword
- Write in a single flowing narrative without headers or sections
- Ensure the content reads naturally while being SEO-optimized`;
  }

  /**
   * Build user prompt with page name, search volume, and optional competitor insights
   */
  buildUserPrompt(pageName, competitorInsights, searchVolume = null) {
    let prompt = `Write an SEO-optimized description for: "${pageName}"`;

    // Include search volume data if available
    if (searchVolume && searchVolume.searchVolume > 0) {
      prompt += `\n\nSEO Data:
- Monthly Search Volume: ${searchVolume.searchVolume.toLocaleString()}
- Competition Level: ${searchVolume.competition}
- Average CPC: $${searchVolume.cpc.toFixed(2)}

This is a high-value keyword with significant search interest. Ensure the description is optimized for this search behavior.`;
    }

    if (competitorInsights) {
      prompt += `\n\nCompetitor Analysis Insights:\n${competitorInsights}`;
      prompt += `\n\nUse these insights to ensure our description covers important topics while maintaining our unique brand voice and perspective.`;
    }

    prompt += `\n\nRemember: 
- Bold the first mention of "${pageName}"
- Write exactly ${BRAND_GUIDELINES.structure.length.min}-${BRAND_GUIDELINES.structure.length.max} words
- Focus on the fan experience and ticket-buying journey`;

    return prompt;
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

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a content strategist analyzing competitor content for SEO insights. Provide concise, actionable insights.' },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3
      });

      const insights = completion.choices[0].message.content;
      const usage = completion.usage;

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
        tokensUsed: usage.total_tokens
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

module.exports = OpenAIService; 