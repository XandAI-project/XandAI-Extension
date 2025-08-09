// DOM elements - with error checking
console.log('🔍 Loading DOM elements...');

const form = document.getElementById('settings-form');
const urlInput = document.getElementById('ollama-url');
const modelSelect = document.getElementById('ollama-model');
const testBtn = document.getElementById('test-btn');
const statusDiv = document.getElementById('status');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const chatToggle = document.getElementById('chat-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const historyContent = document.getElementById('history-content');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const modelManagementToggle = document.getElementById('model-management-toggle');
const modelManagement = document.getElementById('model-management');
const modelPullInput = document.getElementById('model-pull-input');
const pullModelBtn = document.getElementById('pull-model-btn');
const modelList = document.getElementById('model-list');
const modelOperationStatus = document.getElementById('model-operation-status');
const pullProgressContainer = document.getElementById('pull-progress-container');
const pullProgressFill = document.getElementById('pull-progress-fill');
const pullProgressText = document.getElementById('pull-progress-text');



// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await chrome.storage.sync.get(['ollamaUrl', 'ollamaModel']);
    
    urlInput.value = settings.ollamaUrl || 'http://localhost:11434';
    
    // Load available models after setting URL
    if (urlInput.value) {
      await loadAvailableModels();
      // Set selected model after loading options
      if (settings.ollamaModel) {
        modelSelect.value = settings.ollamaModel;
      }
    }
    
    // Test connection automatically
    await testConnection(false);
    

  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
});





// Global message listener for progress updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'pullProgress') {
    handlePullProgress(message.data);
  }
});

// Toggle settings panel
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('show');
  // Hide other panels when settings is opened
  if (settingsPanel.classList.contains('show')) {
    historyPanel.classList.remove('show');
    historyToggle.classList.remove('active');
  }
});

// Toggle chat panel
chatToggle.addEventListener('click', async () => {
  console.log('🔧 Chat toggle clicked - opening side-by-side chat immediately');
  
  // For side-by-side mode, always open standalone chat for better performance
  // This eliminates the complex content script detection and injection logic
  openStandaloneChat();
});

// Global variables
let standaloneWindowId = null;
const sideBySideMode = true; // Always enabled

// Function to open standalone chat window
function openStandaloneChat() {
  console.log('🚀 Opening standalone chat window');
  
  // Always create new window for side-by-side mode to ensure proper layout
  // Clear any existing window ID first
  if (standaloneWindowId) {
    console.log('🔄 Clearing existing window ID for fresh side-by-side layout');
    standaloneWindowId = null;
  }
  
  createStandaloneWindow();
}

function createStandaloneWindow() {
  if (sideBySideMode) {
    createSideBySideWindow();
  } else {
    createFallbackWindow();
  }
}

function createSideBySideWindow() {
  console.log('🔄 Creating side-by-side window layout');
  
  // Close popup immediately to show responsiveness
  setTimeout(() => window.close(), 100);
  
  // Get current window info first
  chrome.windows.getCurrent((currentWindow) => {
    // Store original window state immediately
    storeOriginalWindowState(currentWindow);
    
    // Get screen dimensions
    chrome.system.display.getInfo((displays) => {
      // Find which display contains the current window
      let targetDisplay = null;
      const windowCenterX = currentWindow.left + (currentWindow.width / 2);
      const windowCenterY = currentWindow.top + (currentWindow.height / 2);
      
      for (const display of displays) {
        if (windowCenterX >= display.bounds.left && 
            windowCenterX < display.bounds.left + display.bounds.width &&
            windowCenterY >= display.bounds.top && 
            windowCenterY < display.bounds.top + display.bounds.height) {
          targetDisplay = display;
          break;
        }
      }
      
      // Fallback to primary display
      if (!targetDisplay) {
        targetDisplay = displays.find(d => d.isPrimary) || displays[0];
      }
      
      const screenWidth = targetDisplay.workArea.width;
      const screenHeight = targetDisplay.workArea.height;
      const screenLeft = targetDisplay.workArea.left;
      const screenTop = targetDisplay.workArea.top;
      
      // Calculate dimensions for side-by-side layout
      const chatWidth = 450;
      const browserWidth = screenWidth - chatWidth;
      
      // Resize browser and create chat window simultaneously
      chrome.windows.update(currentWindow.id, {
        left: screenLeft,
        top: screenTop,
        width: browserWidth,
        height: screenHeight,
        state: 'normal'
      });
      
      // Create chat window immediately without waiting for browser resize
      chrome.windows.create({
        url: chrome.runtime.getURL('chat-window.html'),
        type: 'popup',
        left: screenLeft + browserWidth,
        top: screenTop,
        width: chatWidth,
        height: screenHeight,
        focused: true,
        state: 'normal'
      }, (newWindow) => {
        if (!chrome.runtime.lastError && newWindow) {
          console.log('✅ Side-by-side chat window created');
          standaloneWindowId = newWindow.id;
        } else {
          console.error('❌ Error creating chat window, using fallback');
          createFallbackWindow();
        }
      });
    });
  });
}

function createFallbackWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('chat-window.html'),
    type: 'popup',
    width: 500,
    height: 700,
    focused: true,
    state: 'normal'
  }, (newWindow) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error creating fallback chat window:', chrome.runtime.lastError);
      // Last resort: open in new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('chat-window.html'),
        active: true
      });
    } else {
      console.log('✅ Fallback chat window created:', newWindow);
      standaloneWindowId = newWindow.id;
      window.close();
    }
  });
}

let originalWindowState = null;

function storeOriginalWindowState(windowInfo) {
  originalWindowState = {
    id: windowInfo.id,
    left: windowInfo.left,
    top: windowInfo.top,
    width: windowInfo.width,
    height: windowInfo.height,
    state: windowInfo.state
  };
  console.log('💾 Stored original window state:', originalWindowState);
}

function restoreOriginalWindowState() {
  if (originalWindowState) {
    chrome.windows.update(originalWindowState.id, {
      left: originalWindowState.left,
      top: originalWindowState.top,
      width: originalWindowState.width,
      height: originalWindowState.height,
      state: originalWindowState.state
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error restoring window:', chrome.runtime.lastError);
      } else {
        console.log('✅ Browser window restored to original state');
      }
      originalWindowState = null;
    });
  }
}

// Listen for window removal to clear the ID and restore browser
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === standaloneWindowId) {
    standaloneWindowId = null;
    console.log('🗑️ Standalone window closed, clearing ID and restoring browser');
    
    // Restore browser window to original state
    setTimeout(() => {
      restoreOriginalWindowState();
    }, 100);
  }
});

// Toggle history panel
historyToggle.addEventListener('click', () => {
  historyPanel.classList.toggle('show');
  historyToggle.classList.toggle('active');
  
  // Hide other panels when history is opened
  if (historyPanel.classList.contains('show')) {
    settingsPanel.classList.remove('show');
    loadConversationHistory();
  }
});

// HTML toggle event listener is now handled in setupHtmlInjectionEventListeners()

// Clear history button
clearHistoryBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all conversation history?')) {
    try {
      await chrome.storage.local.remove(['conversationHistory']);
      showStatus('Conversation history cleared!', 'success');
      loadConversationHistory(); // Refresh the history display
    } catch (error) {
      console.error('Error clearing history:', error);
      showStatus('Error clearing history', 'error');
    }
  }
});

// Toggle model management panel
modelManagementToggle.addEventListener('click', () => {
  const isVisible = modelManagement.style.display !== 'none';
  modelManagement.style.display = isVisible ? 'none' : 'block';
  modelManagementToggle.textContent = isVisible ? '🔧 Manage Models' : '✕ Hide Models';
  
  if (!isVisible) {
    loadModelList();
  }
});

// Pull model button
pullModelBtn.addEventListener('click', () => pullModel());

