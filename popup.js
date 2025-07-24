// DOM elements
const form = document.getElementById('settings-form');
const urlInput = document.getElementById('ollama-url');
const modelInput = document.getElementById('ollama-model');
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
    
    urlInput.value = settings.ollamaUrl || 'http://192.168.3.70:11434';
    modelInput.value = settings.ollamaModel || 'phi4:latest';
    promptTemplate.value = settings.promptTemplate || '';
    
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
    ollamaModel: modelInput.value.trim()
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
      
      // Check if specified model exists
      if (data.models && modelInput.value.trim()) {
        const modelExists = data.models.some(m => 
          m.name.includes(modelInput.value.trim())
        );
        
        if (!modelExists && showResult) {
          showStatus(`Warning: Model "${modelInput.value}" not found`, 'error');
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

// Listener for URL changes (test automatically)
urlInput.addEventListener('blur', () => {
  if (urlInput.value.trim() && isValidUrl(urlInput.value.trim())) {
    testConnection(false);
  }
});

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