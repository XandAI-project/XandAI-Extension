// Initial Chrome context verification

// Global variables
let selectionButton = null;
let selectedText = '';

// Helper function to load settings robustly with fallbacks
async function loadSettingsRobustly(retries = 3) {
  console.log('🔧 loadSettingsRobustly: Starting settings load...');
  let retryCount = 0;
  
  while (retryCount < retries) {
    try {
      // Try sync storage first
      const syncSettings = await new Promise((resolve, reject) => {
        chrome.storage.sync.get(['ollamaUrl', 'ollamaModel'], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(result);
        });
      });
      
      console.log(`Settings loaded from sync storage (attempt ${retryCount + 1}):`, syncSettings);
      
      // If we have a valid model, return it
      if (syncSettings.ollamaModel && syncSettings.ollamaModel.trim() !== '') {
        const finalSettings = {
          ollamaUrl: syncSettings.ollamaUrl || 'http://localhost:11434',
          ollamaModel: syncSettings.ollamaModel
        };
        console.log('✅ loadSettingsRobustly: Found valid model in sync storage:', finalSettings);
        return finalSettings;
      }
      
      // Try local storage as fallback
      console.log('Sync storage empty or no model, trying local storage...');
      const localSettings = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['ollamaUrl', 'ollamaModel'], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(result);
        });
      });
      
      if (localSettings.ollamaModel && localSettings.ollamaModel.trim() !== '') {
        console.log('Found valid model in local storage:', localSettings.ollamaModel);
        return {
          ollamaUrl: localSettings.ollamaUrl || syncSettings.ollamaUrl || 'http://localhost:11434',
          ollamaModel: localSettings.ollamaModel
        };
      }
      
      // If no model found anywhere, increment retry
      throw new Error('No model found in any storage');
      
    } catch (error) {
      console.warn(`Error loading settings (attempt ${retryCount + 1}):`, error);
      retryCount++;
      
      if (retryCount >= retries) {
        // Try background script as final fallback
        try {
          console.log('Trying background script as final fallback...');
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({action: 'getSettings'}, resolve);
          });
          
          if (response && response.success && response.settings && response.settings.ollamaModel) {
            console.log('Got valid settings from background script:', response.settings);
            return response.settings;
          }
        } catch (bgError) {
          console.warn('Background script fallback failed:', bgError);
        }
        
        // Last resort: return defaults (will trigger validation error)
        console.warn('All fallbacks failed, returning defaults');
        return {
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: ''
        };
      } else {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
      }
    }
  }
}

// Function to create send button with options
function createSendButton() {
  const container = document.createElement('div');
  container.id = 'ollama-send-button-container';
  container.className = 'ollama-send-container';

  container.innerHTML = `
    <div class="ollama-send-btn-group">
      <button class="ollama-send-btn ollama-send-text" title="Send selected text">
        🤖 Text
      </button>
      <button class="ollama-send-btn ollama-send-html" title="Send HTML element">
        📝 HTML
      </button>
      <button class="ollama-send-btn ollama-send-page" title="Send full page">
        📄 Page
      </button>
    </div>
  `;

  // Event listeners for each button
  container.querySelector('.ollama-send-text').addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (selectedText.trim()) {
      try {
        showPromptModal(selectedText, 'Selected Text');
        hideButton();
      } catch (error) {
        console.error('Error showing modal:', error);
        showNotification('Error opening prompt', 'error');
      }
    } else {
      showNotification('No text selected', 'error');
    }
  });

  container.querySelector('.ollama-send-html').addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const elementHtml = getSelectedElementHtml();
      if (elementHtml) {
        showPromptModal(elementHtml, 'HTML Element');
        hideButton();
      } else {
        showNotification('Could not capture HTML element', 'error');
      }
    } catch (error) {
      console.error('Error getting HTML element:', error);
      showNotification('Error capturing HTML element', 'error');
    }
  });

  container.querySelector('.ollama-send-page').addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const pageHtml = getFullPageHtml();
      showPromptModal(pageHtml, 'Full Page HTML');
      hideButton();
    } catch (error) {
      console.error('Error getting page HTML:', error);
      showNotification('Error capturing page HTML', 'error');
    }
  });

  return container;
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

 // Global variables for request queue
 let requestQueue = [];
 let isProcessing = false;
 let currentToastId = null;

 // Function to process request queue
 async function processRequestQueue() {
   if (isProcessing || requestQueue.length === 0) {
     return;
   }

   isProcessing = true;
   const request = requestQueue.shift();
   
   // Update toast with new queue count
   updateToastQueue();

   try {
     await executeOllamaRequest(request);
   } catch (error) {
     console.error('Error processing request:', error);
     showNotification('Error processing request: ' + error.message, 'error');
   } finally {
     isProcessing = false;
     
     // Process next request in queue
     if (requestQueue.length > 0) {
       setTimeout(processRequestQueue, 100);
     }
   }
 }

   // Function to add request to queue
  function addToQueue(text, customPrompt = '', contentType = 'text') {
    const request = {
      id: Date.now() + Math.random(),
      text,
      customPrompt,
      contentType,
      timestamp: Date.now()
    };

    requestQueue.push(request);
    
    // Update toast with new queue count
    updateToastQueue();
    
        // Show queue status
     if (requestQueue.length > 1) {
       showNotification(`Request added to queue (${requestQueue.length} requests pending)`, 'info');
     }

    // Start processing
    processRequestQueue();
  }

       // Function to show persistent toast notification
   function showPersistentToast(message, promptPreview = '') {
     // Remove existing toast
     if (currentToastId) {
       const existing = document.getElementById(currentToastId);
       if (existing) existing.remove();
     }

     currentToastId = 'ollama-toast-' + Date.now();
     const toast = document.createElement('div');
     toast.id = currentToastId;
     toast.className = 'ollama-toast-sending';
     
     const displayText = promptPreview ? 
       `Sending: "${promptPreview.substring(0, 50)}${promptPreview.length > 50 ? '...' : ''}"` : 
       message;
     
     // Add queue information if there are items in queue
     const queueText = requestQueue.length > 0 ? `\nQueued: ${requestQueue.length}` : '';
     
     toast.textContent = displayText + queueText;
     document.body.appendChild(toast);
     
     return currentToastId;
   }

     // Function to hide persistent toast
   function hidePersistentToast() {
     if (currentToastId) {
       const toast = document.getElementById(currentToastId);
       if (toast) toast.remove();
       currentToastId = null;
     }
   }

   // Function to update toast with current queue status
   function updateToastQueue() {
     if (currentToastId) {
       const toast = document.getElementById(currentToastId);
       if (toast) {
         const currentText = toast.textContent;
         const sendingPart = currentText.split('\n')[0]; // Get the "Sending:" part
         const queueText = requestQueue.length > 0 ? `\nQueued: ${requestQueue.length}` : '';
         toast.textContent = sendingPart + queueText;
       }
     }
   }