// Enter key in pull input
modelPullInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    pullModel();
  }
});

// HTML injection event listeners are now handled in setupHtmlInjectionEventListeners()



// Save settings
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const settings = {
    ollamaUrl: urlInput.value.trim(),
    ollamaModel: modelSelect.value.trim()
  };
  
  // Validate URL
  if (!isValidUrl(settings.ollamaUrl)) {
    showStatus('Invalid URL', 'error');
    return;
  }
  
  try {
    // Save to both sync and local storage for redundancy
    await chrome.storage.sync.set(settings);
    
    // Also save to local storage as backup
    try {
      await chrome.storage.local.set(settings);
      console.log('Settings also saved to local storage as backup');
    } catch (localError) {
      console.warn('Could not save to local storage:', localError);
    }
    
    showStatus('Settings saved!', 'success');
    
    // Test connection after saving
    setTimeout(() => testConnection(false), 1000);
  } catch (error) {
    console.error('Error saving:', error);
    
    // Try saving to local storage if sync fails
    try {
      await chrome.storage.local.set(settings);
      showStatus('Settings saved to local storage (sync failed)', 'warning');
    } catch (localError) {
      showStatus('Error saving settings', 'error');
    }
  }
});

// Test connection
testBtn.addEventListener('click', () => testConnection(true));

// Function to test connection with Ollama
async function testConnection(showResult = true) {
  const url = urlInput.value.trim();
  
  if (!isValidUrl(url)) {
    updateConnectionStatus(false, 'Invalid URL');
    if (showResult) showStatus('Invalid URL', 'error');
    return;
  }
  
  try {
    updateConnectionStatus(null, 'Testing...');
    if (showResult) showStatus('Testing connection...', 'info');
    
    // Test health endpoint
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const modelCount = data.models ? data.models.length : 0;
      
      updateConnectionStatus(true, `Connected (${modelCount} models)`);
      if (showResult) {
        showStatus(`Connection successful! ${modelCount} models available`, 'success');
      }
      
      // Update model list when connection is successful
      if (data.models) {
        updateModelOptions(data.models);
        
        // Check if specified model exists
        if (modelSelect.value.trim()) {
          const modelExists = data.models.some(m => 
            m.name === modelSelect.value.trim()
          );
          
          if (!modelExists && showResult) {
            showStatus(`Warning: Model "${modelSelect.value}" not found`, 'error');
          }
        }
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Connection error:', error);
    updateConnectionStatus(false, 'Disconnected');
    
    if (showResult) {
      const errorMsg = error.message.includes('NetworkError') || error.message.includes('fetch') 
        ? 'Could not connect. Check if Ollama is running.'
        : `Error: ${error.message}`;
      showStatus(errorMsg, 'error');
    }
  }
}

// Update visual connection status
function updateConnectionStatus(isOnline, text) {
  connectionText.textContent = text;
  connectionDot.className = 'status-dot';
  
  if (isOnline === true) {
    connectionDot.classList.add('online');
  } else if (isOnline === false) {
    connectionDot.classList.add('offline');
  }
  // If isOnline is null, no class is added (neutral state)
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Listener for URL changes (test automatically and reload models)
urlInput.addEventListener('blur', async () => {
  if (urlInput.value.trim() && isValidUrl(urlInput.value.trim())) {
    await loadAvailableModels();
    testConnection(false);
  }
});

// Load available models from Ollama API
async function loadAvailableModels() {
  const url = urlInput.value.trim();
  
  if (!isValidUrl(url)) {
    clearModelOptions();
    return;
  }
  
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateModelOptions(data.models || []);
    } else {
      clearModelOptions();
    }
  } catch (error) {
    console.error('Error loading models:', error);
    clearModelOptions();
  }
}

// Update model select options
function updateModelOptions(models) {
  const currentValue = modelSelect.value;
  
  // Clear existing options except the default one
  modelSelect.innerHTML = '<option value="">Select a model...</option>';
  
  // Add model options
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = formatModelDisplayName(model.name);
    modelSelect.appendChild(option);
  });
  
  // Restore previous selection if it still exists
  if (currentValue && models.some(m => m.name === currentValue)) {
    modelSelect.value = currentValue;
  }
}

