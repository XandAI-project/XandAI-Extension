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
  
  // Handler for side chat
  if (request.action === 'chatStream') {
    handleChatStream(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handler for storage operations (for side chat)
  if (request.action === 'getStorage') {
    chrome.storage.local.get(request.data.keys, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  
  if (request.action === 'setStorage') {
    chrome.storage.local.set(request.data, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
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

// Function to handle chat streaming
async function handleChatStream(requestData) {
  try {
    const { url, model, messages } = requestData;
    
    console.log('🗨️ Starting chat stream:', { model, messageCount: messages.length });
    
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Chat failed with status ${response.status}: ${errorText}`);
      
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch (e) {
        errorMessage = errorText || response.statusText;
      }
      
      throw new Error(errorMessage);
    }
    
    // For streaming, we'll need to handle this differently
    // Since we can't stream directly through chrome messages,
    // we'll return the response for the content script to handle
    return { 
      status: 'streaming',
      message: 'Stream started, handle in content script'
    };
    
  } catch (error) {
    console.error('❌ Background error in chat:', error);
    throw error;
  }
}

// Function to pull a model from Ollama with streaming progress
async function handlePullModel(requestData) {
  try {
    const { url, modelName } = requestData;
    
    console.log(`🚀 Starting pull for model: ${modelName} from ${url}`);
    console.log(`📦 Full request data:`, requestData);
    
    const pullUrl = `${url}/api/pull`;
    const requestBody = {
      name: modelName,
      stream: true
    };
    
    console.log(`🔗 Pull URL: ${pullUrl}`);
    console.log(`📋 Request body:`, JSON.stringify(requestBody));
    
    // Special handling for models that might need formatting
    if (modelName.includes('/') && !modelName.startsWith('hf.co/')) {
      console.log(`⚠️ Model name contains '/' but no prefix. Ollama might need 'hf.co/' prefix.`);
    }
    
    const response = await fetch(pullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log(`📡 Response headers:`, response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Pull failed with status ${response.status}: ${errorText}`);
      
      // Try to parse JSON error response
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch (e) {
        // If not JSON, use the text as is
        errorMessage = errorText || response.statusText;
      }
      
      throw new Error(errorMessage);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lineCount = 0;
    let isCompleted = false;
    let lastStatus = '';
    
    console.log('📖 Starting to read stream...');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream reading completed');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            lineCount++;
            try {
              const data = JSON.parse(line);
              
              console.log(`📊 Progress update #${lineCount}:`, data);
              
              // Track status
              if (data.status) {
                lastStatus = data.status;
              }
              
              // Send progress update to popup
              chrome.runtime.sendMessage({
                action: 'pullProgress',
                data: data
              }).catch((error) => {
                console.warn('⚠️ Could not send progress to popup (might be closed):', error);
              });
              
              // Check for actual completion (not just any status with "success")
              if (data.status && (
                data.status === 'success' || 
                data.status.includes('verifying sha256 digest') ||
                (data.status.includes('success') && data.completed)
              )) {
                console.log('✅ Model pull completed successfully');
                isCompleted = true;
              }
              
              // Check for errors
              if (data.error) {
                console.error('❌ Pull error:', data.error);
                // Extract the actual error message from nested error strings
                let errorMessage = data.error;
                
                // Try to extract the most relevant error message
                const errorPatterns = [
                  /{"error":"([^"]+)"}/,
                  /400:\s*{"error":"([^"]+)"}/,
                  /pull model manifest:\s*\d+:\s*{"error":"([^"]+)"}/
                ];
                
                for (const pattern of errorPatterns) {
                  const match = errorMessage.match(pattern);
                  if (match && match[1]) {
                    errorMessage = match[1];
                    break;
                  }
                }
                
                throw new Error(errorMessage);
              }
              
            } catch (parseError) {
              console.error(`❌ Error parsing line #${lineCount}:`, line);
              console.error('Parse error:', parseError);
            }
          }
        }
      }
      
      // Only return success if actually completed
      if (isCompleted) {
        return { status: 'success', message: 'Model pulled successfully' };
      } else {
        console.warn('⚠️ Stream ended without completion status. Last status:', lastStatus);
        return { status: 'incomplete', message: 'Pull ended without confirmation', lastStatus };
      }
      
    } finally {
      reader.releaseLock();
    }
    
  } catch (error) {
    console.error('❌ Background error pulling model:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Provide more user-friendly error messages
    let userMessage = error.message;
    
    if (error.message.includes('Failed to fetch')) {
      userMessage = 'Cannot connect to Ollama. Please ensure Ollama is running and the URL is correct.';
    } else if (error.message.includes('404')) {
      userMessage = 'Model not found. Please check the model name.';
    } else if (error.message.includes('CORS')) {
      userMessage = 'CORS error. Please check your Ollama configuration.';
    } else if (error.message.includes('invalid model name')) {
      userMessage = 'Invalid model name. Please check the format and try again.';
    } else if (error.message.includes('not GGUF') || error.message.includes('not compatible')) {
      userMessage = 'This model is not in GGUF format or not compatible with Ollama. Try searching for a GGUF version of the model (e.g., add "-GGUF" to your search).';
    }
    
    throw new Error(userMessage);
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