/**
 * Unit tests for ChatManager
 * Tests the core chat management functionality
 */

// Mock Chrome APIs
global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
    sendMessage: jest.fn(),
    lastError: null
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock DOM methods
global.document = {
  querySelector: jest.fn(),
  createElement: jest.fn(() => ({
    src: '',
    rel: '',
    href: '',
    onload: null,
    onerror: null,
    appendChild: jest.fn()
  })),
  head: {
    appendChild: jest.fn()
  }
};

global.window = {
  XandAISideChat: null,
  chromeExtensionBridge: null
};

// Import ChatManager
const ChatManager = require('../src/core/ChatManager.js');

describe('ChatManager', () => {
  let chatManager;
  
  beforeEach(() => {
    chatManager = new ChatManager();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset global state
    global.window.XandAISideChat = null;
    global.window.chromeExtensionBridge = null;
  });
  
  describe('constructor', () => {
    test('should initialize with correct default state', () => {
      expect(chatManager.isInitialized).toBe(false);
      expect(chatManager.isLoading).toBe(false);
      expect(chatManager.chatInstance).toBe(null);
      expect(chatManager.communicationBridge).toBe(null);
      expect(chatManager.loadingPromise).toBe(null);
    });
    
    test('should bind methods correctly', () => {
      expect(typeof chatManager.initialize).toBe('function');
      expect(typeof chatManager.toggle).toBe('function');
      expect(typeof chatManager.isAvailable).toBe('function');
    });
  });
  
  describe('isAvailable', () => {
    test('should return false when not initialized', () => {
      expect(chatManager.isAvailable()).toBe(false);
    });
    
    test('should return false when initialized but no chat instance', () => {
      chatManager.isInitialized = true;
      expect(chatManager.isAvailable()).toBe(false);
    });
    
    test('should return false when chat instance exists but no toggle method', () => {
      chatManager.isInitialized = true;
      chatManager.chatInstance = {};
      expect(chatManager.isAvailable()).toBe(false);
    });
    
    test('should return true when fully available', () => {
      chatManager.isInitialized = true;
      chatManager.chatInstance = { toggle: jest.fn() };
      expect(chatManager.isAvailable()).toBe(true);
    });
  });
  
  describe('initialize', () => {
    test('should return true if already initialized and available', async () => {
      chatManager.isInitialized = true;
      chatManager.chatInstance = { toggle: jest.fn() };
      
      const result = await chatManager.initialize();
      expect(result).toBe(true);
    });
    
    test('should use existing global instance if available', async () => {
      const mockChatInstance = { toggle: jest.fn() };
      global.window.XandAISideChat = mockChatInstance;
      
      const result = await chatManager.initialize();
      
      expect(result).toBe(true);
      expect(chatManager.chatInstance).toBe(mockChatInstance);
      expect(chatManager.isInitialized).toBe(true);
    });
    
    test('should prevent multiple simultaneous initializations', async () => {
      global.window.XandAISideChat = { toggle: jest.fn() };
      
      // Start two initializations simultaneously
      const promise1 = chatManager.initialize();
      const promise2 = chatManager.initialize();
      
      const results = await Promise.all([promise1, promise2]);
      
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
      expect(chatManager.isInitialized).toBe(true);
    });
    
    test('should handle initialization failure gracefully', async () => {
      // Mock a scenario where chat instance never becomes available
      jest.spyOn(chatManager, '_waitForChatInstance').mockResolvedValue(false);
      jest.spyOn(chatManager, '_loadCSS').mockResolvedValue();
      jest.spyOn(chatManager, '_loadJavaScript').mockResolvedValue();
      jest.spyOn(chatManager, '_createCommunicationBridge').mockResolvedValue({});
      
      await expect(chatManager.initialize()).rejects.toThrow('Chat instance not available after loading');
      
      expect(chatManager.isInitialized).toBe(false);
      expect(chatManager.chatInstance).toBe(null);
    });
  });
  
  describe('_createCommunicationBridge', () => {
    test('should return existing bridge if available', async () => {
      const existingBridge = { sendMessage: jest.fn() };
      global.window.chromeExtensionBridge = existingBridge;
      
      const bridge = await chatManager._createCommunicationBridge();
      
      expect(bridge).toBe(existingBridge);
    });
    
    test('should create new bridge with correct structure', async () => {
      const bridge = await chatManager._createCommunicationBridge();
      
      expect(bridge).toHaveProperty('sendMessage');
      expect(bridge).toHaveProperty('getSettings');
      expect(typeof bridge.sendMessage).toBe('function');
      expect(typeof bridge.getSettings).toBe('function');
      expect(global.window.chromeExtensionBridge).toBe(bridge);
    });
    
    test('bridge sendMessage should handle chrome.runtime.sendMessage correctly', async () => {
      const bridge = await chatManager._createCommunicationBridge();
      const mockMessage = { action: 'test' };
      const mockResponse = { success: true };
      
      // Mock successful response
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });
      
      const result = await bridge.sendMessage(mockMessage);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(mockMessage, expect.any(Function));
      expect(result).toBe(mockResponse);
    });
    
    test('bridge sendMessage should handle errors correctly', async () => {
      const bridge = await chatManager._createCommunicationBridge();
      
      // Mock error response
      chrome.runtime.lastError = { message: 'Test error' };
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });
      
      await expect(bridge.sendMessage({ action: 'test' }))
        .rejects.toThrow('Test error');
      
      // Clean up
      chrome.runtime.lastError = null;
    });
  });
  
  describe('_loadCSS', () => {
    test('should resolve immediately if CSS already loaded', async () => {
      document.querySelector.mockReturnValue({}); // Mock existing CSS link
      
      await expect(chatManager._loadCSS()).resolves.toBeUndefined();
      
      expect(document.createElement).not.toHaveBeenCalled();
    });
    
    test('should create and append CSS link element', async () => {
      document.querySelector.mockReturnValue(null); // No existing CSS
      
      const mockLink = {
        rel: '',
        href: '',
        onload: null,
        onerror: null
      };
      document.createElement.mockReturnValue(mockLink);
      
      // Simulate successful load
      setTimeout(() => {
        if (mockLink.onload) mockLink.onload();
      }, 0);
      
      await expect(chatManager._loadCSS()).resolves.toBeUndefined();
      
      expect(document.createElement).toHaveBeenCalledWith('link');
      expect(mockLink.rel).toBe('stylesheet');
      expect(mockLink.href).toBe('chrome-extension://test/src/ui/sidechat.css');
      expect(document.head.appendChild).toHaveBeenCalledWith(mockLink);
    });
    
    test('should reject if CSS loading fails', async () => {
      document.querySelector.mockReturnValue(null);
      
      const mockLink = {
        rel: '',
        href: '',
        onload: null,
        onerror: null
      };
      document.createElement.mockReturnValue(mockLink);
      
      // Simulate failed load
      setTimeout(() => {
        if (mockLink.onerror) mockLink.onerror(new Error('CSS load failed'));
      }, 0);
      
      await expect(chatManager._loadCSS()).rejects.toThrow('Failed to load CSS');
    });
  });
  
  describe('_loadJavaScript', () => {
    test('should resolve immediately if JavaScript already loaded', async () => {
      document.querySelector.mockReturnValue({}); // Mock existing script
      
      await expect(chatManager._loadJavaScript()).resolves.toBeUndefined();
      
      expect(document.createElement).not.toHaveBeenCalled();
    });
    
    test('should create and append script element', async () => {
      document.querySelector.mockReturnValue(null); // No existing script
      
      const mockScript = {
        src: '',
        onload: null,
        onerror: null
      };
      document.createElement.mockReturnValue(mockScript);
      
      // Simulate successful load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);
      
      await expect(chatManager._loadJavaScript()).resolves.toBeUndefined();
      
      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toBe('chrome-extension://test/src/ui/SideChat.js');
      expect(document.head.appendChild).toHaveBeenCalledWith(mockScript);
    });
  });
  
  describe('_waitForChatInstance', () => {
    test('should return true immediately if instance exists', async () => {
      global.window.XandAISideChat = { toggle: jest.fn() };
      
      const result = await chatManager._waitForChatInstance(5, 10);
      
      expect(result).toBe(true);
      expect(chatManager.chatInstance).toBe(global.window.XandAISideChat);
    });
    
    test('should return false after maximum attempts', async () => {
      // Keep global instance null
      global.window.XandAISideChat = null;
      
      const result = await chatManager._waitForChatInstance(3, 10);
      
      expect(result).toBe(false);
    });
    
    test('should find instance that appears during wait', async () => {
      global.window.XandAISideChat = null;
      
      // Make instance available after a delay
      setTimeout(() => {
        global.window.XandAISideChat = { toggle: jest.fn() };
      }, 50);
      
      const result = await chatManager._waitForChatInstance(10, 20);
      
      expect(result).toBe(true);
      expect(chatManager.chatInstance).toBe(global.window.XandAISideChat);
    });
  });
  
  describe('toggle', () => {
    test('should initialize first if not initialized', async () => {
      const mockInstance = { toggle: jest.fn().mockResolvedValue() };
      global.window.XandAISideChat = mockInstance;
      
      const result = await chatManager.toggle();
      
      expect(chatManager.isInitialized).toBe(true);
      expect(mockInstance.toggle).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
    
    test('should call toggle on chat instance if available', async () => {
      const mockInstance = { toggle: jest.fn().mockResolvedValue() };
      chatManager.isInitialized = true;
      chatManager.chatInstance = mockInstance;
      
      const result = await chatManager.toggle();
      
      expect(mockInstance.toggle).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
    
    test('should handle toggle errors gracefully', async () => {
      const mockInstance = { toggle: jest.fn().mockRejectedValue(new Error('Toggle failed')) };
      chatManager.isInitialized = true;
      chatManager.chatInstance = mockInstance;
      
      const result = await chatManager.toggle();
      
      expect(result).toEqual({ success: false, error: 'Toggle failed' });
    });
    
    test('should return error if initialization fails', async () => {
      // Mock initialization failure
      jest.spyOn(chatManager, 'initialize').mockResolvedValue(false);
      
      const result = await chatManager.toggle();
      
      expect(result).toEqual({ success: false, error: 'Failed to initialize chat' });
    });
  });
  
  describe('reset', () => {
    test('should reset all state correctly', () => {
      // Set some state
      chatManager.isInitialized = true;
      chatManager.isLoading = true;
      chatManager.chatInstance = { toggle: jest.fn() };
      chatManager.loadingPromise = Promise.resolve();
      
      chatManager.reset();
      
      expect(chatManager.isInitialized).toBe(false);
      expect(chatManager.isLoading).toBe(false);
      expect(chatManager.chatInstance).toBe(null);
      expect(chatManager.loadingPromise).toBe(null);
    });
  });
  
  describe('getStatus', () => {
    test('should return correct status object', () => {
      chatManager.isInitialized = true;
      chatManager.isLoading = false;
      chatManager.chatInstance = { toggle: jest.fn() };
      chatManager.communicationBridge = { sendMessage: jest.fn() };
      global.window.XandAISideChat = chatManager.chatInstance;
      
      const status = chatManager.getStatus();
      
      expect(status).toEqual({
        isInitialized: true,
        isLoading: false,
        isAvailable: true,
        hasChatInstance: true,
        hasBridge: true,
        globalInstanceExists: true
      });
    });
  });
});
