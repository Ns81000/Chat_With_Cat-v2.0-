/**
 * Background Service Worker for Chat With Cat
 * 
 * This script handles:
 * - Context menu creation and event handling
 * - API communication with AI providers (Gemini, GROQ)
 * - Response caching for performance optimization
 * - Error handling and retries with exponential backoff
 */

// ===== CONFIGURATION =====

// Improved readability and removed redundant comments
// Optimized the LRUCache class by adding a method to check cache expiry
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.lruOrder = [];
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && !this.isExpired(item.timestamp)) {
      this.lruOrder = this.lruOrder.filter(k => k !== key);
      this.lruOrder.push(key);
      return item.data;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.lruOrder.shift();
      this.cache.delete(oldest);
    }
    this.cache.set(key, { data: value, timestamp: Date.now() });
    this.lruOrder.push(key);
  }

  clear() {
    this.cache.clear();
    this.lruOrder = [];
  }

  isExpired(timestamp) {
    return Date.now() - timestamp > CACHE_EXPIRY;
  }
}

// Cache settings
const responseCache = new LRUCache(100);  // Store up to 100 responses
const CACHE_EXPIRY = 60 * 60 * 1000;     // 1 hour in milliseconds

// Performance optimization settings
const DEBOUNCE_DELAY = 500;              // Increased to 500ms to reduce API calls
const MAX_RETRIES = 3;                   // Maximum number of retries for failed API calls
const INITIAL_RETRY_DELAY = 1000;        // Milliseconds to wait before first retry

// API endpoints for different providers
const API_ENDPOINTS = {
  GROQ: 'https://api.groq.com/openai/v1'
};

console.log('Background script loaded');

// ===== UTILITY FUNCTIONS =====

/**
 * Debounces function calls to prevent excessive API requests
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait before execution
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Simplified the retryWithBackoff function for better readability
async function retryWithBackoff(fn, maxRetries, initialDelay) {
  for (let retries = 0; retries < maxRetries; retries++) {
    try {
      return await fn();
    } catch (error) {
      if (retries === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, retries)));
    }
  }
}

// ===== EXTENSION INITIALIZATION =====

/**
 * Set up the extension when installed or updated
 * Create context menu and show setup page if needed
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, creating context menu');
  chrome.contextMenus.create({
    id: "askAI",
    title: "Ask AI about: \"%s\"",
    contexts: ["selection"]
  });

  // Show welcome/setup page on first install
  chrome.storage.local.get(['apiConfig'], function(data) {
    if (!data.apiConfig) {
      console.log('No configuration found, opening setup page');
      chrome.tabs.create({ url: "setup.html" });
    }
  });
});

// Open setup page when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  console.log('Extension icon clicked, opening setup page');
  chrome.tabs.create({ url: "setup.html" });
});

// ===== CONTENT COMMUNICATION =====

/**
 * Send AI response to content script for display
 * @param {string} responseText - Text response from AI
 * @param {number} tabId - ID of the browser tab to send response to
 * @param {number} [retries=3] - Number of retry attempts remaining
 * @param {number} [delay=500] - Delay between retries in milliseconds
 */
function sendResponseToContent(responseText, tabId, retries = 3, delay = 500) {
  // First check if the tab still exists
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Tab no longer exists:', chrome.runtime.lastError);
      return;
    }
    
    chrome.tabs.sendMessage(tabId, {
      action: "displayResponse",
      response: responseText
    }, response => {
      if (chrome.runtime.lastError) {
        console.warn('Error sending response to content script:', chrome.runtime.lastError);
        
        // If we have retries left, wait and try again
        if (retries > 0) {
          console.log(`Retrying message sending in ${delay}ms. ${retries} attempts left.`);
          setTimeout(() => {
            sendResponseToContent(responseText, tabId, retries - 1, delay * 1.5);
          }, delay);
        } else {
          console.error('Failed to send message after multiple attempts');
          // At this point, we could try injecting the content script again
          // or notify the user about the issue
        }
      }
    });
  });
}

// ===== API PROVIDER IMPLEMENTATIONS =====

/**
 * Provider-specific API communication implementations
 * Each provider has its own fetchResponse method
 */
