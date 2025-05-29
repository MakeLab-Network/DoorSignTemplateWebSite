// Template variation page script

/**
 * Removes a specified pattern (warning) from an SVG string.
 *
 * @param {string} svgString The original SVG content as a string.
 * @param {RegExp} warningRegex A regular expression that matches the warning to be removed.
 * @returns {string} The SVG string with the warning removed.
 */
function removeWarningFromSvg(svgString, warningRegex) {
  if (typeof svgString !== 'string') {
    console.error('SVG content must be a string.');
    return svgString; // Or throw an error
  }
  if (!(warningRegex instanceof RegExp)) {
    console.error('Provided regex is not a valid RegExp object.');
    return svgString; // Or throw an error
  }
  return svgString.replace(warningRegex, '');
}

/**
 * Triggers a browser download for the given content.
 *
 * @param {string} content The content to be downloaded.
 * @param {string} fileName The name for the downloaded file.
 * @param {string} mimeType The MIME type of the content (e.g., 'image/svg+xml').
 */
function downloadContent(content, fileName, mimeType = 'image/svg+xml') {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link); // Clean up
  URL.revokeObjectURL(link.href); // Free up memory
}

class VariationManager {
    constructor() {
        this.templateName = null;
        this.variationCount = 0;
        this.colors = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Get parameters from URL
            this.getParametersFromURL();
            
            if (!this.templateName) {
                throw new Error('No template specified');
            }
            
            if (this.variationCount <= 0) {
                throw new Error('Invalid variation count');
            }
            
            this.applyColors();
            this.updatePageTitle();
            this.createVariationGrid();
        } catch (error) {
            this.showError('Failed to load template variations. Please go back and try again.');
            console.error('Initialization error:', error);
        }
    }
    
    getParametersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.templateName = urlParams.get('template');
        this.variationCount = parseInt(urlParams.get('variationCount')) || 0;
        
        // Parse colors from URL parameter
        const colorsParam = urlParams.get('colors');
        if (colorsParam) {
            try {
                this.colors = JSON.parse(colorsParam);
            } catch (error) {
                console.warn('Failed to parse colors from URL:', error);
                this.colors = null;
            }
        }
    }
    
    applyColors() {
        if (this.colors) {
            // Apply main page colors
            if (this.colors.webMain) {
                if (this.colors.webMain.backgroundColor) {
                    document.documentElement.style.setProperty('--bg-color', this.colors.webMain.backgroundColor);
                }
                if (this.colors.webMain.textColor) {
                    document.documentElement.style.setProperty('--text-color', this.colors.webMain.textColor);
                }
            }
            
            // Store webImg colors for download sections
            if (this.colors.webImg && this.colors.webImg.backgroundColor) {
                document.documentElement.style.setProperty('--img-bg-color', this.colors.webImg.backgroundColor);
            }
        }
    }
    
    updatePageTitle() {
        const displayName = this.convertToTitleCase(this.templateName);
        const titleElement = document.getElementById('template-name');
        if (titleElement) {
            titleElement.textContent = 'Choose Variation to Download';
        }
        document.title = `${displayName} Variations`;
    }
    
    convertToTitleCase(snakeCaseString) {
        return snakeCaseString
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    createVariationGrid() {
        const grid = document.getElementById('variation-grid');
        
        if (this.variationCount === 0) {
            this.showError('No variations available for this template.');
            return;
        }
        
        // Clear loading state
        grid.innerHTML = '';
        
        // Create variation items (0-based numbering)
        for (let i = 0; i < this.variationCount; i++) {
            const variationItem = this.createVariationItem(i);
            grid.appendChild(variationItem);
        }
    }
    
    createVariationItem(variationNumber) {
        const item = document.createElement('div');
        item.className = 'variation-item';
        
        // SVG container
        const svgContainer = document.createElement('div');
        svgContainer.className = 'variation-svg-container';
        svgContainer.style.cursor = 'pointer';
        
        // Add click handler to the entire container for download
        svgContainer.addEventListener('click', () => {
            this.downloadVariation(variationNumber);
        });
        
        const svg = document.createElement('img');
        svg.className = 'variation-svg';
        svg.src = `generated/displayables/${this.templateName}_var${variationNumber}.svg`;
        svg.alt = `${this.templateName} variation ${variationNumber + 1}`;
        svg.style.pointerEvents = 'none'; // Prevent img from interfering with container click
        
        svgContainer.appendChild(svg);
        
        // Download section
        const downloadSection = document.createElement('div');
        downloadSection.className = 'download-section';
        
        const downloadButton = document.createElement('button');
        downloadButton.className = 'download-button';
        downloadButton.textContent = 'Download';
        downloadButton.addEventListener('click', () => {
            this.downloadVariation(variationNumber);
        });
        
        downloadSection.appendChild(downloadButton);
        
        item.appendChild(svgContainer);
        item.appendChild(downloadSection);
        
        return item;
    }
    
    async downloadVariation(variationNumber) {
        try {
            const filename = `${this.templateName}_var${variationNumber}.svg`;
            const downloadPath = `generated/downloadables/${filename}`;
            
            // Fetch the SVG content
            const response = await fetch(downloadPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filename}`);
            }
            
            const svgContent = await response.text();
            
            // Remove the warning using the imported function
            const warningRegex = /<!--[\s]*?WARNING: AUTO-GENERATED FILE - START[\s\S]*?WARNING: AUTO-GENERATED FILE - END[\s]*?-->/g;
            const cleanedSvgContent = removeWarningFromSvg(svgContent, warningRegex);
            
            // Download the cleaned SVG
            downloadContent(cleanedSvgContent, 'DoorSign.svg', 'image/svg+xml');
            
            // Provide user feedback
            this.showDownloadFeedback(variationNumber);
            
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download the file. Please try again.');
        }
    }
    
    showDownloadFeedback(variationNumber) {
        // Temporarily change button text to show success
        const button = document.querySelector(`[onclick*="downloadVariation(${variationNumber})"]`);
        if (button) {
            const originalText = button.textContent;
            button.textContent = '✓ Downloaded!';
            button.style.background = '#27ae60';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        }
    }
    
    showError(message) {
        const grid = document.getElementById('variation-grid');
        grid.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Show loading state
    const grid = document.getElementById('variation-grid');
    grid.innerHTML = '<div class="loading">Loading variations...</div>';
    
    // Initialize variation manager
    window.variationManager = new VariationManager();
}); 