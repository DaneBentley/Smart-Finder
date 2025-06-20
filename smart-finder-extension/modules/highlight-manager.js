/**
 * Highlight Manager - Handles creating and managing text highlights with performance optimizations
 */

export class HighlightManager {
  constructor() {
    this.highlightElements = [];
    this.maxVisibleHighlights = 10000; // Limit visible highlights for performance
    this.batchSize = 100; // Process highlights in batches
  }
  
  getColorIndex(range, termToColorMap, caseSensitive, useRegex, text = null) {
    if (!termToColorMap) return null;
    
    // Handle AI search case (termToColorMap is a simple object)
    if (termToColorMap.ai) {
      return 'ai'; // Return special AI identifier
    }
    
    if (useRegex && range._regexPattern !== undefined) {
      // For regex patterns, use the pattern index
      return (range._patternIndex % 5) + 1;
    } else if (text || range.toString()) {
      // For text matching, find the matching term
      const matchText = text || range.toString();
      const searchText = caseSensitive ? matchText : matchText.toLowerCase();
      
      // Handle Map or array of arrays
      try {
        for (const [term, termColorIndex] of termToColorMap) {
          const searchTerm = caseSensitive ? term : term.toLowerCase();
          if (searchText === searchTerm) {
            return termColorIndex;
          }
        }
      } catch (error) {
        // If termToColorMap is not iterable, skip color indexing
        return null;
      }
    }
    
    return null;
  }
  
  createHighlightElement(range, index, currentIndex, termToColorMap, caseSensitive, useRegex, text = null) {
    const highlight = document.createElement('span');
          highlight.className = 'smart-finder-highlight';
    
    // Add multi-term color class if applicable
    const colorIndex = this.getColorIndex(range, termToColorMap, caseSensitive, useRegex, text);
    if (colorIndex) {
      if (colorIndex === 'ai') {
        highlight.classList.add('multi-term-4'); // Use blue color for consistency
      } else {
        highlight.classList.add(`multi-term-${colorIndex}`);
      }
    }
    
    if (index === currentIndex) {
      highlight.classList.add('current');
    }
    
    return highlight;
  }
  
  async highlightMatches(matches, currentIndex, termToColorMap, caseSensitive, useRegex = false) {
    this.clearHighlights();
    
    // Limit the number of highlights for performance
    const limitedMatches = matches.slice(0, this.maxVisibleHighlights);
    if (matches.length > this.maxVisibleHighlights) {
      console.warn(`Limited highlights to ${this.maxVisibleHighlights} out of ${matches.length} matches for performance`);
    }
    
    // Process highlights in batches to prevent freezing
    for (let i = 0; i < limitedMatches.length; i += this.batchSize) {
      const batch = limitedMatches.slice(i, i + this.batchSize);
      await this.highlightBatch(batch, i, currentIndex, termToColorMap, caseSensitive, useRegex);
      
      // Yield control to the main thread between batches
      if (i + this.batchSize < limitedMatches.length) {
        await this.yieldControl();
      }
    }
  }

  async highlightBatch(batch, startIndex, currentIndex, termToColorMap, caseSensitive, useRegex) {
    batch.forEach((range, batchIndex) => {
      const index = startIndex + batchIndex;
      try {
        // Create highlight element
        const highlight = this.createHighlightElement(range, index, currentIndex, termToColorMap, caseSensitive, useRegex);
        
        // Use surroundContents like Chrome's native implementation
        range.surroundContents(highlight);
        this.highlightElements.push(highlight);
      } catch (error) {
        // Fallback for complex ranges
        try {
          const contents = range.extractContents();
          const highlight = this.createHighlightElement(range, index, currentIndex, termToColorMap, caseSensitive, useRegex, contents.textContent);
          
          highlight.appendChild(contents);
          range.insertNode(highlight);
          this.highlightElements.push(highlight);
        } catch (fallbackError) {
          console.warn('Could not highlight range:', fallbackError);
        }
      }
    });
  }