// Clear model options
function clearModelOptions() {
  modelSelect.innerHTML = '<option value="">Select a model...</option>';
}

// Load model list for management
async function loadModelList() {
  const url = urlInput.value.trim();
  
  if (!isValidUrl(url)) {
    modelList.innerHTML = '<div class="model-list-empty">Please configure a valid Ollama URL first</div>';
    return;
  }
  
  try {
    modelList.innerHTML = '<div class="model-list-loading">Loading models...</div>';
    
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayModelList(data.models || []);
    } else {
      modelList.innerHTML = '<div class="model-list-empty">Error loading models</div>';
    }
  } catch (error) {
    console.error('Error loading model list:', error);
    modelList.innerHTML = '<div class="model-list-empty">Error connecting to Ollama</div>';
  }
}

// Display model list with delete buttons
function displayModelList(models) {
  if (models.length === 0) {
    modelList.innerHTML = '<div class="model-list-empty">No models installed</div>';
    return;
  }
  
  modelList.innerHTML = '';
  
  models.forEach(model => {
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    
    const modelSize = formatBytes(model.size || 0);
    
    // Create elements without inline handlers
    const modelNameDiv = document.createElement('div');
    modelNameDiv.className = 'model-name';
    modelNameDiv.textContent = formatModelDisplayName(model.name);
    modelNameDiv.title = model.name; // Show full name on hover
    
    const modelSizeDiv = document.createElement('div');
    modelSizeDiv.className = 'model-size';
    modelSizeDiv.textContent = modelSize;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'model-delete-btn';
    deleteBtn.title = 'Delete this model';
    deleteBtn.innerHTML = '🗑️ Delete';
    
    // Add event listener instead of inline handler
    deleteBtn.addEventListener('click', () => deleteModel(model.name));
    
    // Append elements
    modelItem.appendChild(modelNameDiv);
    modelItem.appendChild(modelSizeDiv);
    modelItem.appendChild(deleteBtn);
    
    modelList.appendChild(modelItem);
  });
}

// Format model name - auto-detect Hugging Face models
function formatModelName(modelName) {
  // Don't modify if already has a known prefix
  if (modelName.startsWith('hf.co/') || 
      modelName.startsWith('ollama/') || 
      modelName.startsWith('registry.ollama.ai/') ||
      modelName.startsWith('docker.io/') ||
      modelName.includes('://')) {
    return modelName;
  }
  
  // Check if it looks like a Hugging Face model (username/model-name pattern)
  // Must contain a slash and have at least one character before and after the slash
  const hfPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+/;
  
  if (hfPattern.test(modelName)) {
    // It looks like a Hugging Face model, add the prefix
    return `hf.co/${modelName}`;
  }
  
  // Return as-is for regular Ollama models (e.g., llama2, mistral, etc.)
  return modelName;
}

// Format model name for display - hide HuggingFace prefixes
function formatModelDisplayName(modelName) {
  // If it's a HuggingFace model, extract just the model name
  if (modelName.startsWith('hf.co/')) {
    // Remove 'hf.co/' and extract just the model name (after the last '/')
    const withoutPrefix = modelName.substring(6); // Remove 'hf.co/'
    const parts = withoutPrefix.split('/');
    if (parts.length >= 2) {
      // Return everything after the author (e.g., 'bartowski/model-name' -> 'model-name')
      return parts.slice(1).join('/');
    }
    return withoutPrefix;
  }
  
  // For other prefixed models, you could add similar logic here
  
  // Return as-is for regular models
  return modelName;
}

// Track if a pull is currently in progress
let isPulling = false;

