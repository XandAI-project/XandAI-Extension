/**
 * SideChat - Modern side chat implementation with proper error handling
 * Designed to work with ChatManager for reliable initialization
 */

// Prevent multiple initializations
if (typeof window.XandAISideChatLoaded === 'undefined') {
  window.XandAISideChatLoaded = true;
  
  console.log('🚀 SideChat: Starting initialization');

class SideChat {
  constructor() {
    console.log('🔧 SideChat: Constructor called');
    
    // Initialize state
    this.isOpen = false;
    this.messages = [];
    this.isStreaming = false;
    this.includePageContext = false;
    this.pageContent = '';
    this.abortController = null;
    this.container = null;
    this.isInitialized = false;
    
    // Start initialization
    this.initializeAsync();
  }
  
  /**
   * Async initialization to handle bridge dependency
   */
  async initializeAsync() {
    try {
      // Wait for bridge to be available
      await this.waitForBridge();
      
      // Initialize chat UI and functionality
      this.initializeChat();
      
      this.isInitialized = true;
      console.log('✅ SideChat: Initialization completed');
      
    } catch (error) {
      console.error('❌ SideChat: Initialization failed:', error);
    }
  }
  
  /**
   * Wait for communication bridge to be available
   */
  async waitForBridge(maxAttempts = 30, intervalMs = 100) {
    console.log('⏳ SideChat: Waiting for communication bridge');
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (window.chromeExtensionBridge) {
        console.log(`✅ SideChat: Bridge found after ${attempt + 1} attempts`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    console.warn('⚠️ SideChat: Bridge not found, will use fallback methods');
  }
  
  /**
   * Initialize chat UI and functionality
   */
  initializeChat() {
    console.log('🔧 SideChat: Initializing chat components');
    
    // Create chat container
    this.createChatUI();
    
    // Load saved settings
    this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load chat history from storage
    this.loadChatHistory();
  }
  
  /**
   * Create the chat UI elements
   */
  createChatUI() {
    // Remove existing container if any
    const existingContainer = document.getElementById('xandai-side-chat');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    console.log('🎨 SideChat: Creating UI elements');
    
    const chatContainer = document.createElement('div');
    chatContainer.id = 'xandai-side-chat';
    chatContainer.className = 'xandai-side-chat';
    chatContainer.innerHTML = `
      <div class="chat-header">
        <h3>💬 XandAI Chat</h3>
        <div class="chat-controls">
          <button class="chat-clear" title="Clear chat">🗑️</button>
          <button class="chat-close" title="Close chat">✖️</button>
        </div>
      </div>
      
      <div class="chat-settings">
        <label class="toggle-label">
          <input type="checkbox" id="include-page-context" />
          <span>Include page content in messages</span>
        </label>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="chat-welcome">
          Welcome to XandAI Chat! 👋<br>
          Start a conversation with your local AI assistant.
        </div>
      </div>
      
      <div class="chat-input-container">
        <textarea 
          id="chat-input" 
          class="chat-input" 
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          rows="3"
        ></textarea>
        <button id="chat-send" class="chat-send" disabled>
          <span class="send-icon">➤</span>
          <span class="loading-icon" style="display: none;">⏳</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(chatContainer);
    
    // Store references to key elements
    this.container = chatContainer;
    this.messagesContainer = chatContainer.querySelector('#chat-messages');
    this.input = chatContainer.querySelector('#chat-input');
    this.sendButton = chatContainer.querySelector('#chat-send');
    this.clearButton = chatContainer.querySelector('.chat-clear');
    this.closeButton = chatContainer.querySelector('.chat-close');
    this.contextToggle = chatContainer.querySelector('#include-page-context');
    
    console.log('✅ SideChat: UI elements created');
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    console.log('🔧 SideChat: Setting up event listeners');
    
    // Send button
    this.sendButton.addEventListener('click', () => this.sendMessage());
    
    // Input field
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.input.addEventListener('input', () => {
      this.updateSendButtonState();
    });
    
    // Control buttons
    this.clearButton.addEventListener('click', () => this.clearChat());
    this.closeButton.addEventListener('click', () => this.close());
    
    // Settings
    this.contextToggle.addEventListener('change', () => {
      this.includePageContext = this.contextToggle.checked;
      this.saveSettings();
      
      if (this.includePageContext) {
        this.capturePageContent();
      }
    });
  }
  
  /**
   * Update send button state based on input and streaming status
   */
  updateSendButtonState() {
    const hasText = this.input.value.trim().length > 0;
    this.sendButton.disabled = !hasText || this.isStreaming;
  }
  
  /**
   * Open the chat
   */
  open() {
    console.log('🔓 SideChat: Opening chat');
    this.container.classList.add('open');
    this.isOpen = true;
    
    // Focus input after a short delay
    setTimeout(() => {
      if (this.input) {
        this.input.focus();
      }
    }, 300);
  }
  
  /**
   * Close the chat
   */
  close() {
    console.log('🔒 SideChat: Closing chat');
    this.container.classList.remove('open');
    this.isOpen = false;
  }
  
  /**
   * Toggle chat open/close state
   */
  async toggle() {
    console.log('🔄 SideChat: Toggling chat state');
    
    // Wait for initialization if needed
    if (!this.isInitialized) {
      console.log('⏳ SideChat: Waiting for initialization');
      let attempts = 0;
      while (!this.isInitialized && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!this.isInitialized) {
        throw new Error('SideChat not properly initialized');
      }
    }
    
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Send a message to the AI
   */
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isStreaming) return;
    
    console.log('📤 SideChat: Sending message');
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMessage);
    this.renderMessages();
    
    // Clear input and update UI
    this.input.value = '';
    this.updateSendButtonState();
    this.isStreaming = true;
    
    // Show loading state
    this.sendButton.querySelector('.send-icon').style.display = 'none';
    this.sendButton.querySelector('.loading-icon').style.display = 'inline';
    
    try {
      // Get settings
      const settings = await this.getSettings();
      
      // Prepare messages for API
      const apiMessages = this.prepareMessagesForAPI();
      
      // Create assistant message placeholder
      const assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };
      this.messages.push(assistantMessage);
      
      // Add message element to UI
      const messageEl = this.createMessageElement(assistantMessage);
      this.messagesContainer.appendChild(messageEl);
      const contentEl = messageEl.querySelector('.message-content');
      
      // Stream response
      await this.streamResponse(settings, apiMessages, (chunk) => {
        assistantMessage.content += chunk;
        contentEl.innerHTML = this.formatMessage(assistantMessage.content);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      });
      
      // Save chat history
      this.saveChatHistory();
      
    } catch (error) {
      console.error('❌ SideChat: Error sending message:', error);
      this.addSystemMessage(`Error: ${error.message}`);
    } finally {
      this.isStreaming = false;
      this.updateSendButtonState();
      this.sendButton.querySelector('.send-icon').style.display = 'inline';
      this.sendButton.querySelector('.loading-icon').style.display = 'none';
    }
  }
  
  /**
   * Stream response from AI
   */
  async streamResponse(settings, messages, onChunk) {
    const { ollamaUrl, ollamaModel } = settings;
    
    if (!ollamaModel) {
      throw new Error('No model selected. Please select a model in settings.');
    }
    
    this.abortController = new AbortController();
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: messages,
        stream: true
      }),
      signal: this.abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message && data.message.content) {
                onChunk(data.message.content);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * Prepare messages for API call
   */
  prepareMessagesForAPI() {
    const messages = [{
      role: 'system',
      content: this.includePageContext ? 
        `You are a helpful AI assistant. Here is the current page content for context:\n\n${this.pageContent}` :
        'You are a helpful AI assistant.'
    }];
    
    // Add recent conversation history (last 10 exchanges)
    const recentMessages = this.messages.slice(-20);
    recentMessages.forEach(msg => {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });
    
    return messages;
  }
  
  /**
   * Get settings via communication bridge
   */
  async getSettings() {
    try {
      if (window.chromeExtensionBridge && window.chromeExtensionBridge.getSettings) {
        const result = await window.chromeExtensionBridge.getSettings();
        if (result.success) {
          return result.settings;
        } else {
          throw new Error(result.error || 'Failed to get settings');
        }
      }
      
      // Fallback to direct messaging
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.settings);
          } else {
            reject(new Error('Failed to get settings'));
          }
        });
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }
  
  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const response = await this.sendMessageToBackground('getStorage', { keys: ['sideChatSettings'] });
      if (response && response.sideChatSettings) {
        this.includePageContext = response.sideChatSettings.includePageContext || false;
        this.contextToggle.checked = this.includePageContext;
        
        if (this.includePageContext) {
          this.capturePageContent();
        }
      }
    } catch (error) {
      console.warn('Could not load settings:', error);
    }
  }
  
  /**
   * Save settings to storage
   */
  saveSettings() {
    try {
      this.sendMessageToBackground('setStorage', {
        sideChatSettings: {
          includePageContext: this.includePageContext
        }
      });
    } catch (error) {
      console.warn('Could not save settings:', error);
    }
  }
  
  /**
   * Load chat history from storage
   */
  async loadChatHistory() {
    try {
      const response = await this.sendMessageToBackground('getStorage', { keys: ['sideChatHistory'] });
      if (response && response.sideChatHistory && response.sideChatHistory.length > 0) {
        this.messages = response.sideChatHistory;
        this.renderMessages();
      }
    } catch (error) {
      console.warn('Could not load chat history:', error);
      this.messages = [];
    }
  }
  
  /**
   * Save chat history to storage
   */
  saveChatHistory() {
    try {
      const messagesToSave = this.messages.slice(-50);
      this.sendMessageToBackground('setStorage', { sideChatHistory: messagesToSave });
    } catch (error) {
      console.warn('Could not save chat history:', error);
    }
  }
  
  /**
   * Send message to background script
   */
  async sendMessageToBackground(action, data) {
    try {
      if (window.chromeExtensionBridge && window.chromeExtensionBridge.sendMessage) {
        return await window.chromeExtensionBridge.sendMessage({ action, data });
      }
      
      // Fallback to direct chrome API
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, data }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('Error in sendMessageToBackground:', error);
      throw error;
    }
  }
  
  /**
   * Capture current page content
   */
  capturePageContent() {
    try {
      const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
      let content = '';
      
      if (mainContent) {
        content = mainContent.innerText.trim();
      } else {
        content = document.body.innerText.trim();
      }
      
      // Limit content length
      const maxLength = 3000;
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
      }
      
      this.pageContent = content;
    } catch (error) {
      console.error('Error capturing page content:', error);
      this.pageContent = '';
    }
  }
  
  /**
   * Clear chat history
   */
  clearChat() {
    if (confirm('Clear all chat history?')) {
      this.messages = [];
      this.renderMessages();
      this.sendMessageToBackground('setStorage', { sideChatHistory: [] });
      this.addSystemMessage('Chat history cleared.');
    }
  }
  
  /**
   * Add system message
   */
  addSystemMessage(text) {
    const message = {
      role: 'system',
      content: text,
      timestamp: new Date().toISOString()
    };
    this.messages.push(message);
    this.renderMessages();
  }
  
  /**
   * Render all messages
   */
  renderMessages() {
    if (this.messages.length > 0) {
      const welcome = this.messagesContainer.querySelector('.chat-welcome');
      if (welcome) welcome.remove();
    }
    
    // Clear existing messages
    const existingMessages = this.messagesContainer.querySelectorAll('.chat-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Render all messages
    this.messages.forEach(message => {
      const messageEl = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageEl);
    });
    
    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  /**
   * Create message element
   */
  createMessageElement(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.role}`;
    
    const icon = message.role === 'user' ? '👤' : 
                 message.role === 'assistant' ? '🤖' : 'ℹ️';
    
    messageEl.innerHTML = `
      <div class="message-header">
        <span class="message-icon">${icon}</span>
        <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${this.formatMessage(message.content)}</div>
    `;
    
    return messageEl;
  }
  
  /**
   * Format message content
   */
  formatMessage(content) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}

// Create and export instance only if not already exists
if (!window.XandAISideChat) {
  console.log('🚀 SideChat: Creating instance');
  const sideChat = new SideChat();
  window.XandAISideChat = sideChat;
  console.log('✅ SideChat: Instance created and exported');
} else {
  console.log('♻️ SideChat: Instance already exists, skipping creation');
}

} else {
  console.log('♻️ SideChat: Already loaded, skipping initialization');
}
