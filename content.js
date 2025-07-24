// Verificação inicial do contexto Chrome

// Variáveis globais
let selectionButton = null;
let selectedText = '';

// Função para criar o botão de envio
function createSendButton() {
  const button = document.createElement('div');
  button.id = 'ollama-send-button';
  button.innerHTML = '🤖 Send to Ollama';
  button.className = 'ollama-send-btn';

  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (selectedText.trim()) {
      try {
        showPromptModal(selectedText);
        hideButton();
      } catch (error) {
        console.error('Error showing modal:', error);
        showNotification('Error opening prompt', 'error');
      }
    } else {
      showNotification('No text selected', 'error');
    }
  });

  return button;
}

// Função para mostrar o botão próximo à seleção
function showButton(x, y) {
  hideButton();

  try {
    selectionButton = createSendButton();
    selectionButton.style.left = x + 'px';
    selectionButton.style.top = (y - 40) + 'px';

    document.body.appendChild(selectionButton);

    // Auto-hide após 5 segundos
    setTimeout(hideButton, 5000);
  } catch (error) {
            console.error('Error showing button:', error);
  }
}

// Função para esconder o botão
function hideButton() {
  if (selectionButton) {
    selectionButton.remove();
    selectionButton = null;
  }
}

// Função para enviar texto para Ollama
async function sendToOllama(text, customPrompt = '') {
  try {
    showNotification('Sending to Ollama...', 'info');

    // Configurações padrão (sempre disponíveis)
    let settings = {
      ollamaUrl: 'http://192.168.3.70:11434',
      ollamaModel: 'hf.co/unsloth/gemma-3n-E4B-it-GGUF:latest',
      promptTemplate: ''
    };

    // Tentar carregar configurações salvas (apenas se disponível)
    try {
      const savedSettings = settings
      settings = { ...settings, ...savedSettings };
    } catch (error) {
             console.warn('Using default settings due to error:', error);
    }

    const url = settings.ollamaUrl;
    const model = settings.ollamaModel;
    const promptTemplate = settings.promptTemplate;

    // Construir prompt final
    let finalPrompt = text;

    // Prioridade: customPrompt > promptTemplate > texto apenas
    if (customPrompt.trim()) {
      finalPrompt = `${customPrompt}\n\nText:\n${text}`;
    } else if (promptTemplate.trim()) {
      finalPrompt = `${promptTemplate}\n\nText:\n${text}`;
    }

    // Enviar request através do background script
    const response = await new Promise((resolve, reject) => {
      try {
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
          } else if (response?.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Invalid response from background script'));
          }
        });
      } catch (error) {
        reject(new Error('Error sending message to background: ' + error.message));
      }
    });

    showNotification('Response received from Ollama!', 'success');

    // Mostrar resposta em um modal
    const promptUsed = customPrompt || promptTemplate;
    showResponseModal(text, response.response, promptUsed);

  } catch (error) {
    console.error('Error sending to Ollama:', error);
    showNotification('Error connecting to Ollama: ' + error.message, 'error');
  }
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `ollama-notification ollama-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Função para mostrar modal de prompt personalizado
function showPromptModal(text) {
      // Modal creation for text prompt

  try {
    const modal = document.createElement('div');
    modal.className = 'ollama-modal';

    // Escapar HTML para evitar problemas
    const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    modal.innerHTML = `
      <div class="ollama-modal-content">
        <div class="ollama-modal-header">
          <h3>🤖 Send to Ollama</h3>
          <span class="ollama-close">&times;</span>
        </div>
        <div class="ollama-modal-body">
                     <div class="ollama-prompt-section">
             <h4>Prompt (optional):</h4>
             <textarea class="ollama-prompt-input" placeholder="e.g.: Summarize this text in 3 main points..."></textarea>
           </div>
           <div class="ollama-text-section">
             <h4>Selected text:</h4>
            <div class="ollama-selected-text">${escapedText}</div>
          </div>
        </div>
                 <div class="ollama-modal-footer">
           <button class="ollama-send-final-btn">🚀 Send</button>
           <button class="ollama-window-btn">🗗 Open in Window</button>
           <button class="ollama-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    // Modal added to DOM

    // Focar na textarea do prompt
    const promptInput = modal.querySelector('.ollama-prompt-input');
    promptInput.focus();

    // Event listeners
    modal.querySelector('.ollama-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.ollama-cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Enviar prompt personalizado
    modal.querySelector('.ollama-send-final-btn').addEventListener('click', async () => {
      const customPrompt = promptInput.value.trim();
      // Sending with custom prompt
      modal.remove();
      await sendToOllama(text, customPrompt);
    });

    // Abrir em janela separada
    modal.querySelector('.ollama-window-btn').addEventListener('click', async () => {
      const customPrompt = promptInput.value.trim();
      modal.remove();

      try {
        await openInWindow(text, customPrompt);
      } catch (error) {
        console.error('Error opening window:', error);
        showNotification('Error opening window: ' + error.message, 'error');
      }
    });



    // Enter para enviar (Ctrl+Enter para quebra de linha)
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        modal.querySelector('.ollama-send-final-btn').click();
      }
    });

  } catch (error) {
    console.error('Error creating modal:', error);
    showNotification('Error creating modal: ' + error.message, 'error');
  }
}

