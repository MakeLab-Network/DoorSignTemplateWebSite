// Main page script for template selection

class TemplateManager {
    constructor() {
        this.config = null;
        this.templates = [];
        this.animationIntervals = new Map();
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadConfig();
            this.applyBackgroundColor();
            await this.preloadAllVariations();
            this.createTemplateGrid();
        } catch (error) {
            this.showError('Failed to load templates. Please refresh the page.');
            console.error('Initialization error:', error);
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch('generated/config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.config = await response.json();
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }
    
    applyBackgroundColor() {
        if (this.config && this.config.colors) {
            // Apply main page colors
            if (this.config.colors.webMain) {
                if (this.config.colors.webMain.backgroundColor) {
                    document.documentElement.style.setProperty('--bg-color', this.config.colors.webMain.backgroundColor);
                }
                if (this.config.colors.webMain.textColor) {
                    document.documentElement.style.setProperty('--text-color', this.config.colors.webMain.textColor);
                }
            }
            
            // Store webImg colors for template display
            if (this.config.colors.webImg) {
                document.documentElement.style.setProperty('--img-bg-color', this.config.colors.webImg.backgroundColor);
            }
        }
    }
    
    async preloadAllVariations() {
        if (!this.config || !this.config.variations) return;
        
        const preloadPromises = [];
        
        this.config.variations.forEach(([templateName, variationCount]) => {
            for (let i = 0; i < variationCount; i++) {
                const promise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => {
                        console.warn(`Failed to preload ${templateName}_var${i}.svg`);
                        resolve(); // Don't fail the whole process for one image
                    };
                    img.src = `generated/displayables/${templateName}_var${i}.svg`;
                });
                preloadPromises.push(promise);
            }
        });
        
        await Promise.all(preloadPromises);
    }
    
    createTemplateGrid() {
        const grid = document.getElementById('template-grid');
        
        if (!this.config || !this.config.variations || this.config.variations.length === 0) {
            this.showError('No templates available.');
            return;
        }
        
        // Clear loading state
        grid.innerHTML = '';
        
        this.config.variations.forEach(([templateName, variationCount]) => {
            const templateItem = this.createTemplateItem(templateName, variationCount);
            grid.appendChild(templateItem);
        });
    }
    
    createTemplateItem(templateName, variationCount) {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.dataset.templateName = templateName;
        item.dataset.variationCount = variationCount;
        
        // Create single SVG element (no complex animation structure)
        const svg = document.createElement('img');
        svg.className = 'template-svg';
        svg.src = `generated/displayables/${templateName}_var0.svg`; // Start with first variation (0-based)
        svg.alt = `${templateName} variation 0`;
        
        // Add click handler to navigate to template page
        item.addEventListener('click', () => {
            this.navigateToTemplate(templateName);
        });

        item.appendChild(svg);
        
        // Start animation after SVG loads (only once)
        const onInitialLoad = () => {
            this.startSimpleAnimation(item, templateName, variationCount);
            svg.removeEventListener('load', onInitialLoad); // Remove this listener after first execution
        };
        svg.addEventListener('load', onInitialLoad);
        
        // Also handle load errors
        svg.addEventListener('error', () => {
            console.warn(`Failed to load ${templateName}_var0.svg`);
        });
        
        return item;
    }
    
    startSimpleAnimation(item, templateName, variationCount) {
        if (variationCount <= 1) return; // No animation needed for single variation
        
        let currentVariation = 0;
        const svg = item.querySelector('.template-svg');
        
        const switchVariation = () => {
            // Calculate next variation
            currentVariation = (currentVariation + 1) % variationCount;
            
            // Simply change the src - instant cut, no animation
            const newSrc = `generated/displayables/${templateName}_var${currentVariation}.svg`;
            svg.src = newSrc;
            
            // Update alt text for debugging
            svg.alt = `${templateName} variation ${currentVariation}`;
            
            // Add error handling for this specific load
            svg.onerror = () => {
                console.error(`Failed to load: ${newSrc}`);
            };
        };
        
        // Start the animation with a 1.5-second interval
        const intervalId = setInterval(switchVariation, 1500);
        this.animationIntervals.set(item, intervalId);
    }
    
    navigateToTemplate(templateName) {
        // Stop animation for this item
        const item = document.querySelector(`[data-template-name="${templateName}"]`);
        if (item && this.animationIntervals.has(item)) {
            clearInterval(this.animationIntervals.get(item));
            this.animationIntervals.delete(item);
        }
        
        // Find the variation count for this template
        const templateInfo = this.config.variations.find(([name, count]) => name === templateName);
        const variationCount = templateInfo ? templateInfo[1] : 0;
        
        // Navigate to template page with all necessary parameters
        const params = new URLSearchParams({
            template: templateName,
            variationCount: variationCount,
            colors: JSON.stringify(this.config.colors || {})
        });
        
        window.location.href = `template.html?${params.toString()}`;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Show loading state
    const grid = document.getElementById('template-grid');
    grid.innerHTML = '<div class="loading">Loading and preloading templates...</div>';
    
    // Initialize template manager
    window.templateManager = new TemplateManager();
});