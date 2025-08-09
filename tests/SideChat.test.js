/**
 * Unit tests for SideChat
 * Tests the side chat UI and functionality
 */

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  }
};

// Mock DOM
const mockElement = {
  id: '',
  className: '',
  innerHTML: '',
  style: {},
  addEventListener: jest.fn(),
  appendChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  remove: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  focus: jest.fn(),
  scrollTop: 0,
  scrollHeight: 100
};

global.document = {
  createElement: jest.fn(() => ({ ...mockElement })),
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  body: {
    appendChild: jest.fn()
  }
};

global.window = {
  XandAISideChatLoaded: undefined,
  chromeExtensionBridge: null
};

// Mock fetch
global.fetch = jest.fn();

// Mock TextDecoder
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn(data => new String(data))
}));

describe('SideChat', () => {
  let SideChat;
  let sideChat;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset global state
    global.window.XandAISideChatLoaded = undefined;
    global.window.chromeExtensionBridge = null;
    
    // Mock bridge
    global.window.chromeExtensionBridge = {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
      getSettings: jest.fn().mockResolvedValue({
        success: true,
        settings: {
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'test-model'
        }
      })
    };
    
    // Load SideChat class
    delete require.cache[require.resolve('../src/ui/SideChat.js')];
    SideChat = require('../src/ui/SideChat.js');
    
    // Create instance
    sideChat = new SideChat();
  });
  
  describe('constructor', () => {
    test('should initialize with correct default state', () => {
      expect(sideChat.isOpen).toBe(false);
      expect(sideChat.messages).toEqual([]);
      expect(sideChat.isStreaming).toBe(false);
      expect(sideChat.includePageContext).toBe(false);
      expect(sideChat.pageContent).toBe('');
      expect(sideChat.abortController).toBe(null);
      expect(sideChat.container).toBe(null);
      expect(sideChat.isInitialized).toBe(false);
    });
  });
  
  describe('waitForBridge', () => {
    test('should resolve immediately if bridge exists', async () => {
      global.window.chromeExtensionBridge = { sendMessage: jest.fn() };
      
      await expect(sideChat.waitForBridge(5, 10)).resolves.toBeUndefined();
    });
    
    test('should wait for bridge to become available', async () => {
      global.window.chromeExtensionBridge = null;
      
      // Make bridge available after delay
      setTimeout(() => {
        global.window.chromeExtensionBridge = { sendMessage: jest.fn() };
      }, 50);
      
      await expect(sideChat.waitForBridge(10, 20)).resolves.toBeUndefined();
    });
    
    test('should continue if bridge never becomes available', async () => {
      global.window.chromeExtensionBridge = null;
      
      await expect(sideChat.waitForBridge(3, 10)).resolves.toBeUndefined();
    });
  });
  
  describe('createChatUI', () => {
    test('should remove existing container before creating new one', () => {
      const existingContainer = { remove: jest.fn() };
      document.getElementById.mockReturnValue(existingContainer);
      
      sideChat.createChatUI();
      
      expect(existingContainer.remove).toHaveBeenCalled();
    });
    
    test('should create container with correct structure', () => {
      const mockContainer = { ...mockElement };
      document.createElement.mockReturnValue(mockContainer);
      
      sideChat.createChatUI();
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockContainer.id).toBe('xandai-side-chat');
      expect(mockContainer.className).toBe('xandai-side-chat');
      expect(mockContainer.innerHTML).toContain('XandAI Chat');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockContainer);
    });
    
    test('should store references to key elements', () => {
      const mockContainer = {
        ...mockElement,
        querySelector: jest.fn()
          .mockReturnValueOnce({ ...mockElement }) // messages container
          .mockReturnValueOnce({ ...mockElement }) // input
          .mockReturnValueOnce({ ...mockElement }) // send button
          .mockReturnValueOnce({ ...mockElement }) // clear button
          .mockReturnValueOnce({ ...mockElement }) // close button
          .mockReturnValueOnce({ ...mockElement }) // context toggle
      };
      document.createElement.mockReturnValue(mockContainer);
      
      sideChat.createChatUI();
      
      expect(sideChat.container).toBe(mockContainer);
      expect(sideChat.messagesContainer).toBeDefined();
      expect(sideChat.input).toBeDefined();
      expect(sideChat.sendButton).toBeDefined();
    });
  });
  
  describe('setupEventListeners', () => {
    beforeEach(() => {
      // Mock UI elements
      sideChat.sendButton = { addEventListener: jest.fn() };
      sideChat.input = { addEventListener: jest.fn() };
      sideChat.clearButton = { addEventListener: jest.fn() };
      sideChat.closeButton = { addEventListener: jest.fn() };
      sideChat.contextToggle = { addEventListener: jest.fn() };
    });
    
    test('should add event listeners to all interactive elements', () => {
      sideChat.setupEventListeners();
      
      expect(sideChat.sendButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(sideChat.input.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(sideChat.input.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(sideChat.clearButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(sideChat.closeButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(sideChat.contextToggle.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
  
  describe('updateSendButtonState', () => {
    beforeEach(() => {
      sideChat.input = { value: '' };
      sideChat.sendButton = { disabled: false };
    });
    
    test('should disable button when input is empty', () => {
      sideChat.input.value = '';
      sideChat.isStreaming = false;
      
      sideChat.updateSendButtonState();
      
      expect(sideChat.sendButton.disabled).toBe(true);
    });
    
    test('should disable button when streaming', () => {
      sideChat.input.value = 'test message';
      sideChat.isStreaming = true;
      
      sideChat.updateSendButtonState();
      
      expect(sideChat.sendButton.disabled).toBe(true);
    });
    
    test('should enable button when input has text and not streaming', () => {
      sideChat.input.value = 'test message';
      sideChat.isStreaming = false;
      
      sideChat.updateSendButtonState();
      
      expect(sideChat.sendButton.disabled).toBe(false);
    });
  });
  
  describe('open/close/toggle', () => {
    beforeEach(() => {
      sideChat.container = {
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      sideChat.input = { focus: jest.fn() };
      sideChat.isInitialized = true;
    });
    
    test('open should add open class and set state', () => {
      sideChat.open();
      
      expect(sideChat.container.classList.add).toHaveBeenCalledWith('open');
      expect(sideChat.isOpen).toBe(true);
    });
    
    test('close should remove open class and set state', () => {
      sideChat.isOpen = true;
      
      sideChat.close();
      
      expect(sideChat.container.classList.remove).toHaveBeenCalledWith('open');
      expect(sideChat.isOpen).toBe(false);
    });
    
    test('toggle should open when closed', async () => {
      sideChat.isOpen = false;
      jest.spyOn(sideChat, 'open');
      
      await sideChat.toggle();
      
      expect(sideChat.open).toHaveBeenCalled();
    });
    
    test('toggle should close when open', async () => {
      sideChat.isOpen = true;
      jest.spyOn(sideChat, 'close');
      
      await sideChat.toggle();
      
      expect(sideChat.close).toHaveBeenCalled();
    });
    
    test('toggle should wait for initialization', async () => {
      sideChat.isInitialized = false;
      
      // Make it initialize after delay
      setTimeout(() => {
        sideChat.isInitialized = true;
      }, 50);
      
      await expect(sideChat.toggle()).resolves.toBeUndefined();
    });
    
    test('toggle should throw error if initialization times out', async () => {
      sideChat.isInitialized = false;
      
      await expect(sideChat.toggle()).rejects.toThrow('SideChat not properly initialized');
    });
  });
  
  describe('sendMessageToBackground', () => {
    test('should use bridge if available', async () => {
      const mockResponse = { success: true, data: 'test' };
      global.window.chromeExtensionBridge.sendMessage.mockResolvedValue(mockResponse);
      
      const result = await sideChat.sendMessageToBackground('testAction', { test: 'data' });
      
      expect(global.window.chromeExtensionBridge.sendMessage).toHaveBeenCalledWith({
        action: 'testAction',
        data: { test: 'data' }
      });
      expect(result).toBe(mockResponse);
    });
    
    test('should fall back to direct chrome API if bridge unavailable', async () => {
      global.window.chromeExtensionBridge = null;
      const mockResponse = { success: true };
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });
      
      const result = await sideChat.sendMessageToBackground('testAction', { test: 'data' });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'testAction',
        data: { test: 'data' }
      }, expect.any(Function));
      expect(result).toBe(mockResponse);
    });
    
    test('should handle chrome runtime errors', async () => {
      global.window.chromeExtensionBridge = null;
      chrome.runtime.lastError = { message: 'Test error' };
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });
      
      await expect(sideChat.sendMessageToBackground('testAction', {}))
        .rejects.toThrow('Test error');
      
      chrome.runtime.lastError = null;
    });
  });
  
  describe('getSettings', () => {
    test('should use bridge if available', async () => {
      const mockSettings = {
        success: true,
        settings: { ollamaUrl: 'test', ollamaModel: 'test-model' }
      };
      global.window.chromeExtensionBridge.getSettings.mockResolvedValue(mockSettings);
      
      const result = await sideChat.getSettings();
      
      expect(result).toBe(mockSettings.settings);
    });
    
    test('should handle bridge errors', async () => {
      global.window.chromeExtensionBridge.getSettings.mockResolvedValue({
        success: false,
        error: 'Test error'
      });
      
      await expect(sideChat.getSettings()).rejects.toThrow('Test error');
    });
    
    test('should fall back to direct messaging', async () => {
      global.window.chromeExtensionBridge = null;
      const mockResponse = { success: true, settings: { test: 'data' } };
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });
      
      const result = await sideChat.getSettings();
      
      expect(result).toBe(mockResponse.settings);
    });
  });
  
  describe('prepareMessagesForAPI', () => {
    test('should include system message without page context', () => {
      sideChat.includePageContext = false;
      sideChat.messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];
      
      const apiMessages = sideChat.prepareMessagesForAPI();
      
      expect(apiMessages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful AI assistant.'
      });
      expect(apiMessages).toHaveLength(3); // system + 2 messages
    });
    
    test('should include page content in system message when enabled', () => {
      sideChat.includePageContext = true;
      sideChat.pageContent = 'Test page content';
      sideChat.messages = [];
      
      const apiMessages = sideChat.prepareMessagesForAPI();
      
      expect(apiMessages[0].content).toContain('Test page content');
    });
    
    test('should limit to recent messages', () => {
      sideChat.messages = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));
      
      const apiMessages = sideChat.prepareMessagesForAPI();
      
      // Should have system message + last 20 messages
      expect(apiMessages).toHaveLength(21);
    });
    
    test('should exclude system messages from conversation history', () => {
      sideChat.messages = [
        { role: 'user', content: 'Hello' },
        { role: 'system', content: 'System message' },
        { role: 'assistant', content: 'Hi' }
      ];
      
      const apiMessages = sideChat.prepareMessagesForAPI();
      
      // Should have system prompt + user + assistant (system message excluded)
      expect(apiMessages).toHaveLength(3);
      expect(apiMessages.find(m => m.content === 'System message')).toBeUndefined();
    });
  });
  
  describe('formatMessage', () => {
    test('should format bold text', () => {
      const result = sideChat.formatMessage('This is **bold** text');
      expect(result).toBe('This is <strong>bold</strong> text');
    });
    
    test('should format italic text', () => {
      const result = sideChat.formatMessage('This is *italic* text');
      expect(result).toBe('This is <em>italic</em> text');
    });
    
    test('should format code text', () => {
      const result = sideChat.formatMessage('This is `code` text');
      expect(result).toBe('This is <code>code</code> text');
    });
    
    test('should format line breaks', () => {
      const result = sideChat.formatMessage('Line 1\nLine 2');
      expect(result).toBe('Line 1<br>Line 2');
    });
    
    test('should handle multiple formatting in same text', () => {
      const result = sideChat.formatMessage('**Bold** and *italic* and `code`\nNew line');
      expect(result).toBe('<strong>Bold</strong> and <em>italic</em> and <code>code</code><br>New line');
    });
  });
  
  describe('capturePageContent', () => {
    beforeEach(() => {
      global.document.querySelector = jest.fn();
      global.document.body = { innerText: 'Fallback body content' };
    });
    
    test('should prefer main content areas', () => {
      const mockMainContent = { innerText: 'Main content text' };
      global.document.querySelector.mockReturnValue(mockMainContent);
      
      sideChat.capturePageContent();
      
      expect(global.document.querySelector).toHaveBeenCalledWith('main, article, [role="main"], .content, #content');
      expect(sideChat.pageContent).toBe('Main content text');
    });
    
    test('should fall back to body content', () => {
      global.document.querySelector.mockReturnValue(null);
      
      sideChat.capturePageContent();
      
      expect(sideChat.pageContent).toBe('Fallback body content');
    });
    
    test('should limit content length', () => {
      const longContent = 'a'.repeat(5000);
      global.document.querySelector.mockReturnValue({ innerText: longContent });
      
      sideChat.capturePageContent();
      
      expect(sideChat.pageContent).toHaveLength(3003); // 3000 + '...'
      expect(sideChat.pageContent).toEndWith('...');
    });
    
    test('should handle errors gracefully', () => {
      global.document.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      sideChat.capturePageContent();
      
      expect(sideChat.pageContent).toBe('');
    });
  });
});
