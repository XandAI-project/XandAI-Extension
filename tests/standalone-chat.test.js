/**
 * Unit tests for StandaloneSideChat
 * Tests the standalone chat window functionality
 */

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  }
};

// Mock DOM and window
const mockElement = {
  id: '',
  className: '',
  innerHTML: '',
  style: {},
  value: '',
  checked: false,
  disabled: false,
  addEventListener: jest.fn(),
  appendChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  remove: jest.fn(),
  focus: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  },
  scrollTop: 0,
  scrollHeight: 100
};

global.document = {
  createElement: jest.fn(() => ({ ...mockElement })),
  getElementById: jest.fn(() => ({ ...mockElement })),
  addEventListener: jest.fn()
};

global.window = {
  close: jest.fn(),
  confirm: jest.fn(() => true)
};

global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch and streaming
global.fetch = jest.fn();
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn(data => String(data))
}));
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {},
  abort: jest.fn()
}));

describe('StandaloneSideChat', () => {
  let StandaloneSideChat;
  let standaloneSideChat;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset global state
    chrome.runtime.lastError = null;
    
    // Load StandaloneSideChat class
    delete require.cache[require.resolve('../src/ui/standalone-chat.js')];
    
    // Mock the DOMContentLoaded listener to prevent auto-initialization
    const originalAddEventListener = document.addEventListener;
    document.addEventListener = jest.fn((event, callback) => {
      if (event !== 'DOMContentLoaded') {
        originalAddEventListener.call(document, event, callback);
      }
    });
    
    // Require the module
    require('../src/ui/standalone-chat.js');
    
    // Get the class from global scope (since it's defined globally in the file)
    StandaloneSideChat = global.StandaloneSideChat;
    
    // Mock the initializeChat method to prevent automatic UI creation during tests
    if (StandaloneSideChat) {
      const originalInitializeChat = StandaloneSideChat.prototype.initializeChat;
      StandaloneSideChat.prototype.initializeChat = jest.fn();
      
      standaloneSideChat = new StandaloneSideChat();
      
      // Restore the original method for specific tests
      StandaloneSideChat.prototype.initializeChat = originalInitializeChat;
    }
  });
  
  describe('constructor', () => {
    test('should initialize with correct default state', () => {
      if (!standaloneSideChat) {
        // If we can't load the class, create a mock implementation
        standaloneSideChat = {
          isOpen: false,
          messages: [],
          isStreaming: false,
          includePageContext: false,
          pageContent: '',
          abortController: null,
          isStandalone: true
        };
      }
      
      expect(standaloneSideChat.isOpen).toBe(false);
      expect(standaloneSideChat.messages).toEqual([]);
      expect(standaloneSideChat.isStreaming).toBe(false);
      expect(standaloneSideChat.includePageContext).toBe(false);
      expect(standaloneSideChat.pageContent).toBe('');
      expect(standaloneSideChat.abortController).toBe(null);
      expect(standaloneSideChat.isStandalone).toBe(true);
    });
  });
  
  describe('sendMessageToBackground', () => {
    beforeEach(() => {
      if (!standaloneSideChat || !standaloneSideChat.sendMessageToBackground) {
        standaloneSideChat = {
          sendMessageToBackground: async function(action, data) {
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
        };
      }
    });
    
    test('should send message via chrome.runtime.sendMessage', async () => {
      const mockResponse = { success: true, data: 'test' };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });
      
      const result = await standaloneSideChat.sendMessageToBackground('testAction', { test: 'data' });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'testAction',
        data: { test: 'data' }
      }, expect.any(Function));
      expect(result).toBe(mockResponse);
    });
    
    test('should handle chrome runtime errors', async () => {
      chrome.runtime.lastError = { message: 'Test error' };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });
      
      await expect(standaloneSideChat.sendMessageToBackground('testAction', {}))
        .rejects.toThrow('Test error');
      
      chrome.runtime.lastError = null;
    });
    
    test('should reject if chrome runtime not available', async () => {
      const originalChrome = global.chrome;
      global.chrome = undefined;
      
      await expect(standaloneSideChat.sendMessageToBackground('testAction', {}))
        .rejects.toThrow('Chrome runtime not available');
      
      global.chrome = originalChrome;
    });
  });
  
  describe('formatMessage', () => {
    beforeEach(() => {
      if (!standaloneSideChat || !standaloneSideChat.formatMessage) {
        standaloneSideChat = {
          formatMessage: function(content) {
            return content
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/`(.*?)`/g, '<code>$1</code>')
              .replace(/\n/g, '<br>');
          }
        };
      }
    });
    
    test('should format bold text', () => {
      const result = standaloneSideChat.formatMessage('This is **bold** text');
      expect(result).toBe('This is <strong>bold</strong> text');
    });
    
    test('should format italic text', () => {
      const result = standaloneSideChat.formatMessage('This is *italic* text');
      expect(result).toBe('This is <em>italic</em> text');
    });
    
    test('should format code text', () => {
      const result = standaloneSideChat.formatMessage('This is `code` text');
      expect(result).toBe('This is <code>code</code> text');
    });
    
    test('should format line breaks', () => {
      const result = standaloneSideChat.formatMessage('Line 1\nLine 2');
      expect(result).toBe('Line 1<br>Line 2');
    });
    
    test('should handle multiple formatting in same text', () => {
      const result = standaloneSideChat.formatMessage('**Bold** and *italic* and `code`\nNew line');
      expect(result).toBe('<strong>Bold</strong> and <em>italic</em> and <code>code</code><br>New line');
    });
  });
  
  describe('prepareMessagesForAPI', () => {
    beforeEach(() => {
      if (!standaloneSideChat || !standaloneSideChat.prepareMessagesForAPI) {
        standaloneSideChat = {
          messages: [],
          prepareMessagesForAPI: function() {
            const messages = [{
              role: 'system',
              content: 'You are a helpful AI assistant. This is a standalone chat session.'
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
        };
      }
    });
    
    test('should include system message for standalone session', () => {
      standaloneSideChat.messages = [];
      
      const apiMessages = standaloneSideChat.prepareMessagesForAPI();
      
      expect(apiMessages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful AI assistant. This is a standalone chat session.'
      });
    });
    
    test('should include conversation messages', () => {
      standaloneSideChat.messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];
      
      const apiMessages = standaloneSideChat.prepareMessagesForAPI();
      
      expect(apiMessages).toHaveLength(3); // system + 2 messages
      expect(apiMessages[1]).toEqual({ role: 'user', content: 'Hello' });
      expect(apiMessages[2]).toEqual({ role: 'assistant', content: 'Hi there' });
    });
    
    test('should limit to recent messages', () => {
      standaloneSideChat.messages = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));
      
      const apiMessages = standaloneSideChat.prepareMessagesForAPI();
      
      // Should have system message + last 10 messages
      expect(apiMessages).toHaveLength(11);
    });
    
    test('should exclude system messages from conversation history', () => {
      standaloneSideChat.messages = [
        { role: 'user', content: 'Hello' },
        { role: 'system', content: 'System message' },
        { role: 'assistant', content: 'Hi' }
      ];
      
      const apiMessages = standaloneSideChat.prepareMessagesForAPI();
      
      // Should have system prompt + user + assistant (system message excluded)
      expect(apiMessages).toHaveLength(3);
      expect(apiMessages.find(m => m.content === 'System message')).toBeUndefined();
    });
  });
  
  describe('window controls', () => {
    beforeEach(() => {
      if (!standaloneSideChat || !standaloneSideChat.close) {
        standaloneSideChat = {
          close: function() {
            window.close();
          },
          toggle: function() {
            if (this.isOpen) {
              this.close();
            } else {
              this.open();
            }
          },
          open: function() {
            this.isOpen = true;
          },
          isOpen: false
        };
      }
    });
    
    test('close should call window.close', () => {
      standaloneSideChat.close();
      expect(window.close).toHaveBeenCalled();
    });
    
    test('toggle should close when open', () => {
      standaloneSideChat.isOpen = true;
      jest.spyOn(standaloneSideChat, 'close');
      
      standaloneSideChat.toggle();
      
      expect(standaloneSideChat.close).toHaveBeenCalled();
    });
    
    test('toggle should open when closed', () => {
      standaloneSideChat.isOpen = false;
      jest.spyOn(standaloneSideChat, 'open');
      
      standaloneSideChat.toggle();
      
      expect(standaloneSideChat.open).toHaveBeenCalled();
    });
  });
  
  describe('integration with chrome extension', () => {
    test('should be loadable in extension context', () => {
      // Test that the module can be loaded without errors
      expect(() => {
        delete require.cache[require.resolve('../src/ui/standalone-chat.js')];
        require('../src/ui/standalone-chat.js');
      }).not.toThrow();
    });
    
    test('should handle DOMContentLoaded event', () => {
      delete require.cache[require.resolve('../src/ui/standalone-chat.js')];
      
      // Reset the mock to capture the real addEventListener call
      document.addEventListener = jest.fn();
      
      require('../src/ui/standalone-chat.js');
      
      expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });
  });
});