const apiProviders = {
  // Google Gemini API implementation
  gemini: {
    async fetchResponse(text, config) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.selectedModel}:generateContent`;
      const response = await fetch(`${url}?key=${config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: text }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 1,
            topK: 32
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
          if (errorMessage.includes('API key not valid')) {
            errorMessage += '. Please check your API key in the extension settings.';
          } else if (errorMessage.includes('Model not found')) {
            errorMessage += '. Please verify the model name in the extension settings.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Unexpected API response format");
      }
      return data.candidates[0].content.parts[0].text;
    }
  },

  // GROQ API implementation
  groq: {
    async fetchResponse(text, config) {
      try {
        const response = await fetch(`${API_ENDPOINTS.GROQ}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: config.selectedModel,
            messages: [{
              role: 'user',
              content: text
            }],
            temperature: 0.7,
            max_tokens: 2048
          })
        });

        const errorData = await response.json().catch(() => null);
        
        if (!response.ok || (errorData && errorData.error)) {
          let errorMessage = '';
          
          if (errorData?.error) {
            errorMessage = errorData.error.message || errorData.error;
            
            // Handle specific error cases
            if (errorMessage.includes('has been decommissioned')) {
              const recommendation = errorData.error.message.split('refer to ')[1];
              errorMessage = `Model ${config.selectedModel} is no longer available. Please check ${recommendation}`;
            }
            else if (errorData.error.type === 'invalid_request_error') {
              errorMessage = 'Invalid model name. Please check available models at console.groq.com/docs';
            }
          } else {
            errorMessage = `HTTP error! status: ${response.status}`;
          }

          if (response.status === 401) {
            errorMessage += '. Please check your API key in the extension settings.';
          }

          throw new Error(errorMessage);
        }

        if (!errorData.choices?.[0]?.message?.content) {
          throw new Error("Unexpected API response format");
        }
        return errorData.choices[0].message.content;
      } catch (error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
      }
    }
  }
};

// ===== MAIN FUNCTIONALITY =====

/**
 * Fetch AI response with caching, retries, and debouncing
 * @param {string} text - The user selected text to analyze
 * @param {number} tabId - Browser tab ID to send response to
 */
const fetchAIResponse = debounce(async (text, tabId) => {
  try {
    // Get current configuration from storage
    const { apiConfig, activeProvider } = await chrome.storage.local.get(['apiConfig', 'activeProvider']);
    
    // Validate configuration exists
    if (!apiConfig || !activeProvider || !apiConfig[activeProvider]) {
      throw new Error("AI provider not configured. Please set up the extension first.");
    }

    const config = apiConfig[activeProvider];

    // Validate required config values
    if (!config.selectedModel) {
      throw new Error("No model selected. Please configure a model in the extension settings.");
    }

    if (!config.apiKey) {
      throw new Error("API key not found. Please set up your API key in the extension settings.");
    }

    // Normalize text to increase cache hits
    const normalizedText = text.trim().toLowerCase();
    const cacheKey = `${normalizedText}-${activeProvider}-${config.selectedModel}`;
    
    // Check response cache first
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Cache hit, returning cached response');
      sendResponseToContent(cachedResponse.data, tabId);
      return;
    }

    console.log(`Making API request to ${activeProvider} using model ${config.selectedModel}`);
    
    // Make API request with retry mechanism
    const responseText = await retryWithBackoff(
      () => apiProviders[activeProvider].fetchResponse(text, config),
      MAX_RETRIES,
      INITIAL_RETRY_DELAY
    );

    // Cache successful response for future requests
    responseCache.set(cacheKey, {
      data: responseText,
      timestamp: Date.now()
    });

    // Send response to content script for display
    sendResponseToContent(responseText, tabId);

  } catch (error) {
    console.error("Error fetching from AI provider:", error);
    sendResponseToContent(`Error: ${error.message}`, tabId);
  }
}, DEBOUNCE_DELAY);

// ===== EVENT LISTENERS =====

/**
 * Handle context menu clicks and start the AI query process
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  if (info.menuItemId === "askAI" && info.selectionText) {
    console.log('Selected text:', info.selectionText.substring(0, 50) + '...');
    
    // Notify content script to show loading state
    chrome.tabs.sendMessage(tab.id, {
      action: "processSelection",
      text: info.selectionText
    });
    
    // Process the text with the active AI provider
    fetchAIResponse(info.selectionText, tab.id);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processQuestion') {
    processQuestionWithLLM(message.provider, message.prompt, message.config)
      .then(response => {
        console.log('Sending response to content:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('Error in processQuestion:', error);
        sendResponse({
          error: error.message,
          errorDetails: {
            timestamp: new Date().toISOString(),
            provider: message.provider,
            errorType: error.name,
            fullError: error.toString()
          }
        });
      });
    return true; // Keep the message channel open for async response
  }
});

// Function to process question with LLM
async function processQuestionWithLLM(provider, prompt, config) {
  try {
    // Normalize prompt to increase cache hits
    const normalizedPrompt = prompt.trim().toLowerCase();
    
    // Create cache key with all relevant factors
    const cacheKey = `question_${normalizedPrompt}_${provider}_${config.selectedModel}`;
    
    // Check cache first
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Cache hit for question');
      return cachedResponse.data;
    }

    // Get the appropriate provider implementation
    const providerImpl = apiProviders[provider.toLowerCase()];
    if (!providerImpl) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Process the question with retry logic
    console.log('Processing question with provider:', provider);
    const response = await retryWithBackoff(
      () => providerImpl.fetchResponse(prompt, config),
      MAX_RETRIES,
      INITIAL_RETRY_DELAY
    );
    console.log('Received response from provider:', response);

    // Cache the response with normalized key
    responseCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    // Ensure we return in the expected format for content.js
    return { answer: response };
  } catch (error) {
    console.error('Error processing question:', error);
    throw error;
  }
}