// Main function to send text to Ollama (now uses queue)
async function sendToOllama(text, customPrompt = '') {
  addToQueue(text, customPrompt, 'text');
}

 // Function to execute Ollama request
 async function executeOllamaRequest(request) {
   const { text, customPrompt } = request;
   
   try {
     // Load settings using the robust helper function
     const settings = await loadSettingsRobustly();

     const url = settings.ollamaUrl;
     const model = settings.ollamaModel;

     console.log('About to send with URL:', url, 'and model:', model); // Enhanced debug log
     console.log('Model type:', typeof model, 'Model length:', model ? model.length : 'null/undefined');

     // Enhanced model validation with better error reporting
     if (!model) {
       console.error('Model is null, undefined, or empty:', model);
       throw new Error('No model selected. Please select a model in the extension settings.');
     }
     
     if (typeof model !== 'string') {
       console.error('Model is not a string:', typeof model, model);
       throw new Error('Invalid model format. Please select a model in the extension settings.');
     }
     
     if (model.trim() === '') {
       console.error('Model is empty or only whitespace:', `"${model}"`);
       throw new Error('No model selected. Please select a model in the extension settings.');
     }

     // Build final prompt
     let finalPrompt = text;

     // Priority: customPrompt > text only
     if (customPrompt.trim()) {
       finalPrompt = `${customPrompt}\n\nText:\n${text}`;
     }

     // Show persistent toast with prompt preview
     const promptPreview = customPrompt.trim() || 'Processing content';
     showPersistentToast('Sending to XandAI...', promptPreview);

           // Send request through background script (normal mode)
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

           // Hide persistent toast
      hidePersistentToast();

      showNotification('Response received from XandAI!', 'success');

      // Save to history with the complete response
      await saveToHistory(text, customPrompt, response.response, request.contentType || 'text');

      // Show response in modal
      showResponseModal(text, response.response, customPrompt);

   } catch (error) {
     console.error('Error sending to Ollama:', error);
     hidePersistentToast();
     showNotification('Error connecting to Ollama: ' + error.message, 'error');
   }
 }

