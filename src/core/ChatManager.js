/**
 * ChatManager - Centralized chat state and lifecycle management
 * Handles loading, initialization, and communication with side chat
 */
class ChatManager {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.chatInstance = null;
    this.communicationBridge = null;
    this.loadingPromise = null;
    
    // Bind methods to preserve context
    this.initialize = this.initialize.bind(this);
    this.toggle = this.toggle.bind(this);
    this.isAvailable = this.isAvailable.bind(this);
  }
  
  /**
   * Check if chat is available and ready
   */
  isAvailable() {
    return this.isInitialized && 
           this.chatInstance && 
           typeof this.chatInstance.toggle === 'function';
  }
  
  /**
   * Initialize the side chat system
   */
  async initialize() {
    if (this.isInitialized && this.isAvailable()) {
      console.log('✅ ChatManager: Already initialized and available');
      return true;
    }
    
    if (this.isLoading && this.loadingPromise) {
      console.log('⏳ ChatManager: Already loading, waiting for completion');
      return await this.loadingPromise;
    }
    
    console.log('🚀 ChatManager: Starting initialization');
    this.isLoading = true;
    
    this.loadingPromise = this._performInitialization();
    
    try {
      const result = await this.loadingPromise;
      return result;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }
  
  /**
   * Perform the actual initialization
   */
  async _performInitialization() {
    try {
      // Check if already exists globally
      if (window.XandAISideChat) {
        console.log('✅ ChatManager: Found existing global instance');
        this.chatInstance = window.XandAISideChat;
        this.isInitialized = true;
        return true;
      }
      
      // Create communication bridge
      if (!this.communicationBridge) {
        this.communicationBridge = await this._createCommunicationBridge();
      }
      
      // Load CSS if not already loaded
      await this._loadCSS();
      
      // Load and execute JavaScript
      await this._loadJavaScript();
      
      // Wait for chat instance to be available
      const success = await this._waitForChatInstance();
      
      if (success) {
        this.isInitialized = true;
        console.log('✅ ChatManager: Initialization completed successfully');
        return true;
      } else {
        throw new Error('Chat instance not available after loading');
      }
      
    } catch (error) {
      console.error('❌ ChatManager: Initialization failed:', error);
      this.isInitialized = false;
      this.chatInstance = null;
      throw error;
    }
  }
  
  /**
   * Create communication bridge for the chat
   */
  async _createCommunicationBridge() {
    if (window.chromeExtensionBridge) {
      console.log('🔧 ChatManager: Communication bridge already exists');
      return window.chromeExtensionBridge;
    }
    
    console.log('🔧 ChatManager: Creating communication bridge');
    
    const bridge = {
      sendMessage: (message) => {
        return new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage(message, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      },
      
      getSettings: async () => {
        try {
          // Use the existing settings loader if available
          if (typeof loadSettingsRobustly === 'function') {
            const settings = await loadSettingsRobustly();
            return { success: true, settings };
          } else {
            // Fallback to direct chrome storage access
            return new Promise((resolve) => {
              chrome.storage.sync.get(['ollamaUrl', 'ollamaModel'], (result) => {
                resolve({ 
                  success: true, 
                  settings: {
                    ollamaUrl: result.ollamaUrl || 'http://localhost:11434',
                    ollamaModel: result.ollamaModel || ''
                  }
                });
              });
            });
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    };
    
    window.chromeExtensionBridge = bridge;
    return bridge;
  }
  
  /**
   * Load CSS for the side chat
   */
  async _loadCSS() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector('link[href*="sidechat.css"]')) {
        console.log('📝 ChatManager: CSS already loaded');
        resolve();
        return;
      }
      
      console.log('📝 ChatManager: Loading CSS');
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = chrome.runtime.getURL('src/ui/sidechat.css');
      cssLink.onload = () => {
        console.log('✅ ChatManager: CSS loaded successfully');
        resolve();
      };
      cssLink.onerror = (error) => {
        console.error('❌ ChatManager: CSS loading failed:', error);
        reject(new Error('Failed to load CSS'));
      };
      
      document.head.appendChild(cssLink);
    });
  }
  
  /**
   * Load JavaScript for the side chat
   */
  async _loadJavaScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector('script[src*="SideChat.js"]')) {
        console.log('📦 ChatManager: JavaScript already loaded');
        resolve();
        return;
      }
      
      console.log('📦 ChatManager: Loading JavaScript');
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('src/ui/SideChat.js');
      script.onload = () => {
        console.log('✅ ChatManager: JavaScript loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('❌ ChatManager: JavaScript loading failed:', error);
        reject(new Error('Failed to load JavaScript'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Wait for chat instance to become available
   */
  async _waitForChatInstance(maxAttempts = 50, intervalMs = 100) {
    console.log('⏳ ChatManager: Waiting for chat instance');
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (window.XandAISideChat) {
        this.chatInstance = window.XandAISideChat;
        console.log(`✅ ChatManager: Chat instance found after ${attempt + 1} attempts`);
        return true;
      }
      
      if (attempt % 10 === 0) {
        console.log(`⏳ ChatManager: Still waiting... (attempt ${attempt + 1}/${maxAttempts})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    console.error('❌ ChatManager: Chat instance not found after maximum attempts');
    return false;
  }
  
  /**
   * Toggle the side chat
   */
  async toggle() {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        console.log('🔄 ChatManager: Not initialized, initializing now');
        const success = await this.initialize();
        if (!success) {
          throw new Error('Failed to initialize chat');
        }
      }
      
      // Double-check availability
      if (!this.isAvailable()) {
        throw new Error('Chat instance not available');
      }
      
      console.log('🔄 ChatManager: Toggling chat');
      await this.chatInstance.toggle();
      console.log('✅ ChatManager: Chat toggled successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ ChatManager: Toggle failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reset the chat manager (for debugging/recovery)
   */
  reset() {
    console.log('🔄 ChatManager: Resetting state');
    this.isInitialized = false;
    this.isLoading = false;
    this.chatInstance = null;
    this.loadingPromise = null;
    
    // Don't reset the bridge as it might be used by other components
  }
  
  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      isAvailable: this.isAvailable(),
      hasChatInstance: !!this.chatInstance,
      hasBridge: !!this.communicationBridge,
      globalInstanceExists: !!window.XandAISideChat
    };
  }
}

// Export for use in content script
window.ChatManager = ChatManager;