// Função para mostrar modal com resposta
function showResponseModal(originalText, response, customPrompt = '') {
  const modal = document.createElement('div');
  modal.className = 'ollama-modal';

  let promptSection = '';
  if (customPrompt) {
    promptSection = `
             <div class="ollama-custom-prompt">
         <h4>Prompt Used:</h4>
        <p>${customPrompt}</p>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="ollama-modal-content">
             <div class="ollama-modal-header">
         <h3>Ollama Response</h3>
        <span class="ollama-close">&times;</span>
      </div>
      <div class="ollama-modal-body">
        ${promptSection}
                 <div class="ollama-original-text">
           <h4>Original Text:</h4>
          <p>${originalText}</p>
        </div>
                 <div class="ollama-response">
           <h4>Response:</h4>
          <p>${response}</p>
        </div>
      </div>
      <div class="ollama-modal-footer">
                 <button class="ollama-copy-btn" onclick="navigator.clipboard.writeText('${response.replace(/'/g, "\\'")}')">
           Copy Response
         </button>
         <button class="ollama-close-btn">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners para fechar modal
  modal.querySelector('.ollama-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.ollama-close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Event listeners para seleção de texto
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Text selection detection

    if (text.length > 0) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Posição do botão próxima à seleção
      const x = rect.left + (rect.width / 2) - 75; // Centralizar botão
      const y = rect.top + window.scrollY;

      // Showing button at position
      showButton(x, y);
    } else {
      // No text selected, hiding button
      hideButton();
    }
  }, 100);
});

// Esconder botão quando clicar em outro lugar
document.addEventListener('mousedown', (e) => {
  if (selectionButton && !selectionButton.contains(e.target)) {
    hideButton();
  }
});

// Esconder botão ao pressionar ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideButton();
  }
});

// Função para abrir em janela separada
async function openInWindow(text, prompt = '') {
  try {
    // Opening window with text

    // Configurações padrão
    let settings = {
      ollamaUrl: 'http://192.168.3.70:11434',
      ollamaModel: 'hf.co/unsloth/gemma-3n-E4B-it-GGUF:latest',
      promptTemplate: ''
    };

    // Tentar carregar configurações salvas
    try {
      const savedSettings = settings
      settings = { ...settings, ...savedSettings };
    } catch (error) {
      console.warn('Error loading settings in openInWindow:', error);
    }

    // Salvar dados no sessionStorage para a nova janela
    const windowData = {
      text: text,
      prompt: prompt,
      timestamp: Date.now(),
      settings: settings // Incluir configurações
    };

    sessionStorage.setItem('ollamaWindowData', JSON.stringify(windowData));

    // Calcular tamanho da janela
    const width = 800;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    // Obter URL da extensão
    let extensionUrl;
    try {
      extensionUrl = chrome.runtime.getURL('window.html');
    } catch (error) {
             throw new Error('chrome.runtime.getURL is not available: ' + error.message);
    }

    // Abrir nova janela
    const windowFeatures = `
      width=${width},
      height=${height},
      left=${left},
      top=${top},
      resizable=yes,
      scrollbars=yes,
      menubar=no,
      toolbar=no,
      location=no,
      status=no
    `.replace(/\s+/g, '');

    const newWindow = window.open(extensionUrl, 'ollamaWindow', windowFeatures);

    if (newWindow) {
      newWindow.focus();
    } else {
             throw new Error('Popup blocked or error opening window');
    }

  } catch (error) {
    console.error('Error opening window:', error);
    showNotification('Error opening window: ' + error.message, 'error');

    // Fallback: usar modal normal
    showPromptModal(text);
  }
}

// Listener para mensagens do background (menu contextual)
try {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToOllama' && request.text) {
      showPromptModal(request.text);
      sendResponse({ success: true });
    }
  });
} catch (error) {
  console.warn('Error configuring message listener:', error);
} 