// Pull a new model
async function pullModel() {
  let modelName = modelPullInput.value.trim();
  const url = urlInput.value.trim();
  
  if (!modelName) {
    showModelStatus('Please enter a model name', 'error');
    return;
  }
  
  if (!isValidUrl(url)) {
    showModelStatus('Please configure a valid Ollama URL first', 'error');
    return;
  }
  
  if (isPulling) {
    showModelStatus('Another model is currently being pulled. Please wait.', 'error');
    return;
  }
  
  // Auto-detect Hugging Face models and add hf.co/ prefix
  modelName = formatModelName(modelName);
  
  try {
    isPulling = true;
    pullModelBtn.disabled = true;
    pullModelBtn.textContent = '🔄 Pulling...';
    
    // Show what's actually being pulled (with prefix if added)
    const originalInput = modelPullInput.value.trim();
    const wasAutoFormatted = modelName !== originalInput;
    const displayName = wasAutoFormatted ? 
      `${formatModelDisplayName(modelName)} (detected as HuggingFace model)` : formatModelDisplayName(modelName);
    showModelStatus(`Pulling model: ${displayName}...`, 'info');
    
    console.log('🚀 Initiating pull:', {
      modelName: modelName,
      url: url,
      originalInput: originalInput,
      wasAutoFormatted: wasAutoFormatted
    });
    
    // Show progress bar
    showPullProgress(0, 'Initializing pull...');
    
    const response = await new Promise((resolve, reject) => {
      console.log('📡 Sending message to background script...');
      chrome.runtime.sendMessage({
        action: 'pullModel',
        data: {
          url: url,
          modelName: modelName
        }
      }, (response) => {
        console.log('📩 Received response from background:', response);
        if (chrome.runtime.lastError) {
          console.error('❌ Runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.success) {
          console.log('✅ Pull successful:', response.data);
          resolve(response.data);
        } else {
          console.error('❌ Pull failed:', response);
          reject(new Error(response?.error || 'Failed to pull model'));
        }
      });
    });
    
    hidePullProgress();
    showModelStatus(`Successfully pulled model: ${formatModelDisplayName(modelName)}`, 'success');
    modelPullInput.value = '';
    
    // Refresh model list and dropdown
    await loadModelList();
    await loadAvailableModels();
    
  } catch (error) {
    console.error('Error pulling model:', error);
    hidePullProgress();
    
    // Format error message with helpful hints
    let errorMessage = `Error pulling model ${formatModelDisplayName(modelName)}: ${error.message}`;
    
    // Add specific hints based on error type
    if (error.message.includes('GGUF')) {
      errorMessage += '\n\n💡 Hint: Look for models with "-GGUF" in the name or from TheBloke on HuggingFace.';
    } else if (error.message.includes('invalid model name')) {
      errorMessage += '\n\n💡 Hint: Valid formats:\n• llama2\n• mistral\n• theBloke/Llama-2-7B-Chat-GGUF';
    }
    
    showModelStatus(errorMessage, 'error');
  } finally {
    isPulling = false;
    pullModelBtn.disabled = false;
    pullModelBtn.textContent = 'Pull';
  }
}

// Delete a model
async function deleteModel(modelName) {
  const url = urlInput.value.trim();
  
  if (!confirm(`Are you sure you want to delete the model "${formatModelDisplayName(modelName)}"?`)) {
    return;
  }
  
  try {
    // Disable all delete buttons
    const deleteButtons = document.querySelectorAll('.model-delete-btn');
    deleteButtons.forEach(btn => btn.disabled = true);
    
    showModelStatus(`Deleting model: ${formatModelDisplayName(modelName)}...`, 'info');
    
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'deleteModel',
        data: {
          url: url,
          modelName: modelName
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to delete model'));
        }
      });
    });
    
    showModelStatus(`Successfully deleted model: ${formatModelDisplayName(modelName)}`, 'success');
    
    // Refresh model list and dropdown
    await loadModelList();
    await loadAvailableModels();
    
    // If deleted model was selected, clear selection
    if (modelSelect.value === modelName) {
      modelSelect.value = '';
    }
    
  } catch (error) {
    console.error('Error deleting model:', error);
    showModelStatus(`Error deleting model ${formatModelDisplayName(modelName)}: ${error.message}`, 'error');
  } finally {
    // Re-enable delete buttons
    const deleteButtons = document.querySelectorAll('.model-delete-btn');
    deleteButtons.forEach(btn => btn.disabled = false);
  }
}

