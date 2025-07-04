/**
 * SEO Description Generator v2 - Frontend Application
 * Handles UI interactions and API communication
 */

class SEODescriptionGenerator {
    constructor() {
        this.elements = this.initializeElements();
        this.state = {
            isProcessing: false,
            results: [],
            totalCost: 0
        };
        
        this.initializeEventListeners();
        console.log('SEO Description Generator initialized');
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        return {
            // Input elements
            pageNamesInput: document.getElementById('pageNames'),
            languageSelect: document.getElementById('language'),
            searchVolumeCheckbox: document.getElementById('includeSearchVolume'),
            competitorCheckbox: document.getElementById('includeCompetitorAnalysis'),
            generateBtn: document.getElementById('generateBtn'),
            
            // Processing elements
            processingSection: document.getElementById('processingSection'),
            processingStatus: document.getElementById('processingStatus'),
            progressFill: document.getElementById('progressFill'),
            
            // Cost tracking elements
            costTracker: document.getElementById('costTracker'),
            inputTokens: document.getElementById('inputTokens'),
            outputTokens: document.getElementById('outputTokens'),
            totalTokens: document.getElementById('totalTokens'),
            totalCost: document.getElementById('totalCost'),
            
            // Results elements
            resultsSection: document.getElementById('resultsSection'),
            resultsContainer: document.getElementById('resultsContainer'),
            
            // Template
            resultTemplate: document.getElementById('resultTemplate')
        };
    }

    /**
     * Set up event listeners
     */
    initializeEventListeners() {
        this.elements.generateBtn.addEventListener('click', () => this.handleGenerate());
        
        // Enable/disable generate button based on input
        this.elements.pageNamesInput.addEventListener('input', () => {
            const hasContent = this.elements.pageNamesInput.value.trim().length > 0;
            this.elements.generateBtn.disabled = !hasContent || this.state.isProcessing;
        });
    }

    /**
     * Handle generate button click
     */
    async handleGenerate() {
        // Get and validate input
        const pages = this.getPageNames();
        if (pages.length === 0) {
            this.showError('Please enter at least one page name');
            return;
        }

        if (pages.length > 10) {
            this.showError('Maximum 10 pages allowed per request');
            return;
        }

        // Get configuration
        const config = {
            pages,
            language: this.elements.languageSelect.value,
            includeSearchVolume: this.elements.searchVolumeCheckbox.checked,
            includeCompetitorAnalysis: this.elements.competitorCheckbox.checked
        };

        console.log('Starting generation with config:', config);

        // Start processing
        this.startProcessing(pages.length);

        try {
            const response = await this.generateDescriptions(config);
            this.handleSuccess(response);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.stopProcessing();
        }
    }

