// Side Chat functionality for XandAI Extension
// Prevent redeclaration if already loaded
if (typeof SideChat === 'undefined') {
  
class SideChat {
  constructor() {
    console.log('🔧 SideChat constructor called');
    this.isOpen = false;
    this.messages = [];
    this.isStreaming = false;
    this.includePageContext = false;
    this.pageContent = '';
    this.abortController = null;
    
    // Wait for bridge to be available before initializing
    this.waitForBridge().then(() => {
      try {
        this.initializeChat();
        console.log('✅ SideChat initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing SideChat:', error);
      }
    });
  }
  
  async waitForBridge() {
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max wait
    
    while (attempts < maxAttempts) {
      if (window.chromeExtensionBridge) {
        console.log('✅ Chrome extension bridge found');
        return;
      }
      
      console.log(`⏳ Waiting for bridge (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.warn('⚠️ Bridge not found, will try fallback methods');
  }
  
  initializeChat() {
    // Create chat container
    this.createChatUI();
    
    // Load saved settings
    this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load chat history from storage
    this.loadChatHistory();
  }
  
  createChatUI() {
    // Create main container
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
          <span>Include page content in context</span>
        </label>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="chat-welcome">
          Welcome to XandAI Chat! 👋<br>
          Start a conversation or enable page context to interact with the current page.
        </div>
      </div>
      
      <div class="chat-input-container">
        <textarea 
          id="chat-input" 
          class="chat-input" 
          placeholder="Type your message..."
          rows="3"
        ></textarea>
        <button id="chat-send" class="chat-send" disabled>
          <span class="send-icon">➤</span>
          <span class="loading-icon" style="display: none;">⏳</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(chatContainer);
    
    // Store references
    this.container = chatContainer;
    this.messagesContainer = chatContainer.querySelector('#chat-messages');
    this.input = chatContainer.querySelector('#chat-input');
    this.sendButton = chatContainer.querySelector('#chat-send');
    this.clearButton = chatContainer.querySelector('.chat-clear');
    this.closeButton = chatContainer.querySelector('.chat-close');
    this.contextToggle = chatContainer.querySelector('#include-page-context');
  }
  
  setupEventListeners() {
    // Send button
    this.sendButton.addEventListener('click', () => this.sendMessage());
    
    // Enter key to send (Shift+Enter for new line)
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Enable/disable send button based on input
    this.input.addEventListener('input', () => {
      this.sendButton.disabled = !this.input.value.trim() || this.isStreaming;
    });
    
    // Clear chat
    this.clearButton.addEventListener('click', () => this.clearChat());
    
    // Close chat
    this.closeButton.addEventListener('click', () => this.close());
    
    // Context toggle
    this.contextToggle.addEventListener('change', (e) => {
      this.includePageContext = e.target.checked;
      this.saveSettings();
      
      if (this.includePageContext) {
        this.capturePageContent();
      }
    });
    
    // Listen for page content updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updatePageContent') {
        this.pageContent = request.content;
      }
    });
  }
  
  async loadSettings() {
    try {
      // Since we're in a content script context, we need to use messaging
      const response = await this.sendMessageToBackground('getStorage', { keys: ['sideChatSettings'] });
      if (response && response.sideChatSettings) {
        this.includePageContext = response.sideChatSettings.includePageContext || false;
        this.contextToggle.checked = this.includePageContext;
      }
    } catch (error) {
      console.warn('Could not load settings:', error);
      // Use defaults
      this.includePageContext = false;
      this.contextToggle.checked = false;
    }
  }
  
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
  
  async loadChatHistory() {
    try {
      const response = await this.sendMessageToBackground('getStorage', { keys: ['sideChatHistory'] });
      if (response && response.sideChatHistory && response.sideChatHistory.length > 0) {
        this.messages = response.sideChatHistory;
        this.renderMessages();
      }
    } catch (error) {
      console.warn('Could not load chat history:', error);
      // Start with empty history
      this.messages = [];
    }
  }
  
  saveChatHistory() {
    try {
      // Keep only last 50 messages
      const messagesToSave = this.messages.slice(-50);
      this.sendMessageToBackground('setStorage', { sideChatHistory: messagesToSave });
    } catch (error) {
      console.warn('Could not save chat history:', error);
    }
  }
  
  async sendMessageToBackground(action, data) {
    try {
      // Use the bridge provided by content script
      if (window.chromeExtensionBridge && window.chromeExtensionBridge.sendMessage) {
        return await window.chromeExtensionBridge.sendMessage({ action, data });
      }
      
      // Fallback to direct chrome API if available
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action, data }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      }
      
      throw new Error('Chrome runtime not available');
    } catch (error) {
      console.error('Error in sendMessageToBackground:', error);
      throw error;
    }
  }
  
  capturePageContent() {
    // Since we're already in the content script context, we can get the content directly
    try {
      // Get main content areas
      const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
      let content = '';
      
      if (mainContent) {
        content = mainContent.innerText.trim();
      } else {
        // Fallback to body content, but limit it
        content = document.body.innerText.trim();
      }
      
      // Limit content length to avoid overwhelming the model
      const maxLength = 3000;
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
      }
      
      this.pageContent = content;
      if (content) {
        this.addSystemMessage('Page content captured and will be included in the conversation context.');
      }
    } catch (error) {
      console.error('Error capturing page content:', error);
      this.addSystemMessage('Could not capture page content.');
    }
  }
  
  open() {
    this.container.classList.add('open');
    this.isOpen = true;
    this.input.focus();
    
    if (this.includePageContext) {
      this.capturePageContent();
    }
  }
  
  close() {
    this.container.classList.remove('open');
    this.isOpen = false;
  }
  
  async toggle() {
    // Wait for initialization if needed
    if (!this.container) {
      console.log('⏳ Waiting for side chat to be ready...');
      let attempts = 0;
      while (!this.container && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!this.container) {
        console.error('❌ Side chat failed to initialize');
        return;
      }
    }
    
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  clearChat() {
    if (confirm('Clear all chat history?')) {
      this.messages = [];
      this.renderMessages();
      chrome.storage.local.remove('sideChatHistory');
      this.addSystemMessage('Chat history cleared.');
    }
  }
  
  addSystemMessage(text) {
    const message = {
      role: 'system',
      content: text,
      timestamp: new Date().toISOString()
    };
    this.messages.push(message);
    this.renderMessages();
  }
  
  renderMessages() {
    // Clear welcome message if we have messages
    if (this.messages.length > 0) {
      const welcome = this.messagesContainer.querySelector('.chat-welcome');
      if (welcome) welcome.remove();
    }
    
    // Clear and re-render all messages
    const existingMessages = this.messagesContainer.querySelectorAll('.chat-message');
    existingMessages.forEach(msg => msg.remove());
    
    this.messages.forEach(message => {
      const messageEl = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageEl);
    });
    
    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  createMessageElement(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.role}`;
    
    const icon = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : 'ℹ️';
    
    messageEl.innerHTML = `
      <div class="message-header">
        <span class="message-icon">${icon}</span>
        <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${this.formatMessage(message.content)}</div>
    `;
    
    return messageEl;
  }
  
  formatMessage(content) {
    // Convert markdown-style formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
  
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isStreaming) return;
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMessage);
    this.renderMessages();
    
    // Clear input and disable send
    this.input.value = '';
    this.sendButton.disabled = true;
    this.isStreaming = true;
    
    // Update button to show loading
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
      const messageIndex = this.messages.length - 1;
      
      // Create message element for streaming
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
      console.error('Error sending message:', error);
      this.addSystemMessage(`Error: ${error.message}`);
    } finally {
      this.isStreaming = false;
      this.sendButton.disabled = false;
      this.sendButton.querySelector('.send-icon').style.display = 'inline';
      this.sendButton.querySelector('.loading-icon').style.display = 'none';
    }
  }
  
  prepareMessagesForAPI() {
    const messages = [];
    
    // Add system prompt with page context if enabled
    if (this.includePageContext && this.pageContent) {
      messages.push({
        role: 'system',
        content: `You are a helpful AI assistant. The user is currently viewing a webpage with the following content:\n\n${this.pageContent}\n\nUse this context when relevant to answer questions or provide assistance.`
      });
    } else {
      messages.push({
        role: 'system',
        content: 'You are a helpful AI assistant.'
      });
    }
    
    // Add conversation history (last 10 messages for context)
    const recentMessages = this.messages.slice(-10);
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
  
  async getSettings() {
    try {
      // Use the bridge provided by content script
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
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
              resolve(response.settings);
            } else {
              reject(new Error('Failed to get settings'));
            }
          });
        } else {
          reject(new Error('Chrome runtime not available'));
        }
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }
  
  async streamResponse(settings, messages, onChunk) {
    const { ollamaUrl, ollamaModel } = settings;
    
    if (!ollamaModel) {
      throw new Error('No model selected. Please select a model in settings.');
    }
    
    // Create abort controller for cancellation
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
}

// Create and export instance only if not already exists
if (!window.XandAISideChat) {
  console.log('🚀 Creating SideChat instance...');
  const sideChat = new SideChat();
  
  // Export for use in other scripts
  window.XandAISideChat = sideChat;
  console.log('✅ SideChat instance created and exported to window.XandAISideChat');
} else {
  console.log('♻️ SideChat instance already exists, skipping creation');
}

} // End of SideChat class definition guard
