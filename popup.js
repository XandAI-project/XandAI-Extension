// Elementos do DOM
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

// Carregar configurações salvas
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await chrome.storage.sync.get(['ollamaUrl', 'ollamaModel', 'promptTemplate']);
    
    urlInput.value = settings.ollamaUrl || 'http://192.168.3.70:11434';
    modelInput.value = settings.ollamaModel || 'phi4:latest';
    promptTemplate.value = settings.promptTemplate || '';
    
    // Testar conexão automaticamente
    await testConnection(false);
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    showStatus('Erro ao carregar configurações', 'error');
  }
});

// Toggle das configurações
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('show');
});

// Salvar prompt template
savePromptBtn.addEventListener('click', async () => {
  try {
    await chrome.storage.sync.set({ promptTemplate: promptTemplate.value });
    showStatus('Prompt salvo!', 'success');
  } catch (error) {
    console.error('Erro ao salvar prompt:', error);
    showStatus('Erro ao salvar prompt', 'error');
  }
});

// Limpar prompt template
clearPromptBtn.addEventListener('click', async () => {
  promptTemplate.value = '';
  try {
    await chrome.storage.sync.set({ promptTemplate: '' });
    showStatus('Prompt limpo!', 'info');
  } catch (error) {
    console.error('Erro ao limpar prompt:', error);
    showStatus('Erro ao limpar prompt', 'error');
  }
});

// Salvar configurações
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const settings = {
    ollamaUrl: urlInput.value.trim(),
    ollamaModel: modelInput.value.trim()
  };
  
  // Validar URL
  if (!isValidUrl(settings.ollamaUrl)) {
    showStatus('URL inválida', 'error');
    return;
  }
  
  try {
    await chrome.storage.sync.set(settings);
    showStatus('Configurações salvas!', 'success');
    
    // Testar conexão após salvar
    setTimeout(() => testConnection(false), 1000);
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showStatus('Erro ao salvar configurações', 'error');
  }
});

// Testar conexão
testBtn.addEventListener('click', () => testConnection(true));

// Função para testar conexão com Ollama
async function testConnection(showResult = true) {
  const url = urlInput.value.trim();
  
  if (!isValidUrl(url)) {
    updateConnectionStatus(false, 'URL inválida');
    if (showResult) showStatus('URL inválida', 'error');
    return;
  }
  
  try {
    updateConnectionStatus(null, 'Testando...');
    if (showResult) showStatus('Testando conexão...', 'info');
    
    // Testar endpoint de saúde
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const modelCount = data.models ? data.models.length : 0;
      
      updateConnectionStatus(true, `Conectado (${modelCount} modelos)`);
      if (showResult) {
        showStatus(`Conexão bem-sucedida! ${modelCount} modelos disponíveis`, 'success');
      }
      
      // Verificar se o modelo especificado existe
      if (data.models && modelInput.value.trim()) {
        const modelExists = data.models.some(m => 
          m.name.includes(modelInput.value.trim())
        );
        
        if (!modelExists && showResult) {
          showStatus(`Aviso: Modelo "${modelInput.value}" não encontrado`, 'error');
        }
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Erro de conexão:', error);
    updateConnectionStatus(false, 'Desconectado');
    
    if (showResult) {
      const errorMsg = error.message.includes('NetworkError') || error.message.includes('fetch') 
        ? 'Não foi possível conectar. Verifique se o Ollama está rodando.'
        : `Erro: ${error.message}`;
      showStatus(errorMsg, 'error');
    }
  }
}

// Atualizar status de conexão visual
function updateConnectionStatus(isOnline, text) {
  connectionText.textContent = text;
  connectionDot.className = 'status-dot';
  
  if (isOnline === true) {
    connectionDot.classList.add('online');
  } else if (isOnline === false) {
    connectionDot.classList.add('offline');
  }
  // Se isOnline for null, não adiciona classe (estado neutro)
}

// Mostrar mensagem de status
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide após 3 segundos
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Validar URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Listener para mudanças na URL (testar automaticamente)
urlInput.addEventListener('blur', () => {
  if (urlInput.value.trim() && isValidUrl(urlInput.value.trim())) {
    testConnection(false);
  }
});

// Atalhos de teclado
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