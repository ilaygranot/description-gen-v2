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
        this.loadSessions();
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
            modelSelect: document.getElementById('model'),
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

            // Sessions
            sessionsContainer: document.getElementById('sessionsContainer'),
            
            // Cost badge
            costBadge: document.getElementById('costBadge'),
            
            // Template
            resultTemplate: document.getElementById('resultTemplate'),
            themeToggle: document.getElementById('themeToggle'),
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

        // Toggle cost tracker on badge click
        this.elements.costBadge.addEventListener('click', () => {
            const isVisible = this.elements.costTracker.style.display !== 'none';
            this.elements.costTracker.style.display = isVisible ? 'none' : 'block';
        });

        // Theme toggle handler
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Apply stored theme
        this.applyStoredTheme();
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
            location: parseInt(document.getElementById('location').value),
            language: this.elements.languageSelect.value,
            model: this.getSelectedModel(),
            includeSearchVolume: this.elements.searchVolumeCheckbox.checked,
            includeCompetitorAnalysis: this.elements.competitorCheckbox.checked
        };

        console.log('Starting generation with config:', config);

        // Start processing
        this.startProcessing(pages.length);

        try {
            const response = await this.generateDescriptions(config);
            this.handleSuccess(response);

            // Save session for memory
            this.saveSession(response);
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
     * Get selected model from radio buttons
     */
    getSelectedModel() {
        const checked = document.querySelector('input[name="model"]:checked');
        return checked ? checked.value : 'gpt-4o';
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
        this.elements.costBadge.style.display = 'none';
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
        // Update detailed tracker
        this.elements.inputTokens.textContent = usage.totalInputTokens.toLocaleString();
        this.elements.outputTokens.textContent = usage.totalOutputTokens.toLocaleString();
        this.elements.totalTokens.textContent = usage.totalTokens.toLocaleString();
        this.elements.totalCost.textContent = `$${usage.totalCost.toFixed(4)}`;

        // Update summary badge
        this.elements.costBadge.textContent = `$${usage.totalCost.toFixed(4)}`;
        this.elements.costBadge.title = `Input: ${usage.totalInputTokens.toLocaleString()} • Output: ${usage.totalOutputTokens.toLocaleString()} • Total: ${usage.totalTokens.toLocaleString()}`;
        this.elements.costBadge.style.display = 'inline-block';

        // Keep tracker hidden until user clicks badge
        this.elements.costTracker.style.display = 'none';
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

        // Competitor favicons
        if (Array.isArray(result.competitorDomains) && result.competitorDomains.length > 0) {
            const logoContainer = card.querySelector('.competitor-logos');
            logoContainer.style.display = 'flex';

            // Limit to top 8 competitors to avoid cluttering the UI
            const limitedDomains = result.competitorDomains.slice(0, 8);

            limitedDomains.forEach((domain, index) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'favicon-wrapper';
                imgWrapper.style.cssText = `
                    position: relative;
                    width: 24px;
                    height: 24px;
                `;

                const img = document.createElement('img');
                img.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                img.alt = domain;
                img.title = `Top competitor: ${domain}`;
                img.className = 'competitor-favicon';
                img.style.cssText = `
                    width: 24px;
                    height: 24px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    transition: all var(--transition-fast);
                `;

                // Add loading state
                img.style.opacity = '0';
                
                // Handle successful load
                img.onload = () => {
                    img.style.opacity = '1';
                };

                // Handle failed load with fallback icon
                img.onerror = () => {
                    img.style.opacity = '1';
                    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
                    img.title = `Competitor: ${domain} (favicon unavailable)`;
                };

                // Add hover effect
                img.addEventListener('mouseenter', () => {
                    img.style.transform = 'scale(1.1)';
                    img.style.zIndex = '10';
                });

                img.addEventListener('mouseleave', () => {
                    img.style.transform = 'scale(1)';
                    img.style.zIndex = '1';
                });

                imgWrapper.appendChild(img);
                logoContainer.appendChild(imgWrapper);
            });

            // Add a count indicator if there are more competitors than shown
            if (result.competitorDomains.length > limitedDomains.length) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-competitors';
                moreIndicator.style.cssText = `
                    width: 24px;
                    height: 24px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-color);
                    background: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                `;
                moreIndicator.textContent = `+${result.competitorDomains.length - limitedDomains.length}`;
                moreIndicator.title = `${result.competitorDomains.length - limitedDomains.length} more competitors analyzed`;
                logoContainer.appendChild(moreIndicator);
            }
        }

        // Show SeatPick ranking warning if applicable
        if (result.seatpickTop3) {
            const warning = document.createElement('div');
            warning.className = 'seatpick-warning';
            warning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> SeatPick already ranks in the top 3 results for this keyword. Review carefully before updating the existing page.';
            card.insertBefore(warning, card.querySelector('.result-content'));
        }

        // Set description or error message
        const descriptionElement = card.querySelector('.description-text');
        if (result.success && result.description) {
            // Convert markdown bold to HTML
            descriptionElement.innerHTML = this.formatDescription(result.description);
        } else {
            descriptionElement.innerHTML = `<span style="color: var(--error-color)">Error: ${result.error || 'Failed to generate description'}</span>`;
        }

        // Set up copy functionality
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => this.copyToClipboard(result.description, copyBtn));

        return card;
    }

    /**
     * Format description text (convert markdown to HTML)
     */
    formatDescription(text) {
        // Bold conversion first
        const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Split into paragraphs on double newline
        const paragraphs = bolded.split(/\n{2,}/).map(p => p.trim());
        return paragraphs.map(p => `<p>${p}</p>`).join('');
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

    /* ================= Session Memory ================= */

    getStoredSessions() {
        try {
            const data = JSON.parse(localStorage.getItem('seoGenSessions')) || [];
            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
    }

    saveSession(responseData) {
        const sessions = this.getStoredSessions();
        const pages = responseData.results.map(r => r.pageName);
        sessions.unshift({ id: Date.now(), timestamp: new Date().toISOString(), pages, data: responseData });
        // Keep only last 10 sessions
        if (sessions.length > 10) sessions.length = 10;
        localStorage.setItem('seoGenSessions', JSON.stringify(sessions));
        this.renderSessions(sessions);
    }

    loadSessions() {
        const sessions = this.getStoredSessions();
        this.renderSessions(sessions);
    }

    renderSessions(sessions) {
        this.elements.sessionsContainer.innerHTML = '';
        
        if (sessions.length === 0) {
            this.elements.sessionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock-rotate-left"></i>
                    <p>No previous sessions</p>
                </div>
            `;
            return;
        }
        
        sessions.forEach(session => {
            const div = document.createElement('div');
            div.className = 'session-item';
            div.title = new Date(session.timestamp).toLocaleString();
            div.textContent = session.pages.join(', ');
            div.addEventListener('click', () => {
                this.showSession(session);
            });
            this.elements.sessionsContainer.appendChild(div);
        });
    }

    showSession(session) {
        const { data } = session;
        if (!data || !data.results) return;

        // Populate textarea with pages for convenience
        this.elements.pageNamesInput.value = session.pages.join('\n');

        // Display cost & results
        if (data.summary && data.summary.usage) {
            this.updateCostTracking(data.summary.usage);
        }
        this.displayResults(data.results);

        // Scroll to results section
        this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    /* ================= Theme ================= */

    applyStoredTheme() {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = stored || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateThemeIcon(next);
    }

    updateThemeIcon(theme) {
        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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