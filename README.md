# XandAI Chrome Extension

Chrome extension moderna para enviar texto selecionado para LLM local Ollama com chat lateral integrado.

## 🏗️ Nova Arquitetura

### Estrutura de Pastas
```
src/
├── core/
│   └── ChatManager.js    # Gerenciador de estado do chat
├── ui/
│   ├── SideChat.js      # Chat lateral principal  
│   └── sidechat.css     # Estilos do chat
└── content.js           # Script de conteúdo principal

tests/
├── ChatManager.test.js  # Testes do ChatManager
├── SideChat.test.js     # Testes do SideChat
├── jest.config.js       # Configuração do Jest
└── setup.js            # Setup dos testes
```

## 🚀 Principais Melhorias

### ChatManager
✅ Inicialização robusta e confiável  
✅ Prevenção de carregamentos duplicados  
✅ Sistema de fallback para páginas restritas  
✅ Recovery automático em caso de erro  

### SideChat
✅ Interface moderna e responsiva  
✅ Streaming de respostas em tempo real  
✅ Histórico persistente de conversas  
✅ Captura opcional de conteúdo da página  

### Sistema de Fallback
1. **Chat Lateral**: Integrado na página (preferido)
2. **Injeção Dinâmica**: Se content script não estiver carregado
3. **Chat Standalone**: Janela independente para páginas restritas

## 🧪 Testes

```bash
npm install        # Instalar dependências
npm test          # Executar testes
npm run test:watch # Modo watch
npm run test:coverage # Com coverage
```

### Cobertura
✅ ChatManager: Inicialização, toggle, recovery  
✅ SideChat: UI, messaging, formatação  
✅ Chrome APIs mockadas  
✅ Testes de integração  

## 🔧 API Principal

```javascript
// ChatManager
const chatManager = new ChatManager();
await chatManager.initialize();
const result = await chatManager.toggle();

// SideChat
const sideChat = new SideChat();
await sideChat.toggle();
await sideChat.sendMessage();
```

## 🛡️ Robustez

- **Prevenção de Duplicação**: Guard patterns em todos os scripts
- **Tratamento de Erros**: Try/catch com fallbacks
- **Recovery**: Reset automático em caso de falha
- **Performance**: Carregamento lazy e debounce

**Versão: 1.14** | **Licença: MIT**