// Show model operation status
function showModelStatus(message, type) {
  // Handle multiline messages
  if (message.includes('\n')) {
    // Convert to HTML with line breaks
    modelOperationStatus.innerHTML = message.split('\n').map(line => {
      // Add special formatting for hints
      if (line.includes('💡 Hint:')) {
        return `<strong>${line}</strong>`;
      }
      // Format bullet points
      if (line.trim().startsWith('•')) {
        return `<span style="margin-left: 20px;">${line}</span>`;
      }
      return line;
    }).join('<br>');
  } else {
    modelOperationStatus.textContent = message;
  }
  
  modelOperationStatus.className = `status ${type}`;
  modelOperationStatus.style.display = 'block';
  
  // Auto-hide after 5 seconds for success/info, longer for errors
  const hideDelay = type === 'error' ? 10000 : 5000;
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      modelOperationStatus.style.display = 'none';
    }, hideDelay);
  }
}

// Show pull progress bar
function showPullProgress(percentage, statusText) {
  console.log(`📊 Showing progress: ${percentage}% - ${statusText}`);
  pullProgressContainer.style.display = 'block';
  pullProgressFill.style.width = `${percentage}%`;
  pullProgressText.textContent = statusText || '';
  
  // Force a reflow to ensure the progress bar updates
  pullProgressFill.offsetHeight;
}

// Hide pull progress bar
function hidePullProgress() {
  pullProgressContainer.style.display = 'none';
  pullProgressFill.style.width = '0%';
  pullProgressText.textContent = '';
}

// Handle pull progress updates from background script
function handlePullProgress(data) {
  if (!data) return;
  
  console.log('📥 Progress update received:', data);
  
  let percentage = 0;
  let statusText = data.status || '';
  
  // Calculate progress percentage if we have completed/total info
  if (data.completed !== undefined && data.total !== undefined) {
    percentage = Math.round((data.completed / data.total) * 100);
    const completed = formatBytes(data.completed);
    const total = formatBytes(data.total);
    statusText = `${data.status || 'Downloading'}: ${completed} / ${total} (${percentage}%)`;
  } else if (data.status) {
    // Handle status-only updates
    if (data.status.includes('pulling')) {
      percentage = 5; // Show initial progress
      statusText = data.status;
    } else if (data.status.includes('resolving')) {
      percentage = 10;
      statusText = 'Resolving model...';
    } else if (data.status.includes('downloading')) {
      percentage = percentage || 15; // Default if no specific progress
      statusText = data.status;
    } else if (data.status.includes('verifying')) {
      percentage = 90; // Near completion for verification
      statusText = data.status;
    } else if (data.status.includes('success') || data.status.includes('complete')) {
      percentage = 100;
      statusText = 'Pull completed successfully';
    } else {
      statusText = data.status;
    }
  }
  
  showPullProgress(percentage, statusText);
  
  // Auto-hide progress bar when complete
  if (percentage >= 100) {
    setTimeout(() => {
      hidePullProgress();
    }, 2000);
  }
  
  // Also update the main status for important messages
  if (data.status && (data.status.includes('error') || data.status.includes('success'))) {
    const type = data.status.includes('error') ? 'error' : 'success';
    showModelStatus(data.status, type);
  }
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
  
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    testConnection(true);
  }
});

