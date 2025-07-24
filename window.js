// JavaScript para a janela de prompt do Ollama
let selectedText = '';
let promptInput;
let selectedTextDiv;
let sendBtn;
let statusDiv;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log('Window.js carregado');
  
  promptInput = document.getElementById('prompt-input');
  selectedTextDiv = document.getElementById('selected-text');
  sendBtn = document.getElementById('send-btn');
  statusDiv = document.getElementById('status');
  
  // Configurações padrão como fallback
  window.ollamaSettings = {
    ollamaUrl: 'http://192.168.3.70:11434',
    ollamaModel: 'phi4:latest',
    promptTemplate: ''
  };
  
  // Receber dados da janela pai
  receiveDataFromParent();
  
  // Event listeners
  sendBtn.addEventListener('click', handleSend);
  
  // Atalhos de teclado
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  });
  
  // Focar no prompt
  promptInput.focus();
  
  console.log('Dados carregados:', { 
    text: selectedText.substring(0, 50) + '...', 
    settings: window.ollamaSettings 
  });
});

// Receber dados da URL ou storage
function receiveDataFromParent() {
  try {
    // Tentar obter dados da URL
    const urlParams = new URLSearchParams(window.location.search);
    const textParam = urlParams.get('text');
    
    if (textParam) {
      selectedText = decodeURIComponent(textParam);
      selectedTextDiv.textContent = selectedText;
      console.log('Texto recebido via URL');
    } else {
      // Tentar obter do sessionStorage como fallback
      const storedData = sessionStorage.getItem('ollamaWindowData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          selectedText = data.text || '';
          selectedTextDiv.textContent = selectedText;
          promptInput.value = data.prompt || '';
          
          // Salvar configurações globalmente para uso posterior
          if (data.settings) {
            window.ollamaSettings = Object.assign(window.ollamaSettings, data.settings);
            console.log('Configurações recebidas:', data.settings);
          }
          
          // Limpar dados após uso
          sessionStorage.removeItem('ollamaWindowData');
          console.log('Dados recebidos via sessionStorage');
        } catch (parseError) {
          console.error('Erro ao parsear dados do sessionStorage:', parseError);
        }
      } else {
        console.warn('Nenhum dado encontrado em sessionStorage');
      }
    }
    
    // Verificar se temos texto
    if (!selectedText) {
      showStatus('Nenhum texto foi fornecido', 'error');
      selectedTextDiv.textContent = 'Nenhum texto selecionado foi encontrado.';
    }
    
  } catch (error) {
    console.error('Erro ao receber dados:', error);
    showStatus('Erro ao carregar dados', 'error');
  }
}

// Manipular envio para Ollama
async function handleSend() {
  const customPrompt = promptInput.value.trim();
  
  if (!selectedText.trim()) {
    showStatus('Nenhum texto disponível', 'error');
    return;
  }
  
  try {
    showStatus('Enviando para Ollama...', 'info');
    sendBtn.disabled = true;
    sendBtn.textContent = '🔄 Enviando...';
    
    await sendToOllama(selectedText, customPrompt);
    
  } catch (error) {
    console.error('Erro:', error);
    showStatus('Erro ao enviar: ' + error.message, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '🚀 Enviar para Ollama';
  }
}

// Função para enviar texto para Ollama
async function sendToOllama(text, customPrompt = '') {
  try {
    // Usar configurações salvas ou padrões
    const settings = window.ollamaSettings || {};
    
    const url = settings.ollamaUrl || 'http://192.168.3.70:11434';
    const model = settings.ollamaModel || 'phi4:latest';
    const promptTemplate = settings.promptTemplate || '';
    
    console.log('Usando configurações:', { url, model, promptTemplate: promptTemplate ? 'definido' : 'vazio' });
    
    // Construir prompt final
    let finalPrompt = text;
    
    // Prioridade: customPrompt > promptTemplate > texto apenas
    if (customPrompt.trim()) {
      finalPrompt = `${customPrompt}\n\nTexto:\n${text}`;
    } else if (promptTemplate.trim()) {
      finalPrompt = `${promptTemplate}\n\nTexto:\n${text}`;
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
    
    showStatus('Resposta recebida!', 'success');
    
    // Mostrar resposta
    showResponseInWindow(text, response.response, customPrompt || promptTemplate);
    
  } catch (error) {
    console.error('Erro ao enviar para Ollama:', error);
    throw error;
  }
}

// Mostrar resposta na mesma janela
function showResponseInWindow(originalText, response, promptUsed) {
  // Criar nova seção para a resposta
  const responseSection = document.createElement('div');
  responseSection.className = 'section';
  responseSection.innerHTML = `
    <h3>Resposta do Ollama:</h3>
    <div class="selected-text" style="border-left-color: #238636; background: #0d4427;">
      ${response.replace(/\n/g, '<br>')}
    </div>
    <div style="margin-top: 10px; display: flex; gap: 10px;">
      <button class="btn btn-secondary" onclick="copyToClipboard('${response.replace(/'/g, "\\'")}')">
        📋 Copiar Resposta
      </button>
      <button class="btn btn-secondary" onclick="showOriginalPrompt()">
        👁️ Ver Prompt Original
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
    showStatus('Resposta copiada!', 'success');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showStatus('Erro ao copiar', 'error');
  });
}

// Mostrar prompt original usado
function showOriginalPrompt() {
  if (window.ollamaData && window.ollamaData.promptUsed) {
    alert(`Prompt usado:\n\n${window.ollamaData.promptUsed}`);
  } else {
    alert('Nenhum prompt personalizado foi usado.');
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