    /**
     * Get page names from textarea
     */
    getPageNames() {
        return this.elements.pageNamesInput.value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    /**
     * Start processing UI state
     */
    startProcessing(pageCount) {
        this.state.isProcessing = true;
        this.elements.generateBtn.disabled = true;
        this.elements.processingSection.style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
        this.elements.costTracker.style.display = 'none';
        this.elements.resultsContainer.innerHTML = '';
        
        this.updateProcessingStatus(`Processing ${pageCount} page${pageCount > 1 ? 's' : ''}...`);
        this.animateProgress();
    }

    /**
     * Stop processing UI state
     */
    stopProcessing() {
        this.state.isProcessing = false;
        this.elements.generateBtn.disabled = false;
        this.elements.processingSection.style.display = 'none';
    }

    /**
     * Update processing status message
     */
    updateProcessingStatus(message) {
        this.elements.processingStatus.textContent = message;
        console.log('Processing status:', message);
    }

    /**
     * Animate progress bar
     */
    animateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            if (!this.state.isProcessing || progress >= 90) {
                clearInterval(interval);
                if (!this.state.isProcessing) {
                    this.elements.progressFill.style.width = '100%';
                    setTimeout(() => {
                        this.elements.progressFill.style.width = '0%';
                    }, 300);
                }
                return;
            }
            
            progress += Math.random() * 10;
            this.elements.progressFill.style.width = `${Math.min(progress, 90)}%`;
        }, 500);
    }

    /**
     * Make API call to generate descriptions
     */
    async generateDescriptions(config) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate descriptions');
        }

        return await response.json();
    }

    /**
     * Handle successful response
     */
    handleSuccess(response) {
        console.log('Generation successful:', response);

        // Update cost tracking
        if (response.summary && response.summary.usage) {
            this.updateCostTracking(response.summary.usage);
        }

        // Display results
        this.displayResults(response.results);
    }

    /**
     * Handle error response
     */
    handleError(error) {
        console.error('Generation failed:', error);
        this.showError(error.message || 'An unexpected error occurred');
    }

    /**
     * Update cost tracking display
     */
    updateCostTracking(usage) {
        this.elements.inputTokens.textContent = usage.totalInputTokens.toLocaleString();
        this.elements.outputTokens.textContent = usage.totalOutputTokens.toLocaleString();
        this.elements.totalTokens.textContent = usage.totalTokens.toLocaleString();
        this.elements.totalCost.textContent = `$${usage.totalCost.toFixed(4)}`;
        
        this.elements.costTracker.style.display = 'block';
    }

    /**
     * Display results
     */
    displayResults(results) {
        this.elements.resultsSection.style.display = 'block';
        this.elements.resultsContainer.innerHTML = '';

        results.forEach(result => {
            const resultElement = this.createResultElement(result);
            this.elements.resultsContainer.appendChild(resultElement);
        });
    }

    /**
     * Create result element from template
     */
    createResultElement(result) {
        const template = this.elements.resultTemplate.content.cloneNode(true);
        const card = template.querySelector('.result-card');
        
        // Add status class
        if (result.success) {
            card.classList.add(result.isValidLength ? 'success' : 'warning');
        } else {
            card.classList.add('error');
        }

        // Set page name
        card.querySelector('.page-name').textContent = result.pageName;

        // Set metadata
        if (result.searchVolume !== null && result.searchVolume !== undefined) {
            card.querySelector('.search-volume').textContent = result.searchVolume.toLocaleString();
        }
        
        if (result.wordCount) {
            const wordCountElement = card.querySelector('.word-count');
            wordCountElement.textContent = result.wordCount;
            
            if (!result.isValidLength) {
                wordCountElement.style.color = 'var(--warning-color)';
                wordCountElement.title = 'Word count outside recommended range (350-500)';
            }
        }
        
        if (result.usage && result.usage.cost) {
            card.querySelector('.generation-cost').textContent = `$${result.usage.cost.toFixed(4)}`;
        }

        // Set description or error message
        const descriptionElement = card.querySelector('.description-text');
        if (result.success && result.description) {
            // Convert markdown bold to HTML
            descriptionElement.innerHTML = this.formatDescription(result.description);
        } else {
            descriptionElement.innerHTML = `<span style="color: var(--error-color)">Error: ${result.error || 'Failed to generate description'}</span>`;
        }

        // Set up collapsible functionality
        const collapseBtn = card.querySelector('.collapse-btn');
        const content = card.querySelector('.result-content');
        
        collapseBtn.addEventListener('click', () => {
            const isCollapsed = content.classList.toggle('collapsed');
            collapseBtn.classList.toggle('collapsed');
        });

        // Set up copy functionality
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => this.copyToClipboard(result.description, copyBtn));

        return card;
    }

    /**
     * Format description text (convert markdown to HTML)
     */
    formatDescription(text) {
        // Convert **text** to <strong>text</strong>
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Show success state
            button.classList.add('copied');
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            
            // Reset after 2 seconds
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = originalHTML;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showError('Failed to copy to clipboard');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        
        // Add styles for notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SEODescriptionGenerator();
}); 