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
    this.includePageContext = false; // Can be enabled in standalone mode
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
      
      <div class="chat-settings">
        <button class="context-button" id="context-button">
          <span class="context-icon">📄</span>
          <span class="context-text">Use page context</span>
          <span class="context-status">OFF</span>
        </button>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="messages-container">
          <div class="chat-welcome">
            <div class="welcome-icon">🤖</div>
            <h4>Welcome to XandAI Chat!</h4>
            <p>Your local AI assistant is ready to help. How can I assist you today?</p>
            <small>💡 Enable "Use page context" so the AI can analyze the text content of the current page.</small>
          </div>
        </div>
      </div>
      
      <div class="chat-input-area">
        <div class="input-container">
          <div class="input-wrapper">
            <textarea 
              id="chat-input" 
              class="chat-input" 
              placeholder="Type your message..."
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
            <span class="typing-hint">Enter to send • Shift + Enter for new line</span>
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
    this.contextButton = chatContainer.querySelector('#context-button');
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
    
    // Context button
    this.contextButton.addEventListener('click', () => {
      this.includePageContext = !this.includePageContext;
      this.updateContextButton();
      this.saveSettings();
      
      if (this.includePageContext) {
        this.capturePageContent();
      } else {
        this.pageContent = '';
        this.addSystemMessage('Page context disabled.');
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
  
  updateContextButton() {
    const statusElement = this.contextButton.querySelector('.context-status');
    const iconElement = this.contextButton.querySelector('.context-icon');
    
    if (this.includePageContext) {
      this.contextButton.classList.add('active');
      statusElement.textContent = 'ON';
      iconElement.textContent = '📄';
    } else {
      this.contextButton.classList.remove('active');
      statusElement.textContent = 'OFF';
      iconElement.textContent = '📄';
    }
  }
  
  async loadSettings() {
    try {
      const response = await this.sendMessageToBackground('getStorage', { keys: ['sideChatSettings'] });
      if (response && response.sideChatSettings) {
        this.includePageContext = response.sideChatSettings.includePageContext || false;
        this.updateContextButton();
        
        if (this.includePageContext) {
          this.capturePageContent();
        }
      }
    } catch (error) {
      console.warn('Could not load settings:', error);
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
    if (confirm('Are you sure you want to clear all chat history?')) {
      this.messages = [];
      this.renderMessages();
      this.sendMessageToBackground('setStorage', { sideChatHistory: [] });
      this.addSystemMessage('Chat history cleared. 🧹');
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
    let formatted = content;

    // Process code blocks FIRST (before HTML escaping) to preserve content
    formatted = formatted.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang ? ` class="language-${lang.toLowerCase()}"` : '';
      // Escape HTML in code content
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/^\s*\n|\n\s*$/g, '')
        .trim();
      return `<pre class="code-block"><code${language}>${escapedCode}</code></pre>`;
    });

    // Process inline code SECOND (before HTML escaping)
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      return `<code class="inline-code">${escapedCode}</code>`;
    });

    // NOW escape remaining HTML (but not inside code blocks)
    // Split by code blocks and only escape content outside them
    const codeBlockPattern = /<pre class="code-block">[\s\S]*?<\/pre>/g;
    const inlineCodePattern = /<code class="inline-code">[\s\S]*?<\/code>/g;
    
    // Find all code blocks and inline code positions
    const codeBlocks = [];
    let match;
    
    // Find code block positions
    while ((match = codeBlockPattern.exec(formatted)) !== null) {
      codeBlocks.push({ start: match.index, end: match.index + match[0].length });
    }
    
    // Reset regex
    codeBlockPattern.lastIndex = 0;
    
    // Find inline code positions
    while ((match = inlineCodePattern.exec(formatted)) !== null) {
      codeBlocks.push({ start: match.index, end: match.index + match[0].length });
    }
    
    // Sort by position
    codeBlocks.sort((a, b) => a.start - b.start);
    
    // Escape HTML only in parts not inside code blocks
    let result = '';
    let lastIndex = 0;
    
    for (const block of codeBlocks) {
      // Escape text before this code block
      const beforeBlock = formatted.substring(lastIndex, block.start);
      result += beforeBlock.replace(/[&<>"']/g, (match) => {
        switch (match) {
          case '&': return '&amp;';
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#x27;';
          default: return match;
        }
      });
      
      // Add the code block as-is
      result += formatted.substring(block.start, block.end);
      lastIndex = block.end;
    }
    
    // Escape remaining text after last code block
    const afterBlocks = formatted.substring(lastIndex);
    result += afterBlocks.replace(/[&<>"']/g, (match) => {
      switch (match) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        default: return match;
      }
    });
    
    formatted = result;

    // Headers (# ## ### #### ##### ######)
    formatted = formatted.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
      const level = hashes.length;
      return `<h${level} class="markdown-h${level}">${text}</h${level}>`;
    });

    // Bold (**text** or __text__)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic (*text* or _text_)
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough (~~text~~)
    formatted = formatted.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Links [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="markdown-link">$1</a>');

    // Auto-links (http://example.com)
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="markdown-link">$1</a>');

    // Lists
    // Unordered lists (- or * or +)
    formatted = formatted.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li class="markdown-li">$1</li>');
    
    // Ordered lists (1. 2. 3.)
    formatted = formatted.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li class="markdown-oli">$1</li>');

    // Wrap consecutive list items in ul/ol tags
    formatted = formatted.replace(/(<li class="markdown-li">.*?<\/li>)(?:\s*<li class="markdown-li">.*?<\/li>)*/gs, 
      '<ul class="markdown-ul">$&</ul>');
    formatted = formatted.replace(/(<li class="markdown-oli">.*?<\/li>)(?:\s*<li class="markdown-oli">.*?<\/li>)*/gs, 
      '<ol class="markdown-ol">$&</ol>');

    // Blockquotes (> text)
    formatted = formatted.replace(/^>\s+(.+)$/gm, '<blockquote class="markdown-blockquote">$1</blockquote>');

    // Horizontal rules (--- or ***)
    formatted = formatted.replace(/^(---|\*\*\*)$/gm, '<hr class="markdown-hr">');

    // Tables (basic support)
    formatted = formatted.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map(cell => cell.trim());
      const cellTags = cells.map(cell => `<td class="markdown-td">${cell}</td>`).join('');
      return `<tr class="markdown-tr">${cellTags}</tr>`;
    });

    // Wrap table rows in table tags
    formatted = formatted.replace(/(<tr class="markdown-tr">.*?<\/tr>)(?:\s*<tr class="markdown-tr">.*?<\/tr>)*/gs, 
      '<table class="markdown-table">$&</table>');

    // Line breaks (preserve double line breaks as paragraphs, single as br)
    formatted = formatted.replace(/\n\n+/g, '</p><p class="markdown-p">');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped
    if (!formatted.includes('<p') && !formatted.includes('<h') && !formatted.includes('<ul') && !formatted.includes('<ol') && !formatted.includes('<pre')) {
      formatted = `<p class="markdown-p">${formatted}</p>`;
    } else if (formatted.includes('</p><p')) {
      formatted = `<p class="markdown-p">${formatted}</p>`;
    }

    return formatted;
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
    const messages = [];
    
    // Add system prompt with page context if enabled
    if (this.includePageContext && this.pageContent) {
      messages.push({
        role: 'system',
        content: `You are XandAI, a helpful and friendly AI assistant. Be helpful, clear, and direct in your responses. Use emojis when appropriate to make the conversation more engaging.

The user has enabled page context, so you have access to the complete text content of the current page for reference and analysis.

Page Content:
${this.pageContent}

Use this textual context to provide more accurate and relevant responses about the current page. You can analyze the content, information, data, and any other aspect of the page text when responding to user questions.`
      });
    } else {
      messages.push({
        role: 'system',
        content: 'You are XandAI, a helpful and friendly AI assistant. Be helpful, clear, and direct in your responses. Use emojis when appropriate to make the conversation more engaging.'
      });
    }
    
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
  
  /**
   * Capture page content from parent tab
   */
  async capturePageContent() {
    try {
      // Get the current active tab to retrieve HTML
      const tabs = await chrome.tabs.query({ active: true, currentWindow: false });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      
      const activeTab = tabs[0];
      console.log('📄 Standalone: Capturing HTML from tab:', activeTab.id);
      
      // Execute script in the active tab to get page text
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          // Get main content areas first
          const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
          let content = '';
          
          if (mainContent) {
            content = mainContent.innerText || mainContent.textContent || '';
          } else {
            // Fallback to body content, but filter out common noise
            const elementsToExclude = 'script, style, nav, header, footer, aside, .navigation, .nav, .menu, .sidebar, .ads, .advertisement';
            const bodyClone = document.body.cloneNode(true);
            
            // Remove excluded elements
            const excludedElements = bodyClone.querySelectorAll(elementsToExclude);
            excludedElements.forEach(el => el.remove());
            
            content = bodyClone.innerText || bodyClone.textContent || '';
          }
          
          // Clean up the text
          return content
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
            .trim();
        }
      });
      
      if (results && results[0] && results[0].result) {
        let content = results[0].result;
        
        // Limit content length to avoid overwhelming the model
        const maxLength = 6000;
        if (content.length > maxLength) {
          content = content.substring(0, maxLength) + '\n\n[Page text truncated - showing first ' + maxLength + ' characters]';
        }
        
        this.pageContent = content;
        console.log('📄 Standalone: Page text captured, length:', content.length);
        this.addSystemMessage('Page context captured (full text) and will be included in conversations.');
      } else {
        throw new Error('Failed to retrieve page content');
      }
    } catch (error) {
      console.error('Error capturing page content:', error);
      this.pageContent = '';
      this.addSystemMessage('Could not capture page context: ' + error.message);
    }
  }
  

}

// Initialize standalone chat when page loads
document.addEventListener('DOMContentLoaded', () => {
  new StandaloneSideChat();
});
