/**
 * Jest setup file for XandAI Extension tests
 * Sets up global mocks and test utilities
 */

// Mock Chrome APIs globally
global.chrome = {
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://test-extension-id/${path}`),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    lastError: null
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        const mockData = {
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'test-model'
        };
        callback(mockData);
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
      })
    },
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
      })
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  windows: {
    create: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Mock DOM APIs
const mockElement = {
  id: '',
  className: '',
  innerHTML: '',
  textContent: '',
  style: {},
  value: '',
  checked: false,
  disabled: false,
  scrollTop: 0,
  scrollHeight: 100,
  offsetHeight: 50,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
  getElementsByClassName: jest.fn(() => []),
  remove: jest.fn(),
  focus: jest.fn(),
  click: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false),
    toggle: jest.fn()
  },
  dataset: {},
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  getBoundingClientRect: jest.fn(() => ({
    top: 0,
    left: 0,
    width: 100,
    height: 50,
    right: 100,
    bottom: 50
  }))
};

global.document = {
  createElement: jest.fn(() => ({ ...mockElement })),
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementsByClassName: jest.fn(() => []),
  body: {
    ...mockElement,
    innerText: 'Mock body content'
  },
  head: {
    ...mockElement
  },
  documentElement: {
    ...mockElement,
    outerHTML: '<html><body>Mock page</body></html>'
  },
  doctype: {
    name: 'html'
  },
  title: 'Test Page',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.window = {
  location: {
    href: 'https://example.com/test',
    reload: jest.fn()
  },
  open: jest.fn(),
  close: jest.fn(),
  focus: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getSelection: jest.fn(() => ({
    toString: jest.fn(() => ''),
    rangeCount: 0,
    getRangeAt: jest.fn()
  })),
  scrollY: 0,
  screen: {
    width: 1920,
    height: 1080
  },
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
};

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    body: {
      getReader: () => ({
        read: () => Promise.resolve({ done: true, value: null }),
        releaseLock: jest.fn()
      })
    }
  })
);

// Mock TextDecoder
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn((data) => String(data))
}));

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {},
  abort: jest.fn()
}));

// Mock setTimeout and clearTimeout for more predictable tests
global.setTimeout = jest.fn((callback, delay) => {
  // Execute immediately in tests unless explicitly testing timing
  if (delay === 0 || process.env.NODE_ENV === 'test') {
    callback();
  }
  return 123; // Mock timer ID
});

global.clearTimeout = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Test utilities
global.testUtils = {
  // Create a mock Chrome extension message response
  createMockResponse: (success = true, data = {}, error = null) => ({
    success,
    data,
    error
  }),
  
  // Create a mock DOM event
  createMockEvent: (type = 'click', properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: mockElement,
    currentTarget: mockElement,
    ...properties
  }),
  
  // Wait for promises to resolve in tests
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Create mock element with specific properties
  createMockElement: (overrides = {}) => ({
    ...mockElement,
    ...overrides
  }),
  
  // Mock Chrome storage responses
  mockStorageGet: (data) => {
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback(data);
    });
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback(data);
    });
  },
  
  // Mock Chrome runtime.sendMessage responses
  mockRuntimeMessage: (response) => {
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) callback(response);
    });
  }
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset Chrome API mocks
  chrome.runtime.lastError = null;
  
  // Reset global state
  if (global.window) {
    global.window.XandAISideChat = null;
    global.window.XandAISideChatLoaded = undefined;
    global.window.XandAIContentScriptLoaded = undefined;
    global.window.chromeExtensionBridge = null;
    global.window.ChatManager = undefined;
  }
});
