/**
 * Pattern Detector - Automatically converts common patterns to regex for AI mode
 * Makes it effortless for non-technical users to search for phone numbers, emails, etc.
 */

export class PatternDetector {
  constructor() {
    // Common patterns that users might want to search for
    this.patterns = {
      // Email patterns
      email: {
        keywords: ['email', 'e-mail', 'mail', '@'],
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        description: 'email addresses'
      },
      
      // Phone number patterns (various formats)
      phone: {
        keywords: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'number'],
        regex: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        description: 'phone numbers'
      },
      
      // URL patterns
      url: {
        keywords: ['url', 'link', 'website', 'http', 'https', 'www'],
        regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
        description: 'URLs'
      },
      
      // Enhanced Date patterns - covers many more formats
      date: {
        keywords: ['date', 'birthday', 'born', 'created', 'updated', 'expires', 'due', 'deadline', 'scheduled'],
        regex: /\b(?:(?:(?:0?[1-9]|1[0-2])[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(?:\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{2,4})|(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?)|(?:\d{1,2}[\/\-\.]\d{1,2})|(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?))\b/gi,
        description: 'dates'
      },
      
      // Time patterns (HH:MM, HH:MM AM/PM)
      time: {
        keywords: ['time', 'clock', 'hour', 'minute'],
        regex: /\b\d{1,2}:\d{2}(\s?(AM|PM|am|pm))?\b/g,
        description: 'times'
      },
      
      // Credit card patterns (basic)
      creditcard: {
        keywords: ['credit card', 'card number', 'visa', 'mastercard', 'amex'],
        regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        description: 'credit card numbers'
      },
      
      // Social Security Number patterns
      ssn: {
        keywords: ['ssn', 'social security', 'social security number'],
        regex: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        description: 'social security numbers'
      },
      
      // IP Address patterns
      ip: {
        keywords: ['ip', 'server', 'gateway'],
        regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        description: 'IP addresses'
      },
      
      // Enhanced ZIP code patterns - includes international postal codes
      zip: {
        keywords: ['zip', 'zip code', 'postal code', 'postcode'],
        regex: /\b(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d|[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}|\d{4,5})\b/g,
        description: 'ZIP codes and postal codes'
      },
      
      // Comprehensive Address patterns
      address: {
        keywords: ['address', 'street', 'avenue', 'road', 'drive', 'lane', 'blvd', 'boulevard', 'apt', 'suite', 'unit'],
        regex: /\b\d+\s+(?:[NSEW]\s+)?(?:[A-Za-z]+\s+)*(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Pl|Place|Way|Circle|Cir|Pkwy|Parkway|Ter|Terrace|Sq|Square|Broadway|Main|Oak|Elm|Park|First|Second|Third|Market|Center|Central|North|South|East|West)\.?(?:\s*,?\s*(?:#?\s*(?:Apt|Apartment|Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+)?)?/gi,
        description: 'street addresses'
      },
      
      // US States patterns
      state: {
        keywords: ['state', 'province'],
        regex: /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g,
        description: 'US states'
      },
      
      // Countries patterns (major countries)
      country: {
        keywords: ['country', 'nation'],
        regex: /\b(?:United States|USA|US|Canada|Mexico|United Kingdom|UK|England|Scotland|Wales|Ireland|France|Germany|Italy|Spain|Portugal|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Poland|Czech Republic|Hungary|Romania|Bulgaria|Greece|Turkey|Russia|China|Japan|South Korea|India|Australia|New Zealand|Brazil|Argentina|Chile|Colombia|Peru|South Africa|Egypt|Nigeria|Kenya|Morocco)\b/gi,
        description: 'countries'
      },
      
      // City patterns (common city indicators)
      city: {
        keywords: ['city', 'town', 'municipality'],
        regex: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:City|Town|Village|Borough|Township))\b/g,
        description: 'cities and towns'
      }
    };
  }
  
  /**
   * Detects if a search query matches common patterns and returns appropriate regex
   * @param {string} query - The search query
   * @returns {Object} - { isPattern: boolean, regex: string, description: string, originalQuery: string }
   */
  detectPattern(query) {
    if (!query || query.trim().length === 0) {
      return { isPattern: false };
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const matchedPatterns = [];
    
    // Check each pattern for matches
    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      // Check if any keywords match using word boundaries to avoid substring matches
      const hasKeyword = pattern.keywords.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        // Use word boundary regex to match whole words only
        const wordBoundaryRegex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        return wordBoundaryRegex.test(normalizedQuery);
      });
      
      if (hasKeyword) {
        matchedPatterns.push({
          name: patternName,
          regex: pattern.regex.source,
          regexFlags: pattern.regex.flags,
          description: pattern.description
        });
      }
    }
    
