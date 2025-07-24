# 🤖 Ollama Text Sender - Extensão Chrome

Uma extensão do Google Chrome que permite enviar texto selecionado em páginas web diretamente para seu LLM Ollama local.

## ✨ Funcionalidades

- **Seleção Simples**: Selecione qualquer texto em uma página web
- **Botão Flutuante**: Aparece automaticamente próximo ao texto selecionado
- **Menu Contextual**: Opção também disponível no menu do botão direito
- **Prompt Personalizado**: Digite prompts específicos para cada consulta
- **Janela Separada**: Abra o prompt em uma janela dedicada para mais espaço
- **Modal de Resposta**: Visualize a resposta do Ollama em um modal elegante
- **Configuração Fácil**: Interface simples para configurar URL e modelo
- **Teste de Conexão**: Verificação automática da conectividade com Ollama
- **Notificações**: Feedback visual do status das operações

## 🚀 Instalação

### Pré-requisitos
- Google Chrome ou Chromium
- Ollama instalado e rodando localmente
- Pelo menos um modelo baixado no Ollama

### Passos de Instalação

1. **Clone ou baixe este projeto**
   ```bash
   git clone <este-repositório>
   cd ollama-text-sender
   ```

2. **Abra o Chrome e vá para as extensões**
   - Digite `chrome://extensions/` na barra de endereços
   - Ou vá em Menu → Mais ferramentas → Extensões

3. **Ative o modo desenvolvedor**
   - Clique no botão "Modo do desenvolvedor" no canto superior direito

4. **Carregue a extensão**
   - Clique em "Carregar sem compactação"
   - Selecione a pasta do projeto
   - A extensão aparecerá na lista

5. **Configure a extensão**
   - Clique no ícone da extensão na barra de ferramentas
   - Ajuste a URL do Ollama (padrão: `http://192.168.3.70:11434`)
   - Defina o modelo (padrão: `phi4:latest`)
   - Clique em "Testar" para verificar a conexão
   - Clique em "Salvar"

## 🎯 Como Usar

### Método 1: Botão Flutuante
1. Selecione qualquer texto em uma página web
2. Um botão "🤖 Enviar para Ollama" aparecerá próximo à seleção
3. Clique no botão
4. Digite um prompt personalizado (opcional)
5. Escolha:
   - **🚀 Enviar**: Usar modal na página
   - **🗗 Abrir em Janela**: Abrir em janela separada
   - **Cancelar**: Fechar sem enviar

### Método 2: Menu Contextual
1. Selecione qualquer texto em uma página web
2. Clique com o botão direito
3. Escolha "Enviar para Ollama"
4. Digite um prompt personalizado (opcional)
5. Escolha como processar

## ⚙️ Configuração do Ollama

### Instalação do Ollama
```bash
# No Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# No Windows
# Baixe o instalador em https://ollama.ai/download
```

### Executando o Ollama
```bash
# Inicie o serviço
ollama serve

# Em outro terminal, baixe um modelo
ollama pull phi4:latest
ollama pull llama2
ollama pull codellama
ollama pull mistral
```

### Verificar se está funcionando
```bash
# Teste via curl
curl http://localhost:11434/api/tags

# Ou teste um prompt
curl http://localhost:11434/api/generate -d '{
  "model": "phi4:latest",
  "prompt": "Hello, world!",
  "stream": false
}'
```

## 🔧 Configurações Avançadas

### Modificar URL/Porta do Ollama
Se seu Ollama estiver rodando em uma porta diferente:

1. Abra a extensão
2. Modifique a URL (ex: `http://localhost:11434`)
3. Clique em "Testar" e depois "Salvar"

### Usar Modelos Diferentes
1. Primeiro, baixe o modelo no Ollama:
   ```bash
   ollama pull mistral
   ```
2. Na extensão, altere o campo "Modelo" para `mistral` (ou `mistral:latest`)
3. Salve as configurações

### CORS (Se necessário)
Se enfrentar problemas de CORS, você pode iniciar o Ollama com:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
ollama-text-sender/
├── manifest.json      # Configuração da extensão
├── content.js        # Script das páginas web
├── background.js     # Service worker
├── popup.html        # Interface da extensão
├── popup.js          # Lógica da interface
├── style.css         # Estilos
├── icons/            # Ícones da extensão
└── README.md         # Este arquivo
```

### Modificações
Para personalizar a extensão:

1. **Alterar estilos**: Edite `style.css`
2. **Modificar comportamento**: Edite `content.js`
3. **Ajustar interface**: Edite `popup.html` e `popup.js`
4. **Configurar permissões**: Edite `manifest.json`

### Debugging
1. Vá para `chrome://extensions/`
2. Clique em "Detalhes" na extensão
3. Clique em "Inspecionar visualizações" → "popup" ou "service worker"

## 🐛 Solução de Problemas

### Erro de Conexão
- Verifique se o Ollama está rodando: `curl http://localhost:11434/api/tags`
- Confirme se a URL na extensão está correta
- Verifique se há firewall bloqueando a conexão

### Modelo Não Encontrado
- Liste modelos disponíveis: `ollama list`
- Baixe o modelo: `ollama pull <nome-do-modelo>`
- Verifique se o nome está correto na extensão

### Botão Não Aparece
- Recarregue a página
- Verifique se a extensão está ativada
- Tente usar o menu contextual (botão direito)

### Permissões
- Verifique se a extensão tem permissão para acessar o site
- Vá em `chrome://extensions/` → Detalhes → Permissões

## 📝 Changelog

### v1.1.0
- ✅ Prompt personalizado para cada consulta
- ✅ Opção de abrir em janela separada
- ✅ Interface redesenhada com tema escuro
- ✅ Configurações escondidas atrás de ícone
- ✅ Melhor experiência de usuário

### v1.0.0
- ✅ Seleção de texto com botão flutuante
- ✅ Menu contextual
- ✅ Interface de configuração
- ✅ Teste de conexão
- ✅ Modal de resposta
- ✅ Notificações visuais
- ✅ Suporte a múltiplos modelos

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🎯 Novidades v1.1

### 🗗 **Janela Separada**
- Mais espaço para trabalhar com prompts longos
- Interface dedicada sem distrações
- `Ctrl+Enter` para enviar rapidamente

### 🎨 **Tema Escuro Moderno**
- Cores preto e azul para reduzir cansaço visual
- Interface similar ao GitHub Dark

### ⚙️ **Configurações Escondidas**
- Clique no ícone ⚙️ para acessar configurações
- Interface mais limpa focada no prompt

## 🙏 Agradecimentos

- [Ollama](https://ollama.ai/) pela fantástica ferramenta de LLM local
- Comunidade open source pelos exemplos e documentação 