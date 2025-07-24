// DOM elements
const form = document.getElementById('settings-form');
const urlInput = document.getElementById('ollama-url');
const modelSelect = document.getElementById('ollama-model');
const testBtn = document.getElementById('test-btn');
const statusDiv = document.getElementById('status');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const promptTemplate = document.getElementById('prompt-template');
const savePromptBtn = document.getElementById('save-prompt-btn');
const clearPromptBtn = document.getElementById('clear-prompt-btn');

// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await chrome.storage.sync.get(['ollamaUrl', 'ollamaModel', 'promptTemplate']);
    
    urlInput.value = settings.ollamaUrl || 'http://localhost:11434';
    promptTemplate.value = settings.promptTemplate || '';
    
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

// Toggle settings panel
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('show');
});

// Save prompt template
savePromptBtn.addEventListener('click', async () => {
  try {
    await chrome.storage.sync.set({ promptTemplate: promptTemplate.value });
    showStatus('Prompt saved!', 'success');
  } catch (error) {
    console.error('Error saving prompt:', error);
    showStatus('Error saving prompt', 'error');
  }
});

// Clear prompt template
clearPromptBtn.addEventListener('click', async () => {
  promptTemplate.value = '';
  try {
    await chrome.storage.sync.set({ promptTemplate: '' });
    showStatus('Prompt cleared!', 'info');
  } catch (error) {
    console.error('Error clearing prompt:', error);
    showStatus('Error clearing prompt', 'error');
  }
});

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
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved!', 'success');
    
    // Test connection after saving
    setTimeout(() => testConnection(false), 1000);
  } catch (error) {
    console.error('Error saving:', error);
    showStatus('Error saving settings', 'error');
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
    option.textContent = model.name;
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