// JavaScript for Ollama prompt window
let selectedText = '';
let promptInput;
let selectedTextDiv;
let sendBtn;
let statusDiv;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Window.js loaded
  
  promptInput = document.getElementById('prompt-input');
  selectedTextDiv = document.getElementById('selected-text');
  sendBtn = document.getElementById('send-btn');
  statusDiv = document.getElementById('status');
  
  // Default settings as fallback
  window.ollamaSettings = {
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: '',
    promptTemplate: ''
  };
  
  // Receive data from parent window
  receiveDataFromParent();
  
  // Event listeners
  sendBtn.addEventListener('click', handleSend);
  
  // Keyboard shortcuts
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  });
  
  // Focus on prompt
  promptInput.focus();
  
  // Data loaded successfully
});

// Receive data from URL or storage
function receiveDataFromParent() {
  try {
    // Try to get data from URL
    const urlParams = new URLSearchParams(window.location.search);
    const textParam = urlParams.get('text');
    
    if (textParam) {
      selectedText = decodeURIComponent(textParam);
      selectedTextDiv.textContent = selectedText;
      // Text received via URL
    } else {
      // Try to get from sessionStorage as fallback
      const storedData = sessionStorage.getItem('ollamaWindowData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          selectedText = data.text || '';
          selectedTextDiv.textContent = selectedText;
          promptInput.value = data.prompt || '';
          
          // Save settings globally for later use
          if (data.settings) {
            window.ollamaSettings = Object.assign(window.ollamaSettings, data.settings);
            // Settings received from data
          }
          
          // Clear data after use
          sessionStorage.removeItem('ollamaWindowData');
          // Data received via sessionStorage
        } catch (parseError) {
          console.error('Error parsing sessionStorage data:', parseError);
        }
      } else {
        console.warn('No data found in sessionStorage');
      }
    }
    
    // Check if we have text
    if (!selectedText) {
      showStatus('No text provided', 'error');
      selectedTextDiv.textContent = 'No selected text was found.';
    }
    
  } catch (error) {
    console.error('Error receiving data:', error);
    showStatus('Error loading data', 'error');
  }
}

// Handle sending to Ollama
async function handleSend() {
  const customPrompt = promptInput.value.trim();
  
  if (!selectedText.trim()) {
          showStatus('No text available', 'error');
    return;
  }
  
  try {
         showStatus('Sending to Ollama...', 'info');
    sendBtn.disabled = true;
         sendBtn.textContent = '🔄 Sending...';
     
     await sendToOllama(selectedText, customPrompt);
     
   } catch (error) {
     console.error('Error:', error);
     showStatus('Error sending: ' + error.message, 'error');
  } finally {
    sendBtn.disabled = false;
         sendBtn.textContent = '🚀 Send to XandAI';
  }
}

// Function to send text to Ollama
async function sendToOllama(text, customPrompt = '') {
  try {
    // Use saved settings or defaults
    const settings = window.ollamaSettings || {};
    
    const url = settings.ollamaUrl || 'http://localhost:11434';
    const model = settings.ollamaModel || '';
    const promptTemplate = settings.promptTemplate || '';
    
    // Using settings for Ollama request
    
    // Build final prompt
    let finalPrompt = text;
    
    // Priority: customPrompt > promptTemplate > text only
         if (customPrompt.trim()) {
       finalPrompt = `${customPrompt}\n\nText:\n${text}`;
     } else if (promptTemplate.trim()) {
       finalPrompt = `${promptTemplate}\n\nText:\n${text}`;
    }
    
    // Enviar request através do background script
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'sendToOllama',
        data: {
          url: url,
          model: model,
          prompt: finalPrompt
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
    
         showStatus('Response received!', 'success');
    
    // Mostrar resposta
    showResponseInWindow(text, response.response, customPrompt || promptTemplate);
    
  } catch (error) {
         console.error('Error sending to Ollama:', error);
    throw error;
  }
}

// Mostrar resposta na mesma janela
function showResponseInWindow(originalText, response, promptUsed) {
  // Criar nova seção para a resposta
  const responseSection = document.createElement('div');
  responseSection.className = 'section';
     responseSection.innerHTML = `
     <h3>Ollama Response:</h3>
    <div class="selected-text" style="border-left-color: #238636; background: #0d4427;">
      ${response.replace(/\n/g, '<br>')}
    </div>
    <div style="margin-top: 10px; display: flex; gap: 10px;">
             <button class="btn btn-secondary" onclick="copyToClipboard('${response.replace(/'/g, "\\'")}')">
         📋 Copy Response
       </button>
       <button class="btn btn-secondary" onclick="showOriginalPrompt()">
         👁️ View Original Prompt
       </button>
    </div>
  `;
  
  // Inserir antes das ações
  const actionsDiv = document.querySelector('.actions');
  actionsDiv.parentNode.insertBefore(responseSection, actionsDiv);
  
  // Rolar para a resposta
  responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Salvar dados para referência
  window.ollamaData = {
    originalText,
    response,
    promptUsed
  };
}

// Copiar para clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
         showStatus('Response copied!', 'success');
  }).catch(err => {
         console.error('Error copying:', err);
     showStatus('Error copying', 'error');
  });
}

// Mostrar prompt original usado
function showOriginalPrompt() {
  if (window.ollamaData && window.ollamaData.promptUsed) {
         alert(`Prompt used:\n\n${window.ollamaData.promptUsed}`);
   } else {
     alert('No custom prompt was used.');
  }
}

// Mostrar status
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide após 3 segundos para success/info
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

// Detectar fechamento da janela para limpeza
window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('ollamaWindowData');
}); 