    // If multiple patterns found, return them as separate quoted terms for multi-color highlighting
    if (matchedPatterns.length > 1) {
      const descriptions = matchedPatterns.map(p => p.description).join(' and ');
      // Use quotes to separate regex patterns so they parse correctly
      const quotedPatterns = matchedPatterns.map(p => `"${p.regex}"`).join(' ');
      
      return {
        isPattern: true,
        isMultiPattern: true,
        regex: quotedPatterns,
        regexFlags: 'g',
        description: descriptions,
        originalQuery: query,
        patternName: 'multi-pattern',
        matchedPatterns: matchedPatterns
      };
    }
    
    // Single pattern match
    if (matchedPatterns.length === 1) {
      const pattern = matchedPatterns[0];
      return {
        isPattern: true,
        regex: pattern.regex,
        regexFlags: pattern.regexFlags,
        description: pattern.description,
        originalQuery: query,
        patternName: pattern.name
      };
    }
    
    // Check if the query itself looks like a pattern
    const directPatternMatch = this.checkDirectPattern(normalizedQuery);
    if (directPatternMatch) {
      return directPatternMatch;
    }
    
    return { isPattern: false };
  }
  
  /**
   * Check if the query itself looks like one of the patterns
   * @param {string} query - Normalized query
   * @returns {Object|null} - Pattern match or null
   */
  checkDirectPattern(query) {
    // Remove spaces and common separators for pattern matching
    const cleanQuery = query.replace(/[\s\-\.]/g, '');
    
    // Check if it looks like an email
    if (query.includes('@') && query.includes('.')) {
      return {
        isPattern: true,
        regex: this.patterns.email.regex.source,
        regexFlags: this.patterns.email.regex.flags,
        description: this.patterns.email.description,
        originalQuery: query,
        patternName: 'email'
      };
    }
    
    // Check if it looks like a phone number (10+ digits)
    if (/^\+?[\d\s\-\(\)\.]{10,}$/.test(query)) {
      return {
        isPattern: true,
        regex: this.patterns.phone.regex.source,
        regexFlags: this.patterns.phone.regex.flags,
        description: this.patterns.phone.description,
        originalQuery: query,
        patternName: 'phone'
      };
    }
    
    // Check if it looks like a URL
    if (query.startsWith('http') || query.startsWith('www.')) {
      return {
        isPattern: true,
        regex: this.patterns.url.regex.source,
        regexFlags: this.patterns.url.regex.flags,
        description: this.patterns.url.description,
        originalQuery: query,
        patternName: 'url'
      };
    }
    
    // Check if it looks like a date
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(query) || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(query)) {
      return {
        isPattern: true,
        regex: this.patterns.date.regex.source,
        regexFlags: this.patterns.date.regex.flags,
        description: this.patterns.date.description,
        originalQuery: query,
        patternName: 'date'
      };
    }
    
    return null;
  }
  
  /**
   * Get a user-friendly message about the detected pattern
   * @param {Object} patternResult - Result from detectPattern()
   * @returns {string} - User-friendly message
   */
  getPatternMessage(patternResult) {
    if (!patternResult.isPattern) {
      return '';
    }
    
    return `Searching for ${patternResult.description} using pattern detection`;
  }
} 