# 🤖 Ollama Text Sender

A Chrome extension that allows you to send selected text directly to your local Ollama server with customizable prompts.

## ✨ Features

- 🎯 **Text Selection**: Select any text on web pages and send to Ollama
- 🎨 **Customizable Prompts**: Configure prompt templates for different use cases  
- 🔧 **Flexible Configuration**: Configure Ollama URL, model, and prompts through the interface
- 🚀 **Intuitive Interface**: Floating button appears automatically when selecting text
- 🔒 **Works on HTTPS**: Bypasses Mixed Content limitations using background scripts
- 🌐 **Context Menu**: Also available through right-click context menu

## 📦 Installation

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repository>
   cd Second-Brain
   ```

2. **Open Chrome and go to:**
   ```
   chrome://extensions/
   ```

3. **Enable "Developer mode"** (top right corner)

4. **Click "Load unpacked extension"**

5. **Select the project folder**

6. **The "Ollama Text Sender" extension will appear in the list**

### Ollama Configuration

Make sure your Ollama server is running:

```bash
ollama serve
```

By default, the extension tries to connect to `http://192.168.3.70:11434`. You can change this in the extension settings.

### Manual Configuration (Temporary)

**Note**: Currently, the URL and model are hardcoded. Here's how to change them manually until the settings interface is fully implemented:

1. **Change Ollama Server URL and Model:**
   
   Edit `content.js` and `background.js` files and look for these lines:
   
   **In `content.js` (around line 70):**
   ```javascript
   let settings = {
     ollamaUrl: 'http://192.168.3.70:11434',  // ← Change this IP/URL
     ollamaModel: 'hf.co/unsloth/gemma-3n-E4B-it-GGUF:latest',  // ← Change this model
     promptTemplate: ''
   };
   ```
   
   **In `background.js` (around line 12):**
   ```javascript
   chrome.storage.sync.set({
     ollamaUrl: 'http://192.168.3.70:11434',  // ← Change this IP/URL
     ollamaModel: 'hf.co/unsloth/gemma-3n-E4B-it-GGUF:latest',  // ← Change this model
     promptTemplate: '',
     autoShow: true
   });
   ```

2. **Common configurations:**
   ```javascript
   // For local Ollama (default port)
   ollamaUrl: 'http://localhost:11434'
   
   // For local Ollama (custom port)
   ollamaUrl: 'http://localhost:8080'
   
   // For remote Ollama server
   ollamaUrl: 'http://192.168.1.100:11434'
   ```

3. **Common models:**
   ```javascript
   // Popular models
   ollamaModel: 'llama2'
   ollamaModel: 'llama2:13b'
   ollamaModel: 'codellama'
   ollamaModel: 'mistral'
   ollamaModel: 'phi'
   ollamaModel: 'gemma:2b'
   ```

4. **After making changes:**
   - Save the files
   - Go to `chrome://extensions/`
   - Click the **🔄 Reload** button on your extension
   - Test the extension with the new settings

## 🚀 How to Use

### Method 1: Text Selection
1. Select any text on a web page
2. A **🤖 Send to Ollama** button will appear near the selection
3. Click the button to open the custom prompt dialog
4. Type your prompt (optional) and click "Send"
5. The response will appear in a modal window

### Method 2: Context Menu
1. Select text on any page
2. Right-click
3. Choose **"Send to Ollama"** from the context menu

### Settings
1. Click the extension icon in the toolbar
2. Configure:
   - **Ollama URL**: Your server address (e.g., `http://localhost:11434`)
   - **Model**: Ollama model to use (e.g., `llama2`, `codellama`)
   - **Prompt Template**: Default prompt applied to all texts

## 🛠️ Project Structure

```
Second-Brain/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (HTTP requests)
├── content.js             # Script injected into pages
├── popup.html             # Settings interface
├── popup.js               # Settings logic
├── style.css              # Extension styles
├── window.html            # Prompt window interface
├── window.js              # Prompt window logic
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 Development

### Technologies Used

- **Manifest V3**: Latest Chrome extension API version
- **Vanilla JavaScript**: No external dependencies
- **Chrome Extension APIs**: Storage, Context Menus, Tabs, Runtime

### How to Contribute

1. **Fork the repository**

2. **Create a branch for your feature:**
   ```bash
   git checkout -b feature/new-functionality
   ```

3. **Make your changes and commit:**
   ```bash
   git commit -m "Add new functionality"
   ```

4. **Push to the branch:**
   ```bash
   git push origin feature/new-functionality
   ```

5. **Open a Pull Request**

### Contribution Guidelines

- **Clean Code**: Keep code readable and well-commented
- **Testing**: Test your changes on different web pages
- **Compatibility**: Ensure compatibility with Chrome/Edge
- **Performance**: Avoid code that impacts page performance

### Report Bugs

Open an issue with:
- Detailed problem description
- Steps to reproduce
- Chrome/Edge version
- Console logs (if any errors)

## 🔒 Privacy and Security

- ✅ **Local Data**: All settings stay in your browser
- ✅ **No Telemetry**: We don't collect usage data
- ✅ **Open Source**: All code is auditable
- ✅ **HTTPS Safe**: Works on HTTPS sites without compromising security

## 📋 Roadmap

### 🎯 High Priority
- [ ] **Remove hardcoded model and IP** - Allow users to configure Ollama server URL and model through settings interface
- [ ] **Multiple AI providers** - Add support for OpenAI, Claude (Anthropic), Google Gemini, and other LLM APIs
- [ ] **Autonomous actions** - Enable automated interactions like clicking buttons, posting comments, filling forms based on AI responses

### 🔧 Core Features
- [ ] Support for multiple Ollama servers
- [ ] Conversation history and context persistence
- [ ] Export/import settings and configurations
- [ ] Dark theme and customizable UI
- [ ] Keyboard shortcuts and hotkeys
- [ ] Streaming responses for real-time feedback

### 🚀 Advanced Features
- [ ] Custom prompt templates library
- [ ] Response caching and offline mode
- [ ] Browser automation workflows
- [ ] Integration with popular websites (Twitter, LinkedIn, GitHub)
- [ ] Voice input and text-to-speech output
- [ ] Collaborative features and shared prompts

## 🐛 Known Issues

- **Mixed Content**: Resolved using background scripts
- **Extension Cache**: Reload extension in `chrome://extensions/` after updates
- **Popup Blocker**: Some pages may block the prompt window

## 📝 Changelog

### v1.2
- Fixed Mixed Content issue on HTTPS sites
- Improved settings interface
- Added support for local networks

### v1.1
- Added context menu
- Implemented prompt templates
- Settings interface

### v1.0
- Initial version
- Text selection and Ollama sending

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](#mit-license) section below for details.

### MIT License

```
MIT License

Copyright (c) 2024 Ollama Text Sender

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🤝 Contributors

Thanks to everyone who contributes to this project!

<!-- Contributors list will be automatically populated by GitHub -->

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/ollama-text-sender/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/ollama-text-sender/discussions)
- 📧 **Email**: your-email@example.com

---

**Made with ❤️ for the Ollama community** 