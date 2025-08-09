/**
 * Standalone Chat Implementation
 * For use in the standalone chat window (chat-window.html)
 */

// Standalone chat functionality
class StandaloneSideChat {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isStreaming = false;
    this.includePageContext = false; // Disabled in standalone mode
    this.pageContent = '';
    this.abortController = null;
    this.isStandalone = true;
    this.windowId = null;
    
    this.initializeChat();
    this.setupWindowManagement();
  }
  
  initializeChat() {
    this.createChatUI();
    this.loadSettings();
    this.setupEventListeners();
    this.loadChatHistory();
    
    // Open immediately in standalone mode
    this.open();
  }
  
  createChatUI() {
    const container = document.getElementById('chat-container');
    
    const chatContainer = document.createElement('div');
    chatContainer.id = 'xandai-side-chat';
    chatContainer.className = 'xandai-side-chat standalone-mode';
    chatContainer.innerHTML = `
      <div class="chat-header">
        <div class="header-content">
          <div class="chat-title">
            <span class="chat-icon">🤖</span>
            <h3>XandAI Chat</h3>
          </div>
          <div class="chat-controls">
            <button class="chat-clear" title="Limpar histórico">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
            <button class="chat-minimize" title="Minimizar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button class="chat-close" title="Fechar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="messages-container">
          <div class="chat-welcome">
            <div class="welcome-icon">🤖</div>
            <h4>Bem-vindo ao XandAI Chat!</h4>
            <p>Seu assistente de IA local está pronto para ajudar. Como posso te auxiliar hoje?</p>
          </div>
        </div>
      </div>
      
      <div class="chat-input-area">
        <div class="input-container">
          <div class="input-wrapper">
            <textarea 
              id="chat-input" 
              class="chat-input" 
              placeholder="Digite sua mensagem..."
              rows="1"
            ></textarea>
            <button id="chat-send" class="chat-send" disabled>
              <span class="send-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                </svg>
              </span>
              <span class="loading-icon" style="display: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                </svg>
              </span>
            </button>
          </div>
          <div class="input-footer">
            <span class="model-info">Powered by Ollama</span>
            <span class="typing-hint">Enter para enviar • Shift + Enter para nova linha</span>
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(chatContainer);
    
    // Store references
    this.container = chatContainer;
    this.messagesContainer = chatContainer.querySelector('.messages-container');
    this.input = chatContainer.querySelector('#chat-input');
    this.sendButton = chatContainer.querySelector('#chat-send');
    this.clearButton = chatContainer.querySelector('.chat-clear');
    this.closeButton = chatContainer.querySelector('.chat-close');
    this.minimizeButton = chatContainer.querySelector('.chat-minimize');
  }
  
  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.input.addEventListener('input', () => {
      this.sendButton.disabled = !this.input.value.trim() || this.isStreaming;
      this.autoResizeTextarea();
    });
    
    this.clearButton.addEventListener('click', () => this.clearChat());
    this.closeButton.addEventListener('click', () => window.close());
    this.minimizeButton.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.windows) {
        chrome.windows.getCurrent((currentWindow) => {
          chrome.windows.update(currentWindow.id, { state: 'minimized' });
        });
      } else {
        window.minimize();
      }
    });
    
    // Focus input on load
    setTimeout(() => this.input.focus(), 100);
  }
  
  setupWindowManagement() {
    // Store current window ID
    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.getCurrent((currentWindow) => {
        this.windowId = currentWindow.id;
        console.log('🪟 Current window ID:', this.windowId);
      });
    }
    
    // Handle window focus events
    window.addEventListener('focus', () => {
      console.log('👀 Window focused');
      // Always ensure input is focused when window gains focus
      setTimeout(() => {
        if (this.input && !this.isStreaming) {
          this.input.focus();
        }
      }, 100);
    });
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👀 Document visible');
        // Re-focus input when document becomes visible
        setTimeout(() => {
          if (this.input && !this.isStreaming) {
            this.input.focus();
          }
        }, 100);
      }
    });
    
    // Prevent accidental closing with Ctrl+W, but allow it if confirmed
    window.addEventListener('beforeunload', (e) => {
      if (this.messages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return 'Tem certeza que deseja fechar o chat? Seu histórico será mantido.';
      }
    });
  }
  
  autoResizeTextarea() {
    // Reset height to calculate new height
    this.input.style.height = '24px';
    
    // Calculate new height based on scroll height
    const scrollHeight = this.input.scrollHeight;
    const maxHeight = 200; // Max height from CSS
    
    // Set new height
    const newHeight = Math.min(scrollHeight, maxHeight);
    this.input.style.height = newHeight + 'px';
    
    // Show scrollbar if content exceeds max height
    this.input.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }
  
  async loadSettings() {
    try {
      const response = await this.sendMessageToBackground('getStorage', { keys: ['sideChatSettings'] });
      if (response && response.sideChatSettings) {
        // In standalone mode, always keep page context disabled
        this.includePageContext = false;
      }
    } catch (error) {
      console.warn('Could not load settings:', error);
    }
  }
  
  saveSettings() {
    // Settings saving disabled in standalone mode
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
      this.messages = [];
    }
  }
  
  saveChatHistory() {
    try {
      const messagesToSave = this.messages.slice(-50);
      this.sendMessageToBackground('setStorage', { sideChatHistory: messagesToSave });
    } catch (error) {
      console.warn('Could not save chat history:', error);
    }
  }
  
  async sendMessageToBackground(action, data) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action, data }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else {
        reject(new Error('Chrome runtime not available'));
      }
    });
  }
  
  open() {
    this.container.classList.add('open');
    this.isOpen = true;
    
    // Ensure window is focused and input is ready
    if (typeof chrome !== 'undefined' && chrome.windows && this.windowId) {
      chrome.windows.update(this.windowId, { focused: true }, () => {
        setTimeout(() => this.input.focus(), 150);
      });
    } else {
      setTimeout(() => this.input.focus(), 150);
    }
  }
  
  close() {
    window.close();
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  clearChat() {
    if (confirm('Tem certeza que deseja limpar todo o histórico do chat?')) {
      this.messages = [];
      this.renderMessages();
      this.sendMessageToBackground('setStorage', { sideChatHistory: [] });
      this.addSystemMessage('Histórico do chat limpo. 🧹');
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
    if (this.messages.length > 0) {
      const welcome = this.messagesContainer.querySelector('.chat-welcome');
      if (welcome) welcome.remove();
    }
    
    const existingMessages = this.messagesContainer.querySelectorAll('.chat-message');
    existingMessages.forEach(msg => msg.remove());
    
    this.messages.forEach(message => {
      const messageEl = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageEl);
    });
    
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
    return content
      // Code blocks primeiro (```code```)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code (`code`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold (**text**)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic (*text*)
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Quebras de linha
      .replace(/\n/g, '<br>');
  }
  
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isStreaming) return;
    
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMessage);
    this.renderMessages();
    
    this.input.value = '';
    this.sendButton.disabled = true;
    this.isStreaming = true;
    
    this.sendButton.querySelector('.send-icon').style.display = 'none';
    this.sendButton.querySelector('.loading-icon').style.display = 'inline';
    
    try {
      const settings = await this.getSettings();
      const apiMessages = this.prepareMessagesForAPI();
      
      const assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };
      this.messages.push(assistantMessage);
      
      const messageEl = this.createMessageElement(assistantMessage);
      this.messagesContainer.appendChild(messageEl);
      const contentEl = messageEl.querySelector('.message-content');
      
      await this.streamResponse(settings, apiMessages, (chunk) => {
        assistantMessage.content += chunk;
        contentEl.innerHTML = this.formatMessage(assistantMessage.content);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      });
      
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
    const messages = [{
      role: 'system',
      content: 'Você é o XandAI, um assistente de IA útil e amigável. Responda sempre em português brasileiro. Seja prestativo, claro e direto em suas respostas. Use emojis quando apropriado para tornar a conversa mais amigável.'
    }];
    
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
  }
  
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
}

// Initialize standalone chat when page loads
document.addEventListener('DOMContentLoaded', () => {
  new StandaloneSideChat();
});