  async addMatches(newMatches, termToColorMap, caseSensitive = false, useRegex = false) {
    // Add new highlights without clearing existing ones
    const startIndex = this.highlightElements.length;
    
    // Limit total highlights
    const remainingSlots = this.maxVisibleHighlights - this.highlightElements.length;
    const limitedMatches = newMatches.slice(0, Math.max(0, remainingSlots));
    
    if (remainingSlots <= 0) {
      console.warn('Cannot add more highlights - maximum limit reached for performance');
      return;
    }
    
    if (newMatches.length > limitedMatches.length) {
      console.warn(`Limited new highlights to ${limitedMatches.length} out of ${newMatches.length} for performance`);
    }
    
    // Process in batches
    for (let i = 0; i < limitedMatches.length; i += this.batchSize) {
      const batch = limitedMatches.slice(i, i + this.batchSize);
      await this.addBatch(batch, startIndex + i, termToColorMap, caseSensitive, useRegex);
      
      // Yield control between batches
      if (i + this.batchSize < limitedMatches.length) {
        await this.yieldControl();
      }
    }
  }
  
  async highlightNewMatches(newMatches, termToColorMap, caseSensitive = false, useRegex = false) {
    // Wrapper around addMatches for semantic clarity
    return this.addMatches(newMatches, termToColorMap, caseSensitive, useRegex);
  }

  async addBatch(batch, startIndex, termToColorMap, caseSensitive, useRegex) {
    batch.forEach((range, batchIndex) => {
      const index = startIndex + batchIndex;
      try {
        // Create highlight element with adjusted index
        const highlight = this.createHighlightElement(range, index, -1, termToColorMap, caseSensitive, useRegex);
        
        // Use surroundContents like Chrome's native implementation
        range.surroundContents(highlight);
        this.highlightElements.push(highlight);
      } catch (error) {
        // Fallback for complex ranges
        try {
          const contents = range.extractContents();
          const highlight = this.createHighlightElement(range, index, -1, termToColorMap, caseSensitive, useRegex, contents.textContent);
          
          highlight.appendChild(contents);
          range.insertNode(highlight);
          this.highlightElements.push(highlight);
        } catch (fallbackError) {
          console.warn('Could not highlight range:', fallbackError);
        }
      }
    });
  }

  async yieldControl() {
    // Yield control to the main thread to prevent freezing
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  
  async clearHighlights() {
    // Clear highlights in batches for better performance
    const batchSize = 200;
    
    for (let i = 0; i < this.highlightElements.length; i += batchSize) {
      const batch = this.highlightElements.slice(i, i + batchSize);
      
      batch.forEach(element => {
        const parent = element.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(element.textContent), element);
          parent.normalize(); // Merge adjacent text nodes
        }
      });
      
      // Yield control between batches of clearing
      if (i + batchSize < this.highlightElements.length) {
        await this.yieldControl();
      }
    }
    
    this.highlightElements = [];
  }
  
  updateCurrentHighlight(currentIndex) {
    this.highlightElements.forEach((element, index) => {
      if (index === currentIndex) {
        element.classList.add('current');
      } else {
        element.classList.remove('current');
      }
    });
  }
  
  scrollToCurrentMatch(currentIndex) {
    if (currentIndex >= 0 && currentIndex < this.highlightElements.length) {
      const element = this.highlightElements[currentIndex];
      
      // Check if element is already visible in viewport
      const rect = element.getBoundingClientRect();
      const isVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      if (!isVisible) {
        // Element is outside viewport - scroll to center (no smooth scrolling)
        element.scrollIntoView({
          behavior: 'auto',
          block: 'center',
          inline: 'nearest'
        });
      }
      // If element is already visible, don't scroll at all
    }
  }
  
  getHighlightElements() {
    return this.highlightElements;
  }
  
  getHighlightCount() {
    return this.highlightElements.length;
  }
} 