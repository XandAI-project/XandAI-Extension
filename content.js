// Initial Chrome context verification

// Global variables
let selectionButton = null;
let selectedText = '';

// Function to create send button
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

// Function to show button near selection
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

    // Try to load saved settings from storage
    let settings = {};
    
    try {
      settings = await new Promise((resolve) => {
        chrome.storage.sync.get(['ollamaUrl', 'ollamaModel', 'promptTemplate'], (result) => {
          resolve({
            ollamaUrl: result.ollamaUrl || 'http://localhost:11434',
            ollamaModel: result.ollamaModel || '',
            promptTemplate: result.promptTemplate || ''
          });
        });
      });
    } catch (error) {
      console.warn('Error loading settings, using defaults:', error);
      settings = {
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: '',
        promptTemplate: ''
      };
    }

    const url = settings.ollamaUrl;
    const model = settings.ollamaModel;
    const promptTemplate = settings.promptTemplate;

    // Check if model is selected
    if (!model) {
      throw new Error('No model selected. Please select a model in the extension settings.');
    }

    // Build final prompt
    let finalPrompt = text;

    // Priority: customPrompt > promptTemplate > text only
    if (customPrompt.trim()) {
      finalPrompt = `${customPrompt}\n\nText:\n${text}`;
    } else if (promptTemplate.trim()) {
      finalPrompt = `${promptTemplate}\n\nText:\n${text}`;
    }

    // Send request through background script
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

    // Show response in modal
    const promptUsed = customPrompt || promptTemplate;
    showResponseModal(text, response.response, promptUsed);

  } catch (error) {
    console.error('Error sending to Ollama:', error);
    showNotification('Error connecting to Ollama: ' + error.message, 'error');
  }
}

    // Function to show notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `ollama-notification ollama-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Function to show custom prompt modal
function showPromptModal(text) {
      // Modal creation for text prompt

  try {
    const modal = document.createElement('div');
    modal.className = 'ollama-modal';

    // Escape HTML to avoid issues
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

    // Focus on prompt textarea
    const promptInput = modal.querySelector('.ollama-prompt-input');
    promptInput.focus();

    // Event listeners
    modal.querySelector('.ollama-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.ollama-cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Send custom prompt
    modal.querySelector('.ollama-send-final-btn').addEventListener('click', async () => {
      const customPrompt = promptInput.value.trim();
      // Sending with custom prompt
      modal.remove();
      await sendToOllama(text, customPrompt);
    });

    // Open in separate window
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



    // Enter to send (Ctrl+Enter for line break)
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

// Function to show response modal
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

  // Event listeners to close modal
  modal.querySelector('.ollama-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.ollama-close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Event listeners for text selection
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Text selection detection

    if (text.length > 0) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Button position near selection
      const x = rect.left + (rect.width / 2) - 75; // Center button
      const y = rect.top + window.scrollY;

      // Showing button at position
      showButton(x, y);
    } else {
      // No text selected, hiding button
      hideButton();
    }
  }, 100);
});

// Hide button when clicking elsewhere
document.addEventListener('mousedown', (e) => {
  if (selectionButton && !selectionButton.contains(e.target)) {
    hideButton();
  }
});

// Hide button when pressing ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideButton();
  }
});

// Function to open in separate window
async function openInWindow(text, prompt = '') {
  try {
    // Opening window with text

    // Load settings from storage
    let settings = {};
    
    try {
      settings = await new Promise((resolve) => {
        chrome.storage.sync.get(['ollamaUrl', 'ollamaModel', 'promptTemplate'], (result) => {
          resolve({
            ollamaUrl: result.ollamaUrl || 'http://localhost:11434',
            ollamaModel: result.ollamaModel || '',
            promptTemplate: result.promptTemplate || ''
          });
        });
      });
    } catch (error) {
      console.warn('Error loading settings in openInWindow:', error);
      settings = {
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: '',
        promptTemplate: ''
      };
    }

    // Save data to sessionStorage for new window
    const windowData = {
      text: text,
      prompt: prompt,
      timestamp: Date.now(),
      settings: settings // Include settings
    };

    sessionStorage.setItem('ollamaWindowData', JSON.stringify(windowData));

    // Calculate window size
    const width = 800;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    // Get extension URL
    let extensionUrl;
    try {
      extensionUrl = chrome.runtime.getURL('window.html');
    } catch (error) {
             throw new Error('chrome.runtime.getURL is not available: ' + error.message);
    }

    // Open new window
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

    // Fallback: use normal modal
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