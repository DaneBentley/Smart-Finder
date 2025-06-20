/**
 * Navigation Manager - Handles moving between search matches
 */

export class NavigationManager {
  constructor() {
    this.currentIndex = -1;
    this.totalMatches = 0;
  }
  
  reset() {
    this.currentIndex = -1;
    this.totalMatches = 0;
  }
  
  setMatches(matchCount) {
    this.totalMatches = matchCount;
    if (matchCount > 0 && this.currentIndex === -1) {
      this.currentIndex = 0;
    } else if (matchCount === 0) {
      this.currentIndex = -1;
    }
  }
  
  findNext() {
    if (this.totalMatches === 0) return this.currentIndex;
    
    this.currentIndex = (this.currentIndex + 1) % this.totalMatches;
    return this.currentIndex;
  }
  
  findPrevious() {
    if (this.totalMatches === 0) return this.currentIndex;
    
    this.currentIndex = this.currentIndex <= 0 ? this.totalMatches - 1 : this.currentIndex - 1;
    return this.currentIndex;
  }
  
  jumpToMatch(index) {
    if (index >= 0 && index < this.totalMatches) {
      this.currentIndex = index;
    }
    return this.currentIndex;
  }
  
  getCurrentIndex() {
    return this.currentIndex;
  }
  
  getTotalMatches() {
    return this.totalMatches;
  }
  
  hasMatches() {
    return this.totalMatches > 0;
  }
  
  getCurrentPosition() {
    return {
      current: this.currentIndex + 1,
      total: this.totalMatches
    };
  }
} 