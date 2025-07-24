// Service Worker para Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  // Criar menu contextual
  chrome.contextMenus.create({
    id: 'sendToOllama',
    title: 'Send to Ollama',
    contexts: ['selection']
  });
  
  // Configurações padrão
  chrome.storage.sync.set({
    ollamaUrl: 'http://192.168.3.70:11434',
    ollamaModel: 'hf.co/unsloth/gemma-3n-E4B-it-GGUF:latest',
    promptTemplate: '',
    autoShow: true
  });
});

// Handler para menu contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sendToOllama' && info.selectionText) {
    // Enviar comando para content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'sendToOllama',
      text: info.selectionText
    });
  }
});

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['ollamaUrl', 'ollamaModel', 'promptTemplate'], (result) => {
      sendResponse(result);
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