// Function to save conversation to history
async function saveToHistory(originalText, customPrompt, response, contentType) {
  try {
    const timestamp = new Date().toISOString();
    const conversationId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    const historyEntry = {
      id: conversationId,
      timestamp: timestamp,
      originalText: originalText,
      customPrompt: customPrompt || '',
      response: response,
      contentType: contentType,
      url: window.location.href,
      title: document.title
    };

    // Get existing history
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['conversationHistory'], (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(data);
        }
      });
    });

    const history = result.conversationHistory || [];
    
    // Add new entry to beginning of array
    history.unshift(historyEntry);
    
    // Keep only last 100 conversations to avoid storage limits
    if (history.length > 100) {
      history.splice(100);
    }

    // Save updated history
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ conversationHistory: history }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('Conversation saved to history:', conversationId);
          resolve();
        }
      });
    });

  } catch (error) {
    console.error('Error saving to history:', error);
    // Don't throw - history saving shouldn't block the main flow
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
function showPromptModal(text, contentType = 'Selected Text') {
      // Modal creation for text prompt

  try {
    const modal = document.createElement('div');
    modal.className = 'ollama-modal';

    // Handle content differently based on type
    let displayContent = '';
    let placeholderText = '';
    
    if (contentType === 'HTML Element') {
      // For HTML content, show in a code block with syntax highlighting
      const escapedHtml = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      displayContent = `<pre class="ollama-html-content"><code>${escapedHtml}</code></pre>`;
      placeholderText = 'e.g.: Analyze this HTML structure and suggest improvements...';
    } else if (contentType === 'Full Page HTML') {
      // For full page, show truncated version
      const truncatedHtml = text.length > 2000 ? 
        text.substring(0, 2000) + '...\n\n[Content truncated - full HTML will be sent to AI]' : text;
      const escapedHtml = truncatedHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      displayContent = `<pre class="ollama-html-content"><code>${escapedHtml}</code></pre>`;
      placeholderText = 'e.g.: Review this webpage structure, identify SEO issues, or analyze the code quality...';
    } else {
      // Regular text content
      const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      displayContent = `<div class="ollama-selected-text">${escapedText}</div>`;
      placeholderText = 'e.g.: Summarize this text in 3 main points...';
    }

    modal.innerHTML = `
      <div class="ollama-modal-content">
        <div class="ollama-modal-header">
          <h3>🤖 Send to XandAI</h3>
          <span class="ollama-close">&times;</span>
        </div>
        <div class="ollama-modal-body">
                     <div class="ollama-prompt-section">
             <h4>Prompt (optional):</h4>
             <textarea class="ollama-prompt-input" placeholder="${placeholderText}"></textarea>
           </div>
           <div class="ollama-text-section">
             <h4>${contentType}:</h4>
            ${displayContent}
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
       
       // Route to appropriate function based on content type
       if (contentType === 'HTML Element') {
         sendHtmlToOllama(text, customPrompt);
       } else if (contentType === 'Full Page HTML') {
         sendPageToOllama(text, customPrompt);
       } else {
         sendToOllama(text, customPrompt);
       }
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
         <h3>XandAI Response</h3>
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
      // Use the robust settings loader
      const loadedSettings = await loadSettingsRobustly();
      settings = {
        ...loadedSettings,
        promptTemplate: ''
      };
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



// Function to get conversation history
async function getConversationHistory() {
  try {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['conversationHistory'], (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(data);
        }
      });
    });

    return result.conversationHistory || [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// Function to clear conversation history
async function clearConversationHistory() {
  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.remove(['conversationHistory'], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    
    showNotification('Histórico de conversas limpo!', 'success');
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    showNotification('Erro ao limpar histórico', 'error');
  }
}

// Function to get HTML element containing the selection
function getSelectedElementHtml() {
  try {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      
      // Find the closest element node
      let element = commonAncestor;
      if (element.nodeType === Node.TEXT_NODE) {
        element = element.parentElement;
      }
      
      // Get the outerHTML of the containing element
      return element.outerHTML;
    }
    return null;
  } catch (error) {
    console.error('Error getting selected element HTML:', error);
    return null;
  }
}

// Function to get full page HTML
function getFullPageHtml() {
  try {
    // Get the complete HTML including DOCTYPE
    const doctype = document.doctype ? 
      '<!DOCTYPE ' + document.doctype.name + '>' : '';
    return doctype + document.documentElement.outerHTML;
  } catch (error) {
    console.error('Error getting full page HTML:', error);
    return document.documentElement.outerHTML;
  }
}

 // Update modal to support queue system
 function showPromptModalWithQueue(text, contentType = 'Selected Text') {
   showPromptModal(text, contentType);
 }

 // Update sendToOllama function for HTML content
 function sendHtmlToOllama(text, customPrompt = '') {
   addToQueue(text, customPrompt, 'html');
 }

 // Update sendToOllama function for page content
 function sendPageToOllama(text, customPrompt = '') {
   addToQueue(text, customPrompt, 'page');
 }

 // Listener para mensagens do background (menu contextual)
try {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToOllama' && request.text) {
      showPromptModalWithQueue(request.text, 'Selected Text');
      sendResponse({ success: true });
    } else if (request.action === 'sendHtmlToOllama' && request.text) {
      const elementHtml = getSelectedElementHtml();
      if (elementHtml) {
        showPromptModalWithQueue(elementHtml, 'HTML Element');
      } else {
        showNotification('Could not capture HTML element', 'error');
      }
      sendResponse({ success: true });
    } else if (request.action === 'sendPageToOllama') {
      const pageHtml = getFullPageHtml();
      showPromptModalWithQueue(pageHtml, 'Full Page HTML');
      sendResponse({ success: true });
    }
  });
} catch (error) {
  console.warn('Error configuring message listener:', error);
}

 