// Function to load and display conversation history
async function loadConversationHistory() {
  try {
    historyContent.innerHTML = '<div class="history-loading">Loading conversations...</div>';
    
    const result = await chrome.storage.local.get(['conversationHistory']);
    const history = result.conversationHistory || [];
    
    if (history.length === 0) {
      historyContent.innerHTML = '<div class="history-empty">No conversations yet. Start using the extension to see your history here!</div>';
      return;
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let historyHtml = '';
    history.forEach((conversation, index) => {
      const date = new Date(conversation.timestamp);
      const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      // Truncate text for display
      const originalText = conversation.originalText.length > 80 ? 
        conversation.originalText.substring(0, 80) + '...' : conversation.originalText;
      const response = conversation.response.length > 100 ? 
        conversation.response.substring(0, 100) + '...' : conversation.response;
      
      historyHtml += `
        <div class="history-item" data-index="${index}">
          <div class="history-timestamp">${timeStr}</div>
          ${conversation.customPrompt ? `<div class="history-prompt">${conversation.customPrompt}</div>` : ''}
          <div class="history-text">${originalText}</div>
          <div class="history-response">${response}</div>
        </div>
      `;
    });
    
    historyContent.innerHTML = historyHtml;
    
    // Add click listeners to history items
    document.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        showConversationDetails(history[index]);
      });
    });
    
  } catch (error) {
    console.error('Error loading conversation history:', error);
    historyContent.innerHTML = '<div class="history-empty">Error loading conversations.</div>';
  }
}

// Function to show conversation details in a modal-like view
function showConversationDetails(conversation) {
  const date = new Date(conversation.timestamp);
  const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  
  const detailsHtml = `
    <div style="padding: 15px; background: #0d1117; border-radius: 8px; margin: 10px 0; border: 1px solid #30363d;">
      <div style="font-size: 11px; color: #7d8590; margin-bottom: 10px;">
        📅 ${timeStr} | 🌐 ${conversation.title || 'Unknown page'}
      </div>
      ${conversation.customPrompt ? `
        <div style="margin-bottom: 10px;">
          <div style="font-size: 12px; color: #58a6ff; font-weight: 600; margin-bottom: 5px;">PROMPT:</div>
          <div style="font-size: 11px; color: #e6edf3; line-height: 1.4;">${conversation.customPrompt}</div>
        </div>
      ` : ''}
      <div style="margin-bottom: 10px;">
        <div style="font-size: 12px; color: #58a6ff; font-weight: 600; margin-bottom: 5px;">ORIGINAL TEXT:</div>
        <div style="font-size: 11px; color: #e6edf3; line-height: 1.4; max-height: 100px; overflow-y: auto;">${conversation.originalText}</div>
      </div>
      <div>
        <div style="font-size: 12px; color: #238636; font-weight: 600; margin-bottom: 5px;">AI RESPONSE:</div>
        <div style="font-size: 11px; color: #e6edf3; line-height: 1.4; max-height: 150px; overflow-y: auto; white-space: pre-wrap;">${conversation.response}</div>
      </div>
      <div style="margin-top: 10px; text-align: right;">
        <button class="copy-response-btn"
                data-response="${conversation.response.replace(/"/g, '&quot;')}"
                style="background: #238636; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">
          Copy Response
        </button>
      </div>
    </div>
  `;
  
  // Replace current history content with details view
  historyContent.innerHTML = `
    <div style="padding: 10px;">
      <button class="back-to-history-btn"
              style="background: #21262d; color: #e6edf3; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-bottom: 10px;">
        ← Back to History
      </button>
      ${detailsHtml}
    </div>
  `;
  
  // Add event listeners to dynamically created buttons
  const backBtn = historyContent.querySelector('.back-to-history-btn');
  if (backBtn) {
    backBtn.addEventListener('click', loadConversationHistory);
  }
  
  const copyBtn = historyContent.querySelector('.copy-response-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const responseText = this.getAttribute('data-response').replace(/&quot;/g, '"');
      copyToClipboard(responseText);
      this.textContent = 'Copied!';
      setTimeout(() => {
        this.textContent = 'Copy Response';
      }, 2000);
    });
  }
}

// Helper function to copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Text copied to clipboard');
  }).catch(err => {
    console.error('Error copying text: ', err);
  });
}

