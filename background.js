// Service Worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'sendToOllama',
    title: 'Send Text to XandAI',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'sendHtmlToOllama',
    title: 'Send HTML Element to XandAI',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'sendPageToOllama', 
    title: 'Send Full Page to XandAI',
    contexts: ['page']
  });
  
  // Set default settings only if they don't exist
  chrome.storage.sync.get(['ollamaUrl', 'ollamaModel'], (result) => {
    const defaults = {};
    
    if (!result.ollamaUrl) {
      defaults.ollamaUrl = 'http://localhost:11434';
    }
    if (!result.ollamaModel) {
      defaults.ollamaModel = '';
    }
    if (!result.autoShow) {
      defaults.autoShow = true;
    }
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});

// Handler for context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sendToOllama' && info.selectionText) {
    // Send text to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'sendToOllama',
      text: info.selectionText,
      type: 'text'
    });
  } else if (info.menuItemId === 'sendHtmlToOllama' && info.selectionText) {
    // Send HTML element to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'sendHtmlToOllama',
      text: info.selectionText,
      type: 'html'
    });
  } else if (info.menuItemId === 'sendPageToOllama') {
    // Send full page to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'sendPageToOllama',
      type: 'page'
    });
  }
});

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['ollamaUrl', 'ollamaModel'], (result) => {
      if (chrome.runtime.lastError) {
        // Try local storage as fallback
        chrome.storage.local.get(['ollamaUrl', 'ollamaModel'], (localResult) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ 
              success: true, 
              settings: {
                ollamaUrl: localResult.ollamaUrl || 'http://localhost:11434',
                ollamaModel: localResult.ollamaModel || ''
              }
            });
          }
        });
      } else {
        sendResponse({ 
          success: true, 
          settings: {
            ollamaUrl: result.ollamaUrl || 'http://localhost:11434',
            ollamaModel: result.ollamaModel || ''
          }
        });
      }
    });
    return true; // Indica resposta assíncrona
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Novo handler para fazer requests para o Ollama
  if (request.action === 'sendToOllama') {
    handleOllamaRequest(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indica resposta assíncrona
  }



  // Handler for pulling models
  if (request.action === 'pullModel') {
    handlePullModel(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handler for deleting models
  if (request.action === 'deleteModel') {
    handleDeleteModel(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Função para fazer request para Ollama
async function handleOllamaRequest(requestData) {
  try {
    const { url, model, prompt } = requestData;
    
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Background error making request to Ollama:', error);
    throw error;
  }
}



// Handler para quando a extensão é desabilitada/removida
chrome.runtime.onSuspend.addListener(() => {
  // Extension suspended
});

// Function to pull a model from Ollama with streaming progress
async function handlePullModel(requestData) {
  try {
    const { url, modelName } = requestData;
    
    console.log(`Pulling model: ${modelName} from ${url}`);
    
    const response = await fetch(`${url}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              // Send progress update to popup
              chrome.runtime.sendMessage({
                action: 'pullProgress',
                data: data
              }).catch(() => {
                // Popup might be closed, ignore error
              });
              
              // Check for completion
              if (data.status && (data.status.includes('success') || data.status.includes('verifying sha256 digest'))) {
                console.log('Model pull completed successfully');
              }
              
            } catch (parseError) {
              console.warn('Error parsing streaming response:', parseError);
            }
          }
        }
      }
      
      return { status: 'success', message: 'Model pulled successfully' };
      
    } finally {
      reader.releaseLock();
    }
    
  } catch (error) {
    console.error('Background error pulling model:', error);
    throw error;
  }
}

// Function to delete a model from Ollama
async function handleDeleteModel(requestData) {
  try {
    const { url, modelName } = requestData;
    
    console.log(`Deleting model: ${modelName} from ${url}`);
    
    const response = await fetch(`${url}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    
    // Delete endpoint might return empty response
    let data = {};
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch (parseError) {
      // Empty response is OK for delete
      console.log('Empty response from delete endpoint (expected)');
    }
    
    console.log('Model delete response:', data);
    return data;
    
  } catch (error) {
    console.error('Background error deleting model:', error);
    throw error;
  }
}

// Verificar se Ollama está acessível (opcional)
async function checkOllamaConnection() {
  try {
    const settings = await chrome.storage.sync.get(['ollamaUrl']);
    const response = await fetch(`${settings.ollamaUrl}/api/tags`);
    return response.ok;
  } catch (error) {
    console.error('Error connecting to Ollama:', error);
    return false;
  }
} 