# XandAI Chrome Extension

A modern Chrome extension that sends selected text to your local Ollama LLM with integrated standalone chat functionality.

## 📥 Installation

### Prerequisites
- Chrome browser
- [Ollama](https://ollama.ai/) installed and running locally
- At least one model pulled (e.g., `ollama pull llama2`)

### Installation Steps

1. **Download or Clone the Repository**
   ```bash
   git clone <repository-url>
   cd XandAI-Extension
   ```

2. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

   ![Chrome Extensions Page](prints/Captura%20de%20tela%202025-07-24%20005132.png)

3. **Load Unpacked Extension**
   - Click "Load unpacked"
   - Select the `XandAI-Extension` folder
   - The extension should appear in your extensions list

   ![Load Unpacked](prints/Captura%20de%20tela%202025-07-24%20005258.png)

4. **Pin the Extension**
   - Click the extensions icon (puzzle piece) in Chrome toolbar
   - Pin XandAI for easy access

   ![Extension Installed](prints/Captura%20de%20tela%202025-07-26%20165634.png)

## 🚀 Features

### 🤖 Automatic Model Management
- **Auto-download**: Automatically pulls missing models from Ollama
- **Model deletion**: Remove unused models to save disk space
- **Model switching**: Easy switching between different AI models
- **Status monitoring**: Real-time connection status with Ollama

### 💬 Standalone Chat Window
- **Independent chat**: Dedicated chat window that works on any webpage
- **Page context integration**: Toggle to include current page content in conversations
- **Rich markdown support**: Full markdown rendering with syntax highlighting
- **Persistent history**: Conversations saved across sessions
- **Streaming responses**: Real-time AI responses as they generate

### 🎨 Advanced Markdown Support
- **Code blocks**: Syntax highlighting for 15+ programming languages
- **Headers**: H1-H6 with proper styling
- **Lists**: Ordered and unordered lists
- **Links**: Clickable links with security features
- **Tables**: Full table support with styling
- **Blockquotes**: Styled quote blocks
- **Text formatting**: Bold, italic, strikethrough, inline code

### 🔒 Security Features
- **XSS protection**: Safe HTML escaping
- **Secure links**: External links open safely
- **Local processing**: All data stays on your machine
- **No tracking**: Complete privacy

## 🎯 How to Use

### Basic Usage

1. **Open Standalone Chat**
   - Click the XandAI extension icon
   - Select "Open Standalone Chat" or use the keyboard shortcut

2. **Configure Settings**
   - Set your Ollama server URL (default: `http://localhost:11434`)
   - Choose your preferred AI model
   - Adjust response parameters (temperature, max tokens, etc.)

3. **Start Chatting**
   - Type your message in the input field
   - Press Enter or click Send
   - Watch the AI respond in real-time

### Advanced Features

#### Page Context Integration
![Page Context Feature](prints/Captura%20de%20tela%202025-08-09%20124543.png)

- **Enable page context**: Click the "Use page context" button
- **Automatic capture**: The extension extracts text content from the current page
- **Smart filtering**: Removes navigation, ads, and other noise
- **Context limit**: Automatically truncates large pages (6000 characters max)

#### Text Selection Integration
- **Right-click menu**: Select text → right-click → "Send to XandAI"
- **Custom prompts**: Configure custom prompts for different use cases
- **Quick processing**: Instant AI analysis of selected content

#### Model Management
- **Auto-pulling**: Missing models are automatically downloaded
- **Model info**: View model details and download status
- **Storage management**: Delete unused models to free space
- **Update checking**: Automatic updates for newer model versions

## ⚙️ Configuration

### Ollama Settings
```json
{
  "serverUrl": "http://localhost:11434",
  "model": "llama2",
  "temperature": 0.7,
  "maxTokens": 2048,
  "systemPrompt": "You are a helpful AI assistant."
}
```

### Supported Models
- **Chat models**: llama2, mistral, codellama, neural-chat
- **Code models**: codellama, deepseek-coder, magicoder
- **Specialized**: dolphin-mistral, openhermes, starling-lm
- **Custom models**: Any Ollama-compatible model

## 🛠️ Technical Architecture

### File Structure
```
XandAI-Extension/
├── src/
│   ├── ui/
│   │   └── standalone-chat.js    # Main chat interface
│   └── content.js                # Content script
├── chat-window.html              # Chat window HTML
├── popup.html                    # Extension popup
├── background.js                 # Service worker
├── manifest.json                 # Extension manifest
└── prints/                       # Screenshots
```

### Core Components

#### StandaloneSideChat Class
- **UI Management**: Creates and manages chat interface
- **Message Handling**: Processes user input and AI responses
- **Markdown Rendering**: Advanced markdown parser with syntax highlighting
- **Settings Persistence**: Saves user preferences and chat history

#### Background Service Worker
- **Context Menus**: Handles right-click integration
- **Window Management**: Creates and manages chat windows
- **API Communication**: Handles Ollama API requests
- **Model Management**: Downloads and manages AI models

#### Content Script
- **Page Integration**: Integrates with webpage content
- **Text Selection**: Captures selected text for processing
- **Page Context**: Extracts meaningful content from pages

## 🔧 Troubleshooting

### Common Issues

#### Ollama Connection Failed
- Ensure Ollama is running: `ollama serve`
- Check server URL in extension settings
- Verify no firewall blocking localhost:11434

#### Extension Not Loading
- Ensure Developer Mode is enabled
- Try reloading the extension
- Check Chrome console for error messages

#### Models Not Downloading
- Check internet connection
- Ensure sufficient disk space
- Verify Ollama is properly installed

#### Chat Window Not Opening
- Disable popup blockers
- Check if other extensions are interfering
- Try refreshing the current page

## 🚀 Advanced Usage

### Custom Prompts
Create specialized prompts for different tasks:
- **Code Review**: "Review this code for bugs and improvements"
- **Text Summary**: "Summarize this text in 3 bullet points"
- **Translation**: "Translate this to [language]"

### Keyboard Shortcuts
- **Open Chat**: Configurable shortcut (default: Ctrl+Shift+X)
- **Send Message**: Enter key
- **New Line**: Shift+Enter
- **Clear Chat**: Configurable shortcut

### Integration Tips
- **Research**: Use page context for analyzing articles
- **Development**: Get code explanations with syntax highlighting
- **Writing**: Get writing assistance with markdown formatting
- **Learning**: Ask questions about current page content

## 📋 System Requirements

- **Chrome**: Version 88 or higher
- **Ollama**: Latest version recommended
- **RAM**: 4GB minimum (8GB+ recommended for larger models)
- **Storage**: 2GB+ free space for models
- **Network**: Internet connection for model downloads

## 🔐 Privacy & Security

- **Local Processing**: All AI processing happens on your machine
- **No Data Collection**: Extension doesn't collect or transmit personal data
- **Secure Communication**: All requests use secure local connections
- **Open Source**: Full source code available for review

## 📈 Performance Tips

- **Model Selection**: Smaller models (7B) for speed, larger (13B+) for quality
- **Memory Management**: Close unused applications when running large models
- **Storage**: Use SSD for better model loading performance
- **Network**: Good internet connection for faster model downloads

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Ollama Official Website](https://ollama.ai/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Markdown Guide](https://www.markdownguide.org/)

---

**Version: 1.21.2** | **Made with ❤️ for the AI community**