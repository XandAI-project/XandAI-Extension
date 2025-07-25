# 🤖 XandAI

A powerful Chrome extension that allows you to send selected text directly to your local Ollama server with customizable prompts and advanced model management.

## ✨ Features

- 🎯 **Text Selection**: Select any text on web pages and send to XandAI
- 📝 **HTML Element Capture**: Send HTML structure of selected elements for code analysis
- 📄 **Full Page Analysis**: Send complete webpage HTML to analyze structure, SEO, or code quality
- 🎨 **Customizable Prompts**: Configure prompt templates for different use cases  
- 🔧 **Dynamic Configuration**: Configure Ollama URL and model through the user interface
- 🤖 **Automatic Model Detection**: Automatically loads available models from your Ollama server
- 📦 **Model Management**: Pull and delete models directly from the extension
- 🚀 **HuggingFace Auto-Detection**: Automatically adds `hf.co/` prefix to HuggingFace models
- 📊 **Real-time Progress**: Visual progress bar for model downloading
- 🌐 **Multi-Option Interface**: Text, HTML, and Page buttons appear when selecting text
- 🔒 **Works on HTTPS**: Bypasses Mixed Content limitations using background scripts
- 🗂️ **Context Menu**: Multiple sending options available through right-click context menu

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

6. **The "XandAI" extension will appear in the list**

### Ollama Setup

Make sure your Ollama server is running:

```bash
ollama serve
```

The extension will automatically connect to `http://localhost:11434` by default.

## 🚀 How to Use

### Initial Setup

1. **Click the extension icon** in the Chrome toolbar
2. **Click the settings (⚙️) icon** to configure:
   - **Ollama URL**: Your server address (e.g., `http://localhost:11434`)
   - **Model**: Select from automatically loaded models
3. **Click "Test"** to verify connection to your Ollama server
4. **Click "Save"** to store your settings

### Model Management

XandAI includes powerful model management features:

1. **Click "🔧 Manage Models"** in the extension popup
2. **Pull new models**: 
   - Enter model name (e.g., `llama2`, `mistral`, `theBloke/Llama-2-7B-Chat-GGUF`)
   - HuggingFace models automatically get `hf.co/` prefix
   - Watch real-time download progress
3. **Delete models**: Click the delete button next to any installed model
4. **Monitor progress**: Visual progress bar shows download status

### Using the Extension

#### Method 1: Multi-Option Floating Buttons
1. Select any text on a web page
2. **Three buttons will appear** near the selection:
   - **🤖 Text**: Send selected text to XandAI
   - **📝 HTML**: Send HTML element containing the selection for code analysis
   - **📄 Page**: Send complete webpage HTML for structure/SEO analysis
3. Click your preferred option to open the custom prompt dialog
4. Type your prompt (optional) and click "Send"
5. The response will appear in a modal window

#### Method 2: Context Menu
1. Select text on any page or right-click anywhere
2. Right-click to open context menu
3. Choose from multiple options:
   - **"Send Text to XandAI"**: Send selected text only
   - **"Send HTML Element to XandAI"**: Send HTML structure of selected element
   - **"Send Full Page to XandAI"**: Send complete webpage HTML

#### Method 3: Separate Window
1. Select text and use any sending method
2. Click **"🗗 Open in Window"** for a dedicated prompt window
3. Useful for longer conversations or when you need more space

#### Content Types Explained
- **Text**: Perfect for summarizing, translating, or analyzing written content
- **HTML Element**: Ideal for code reviews, structure analysis, or debugging specific components
- **Full Page**: Great for SEO audits, accessibility checks, or complete code reviews

### Settings

The extension provides comprehensive configuration options:

- **Connection Status**: Real-time status showing if your Ollama server is reachable
- **Model Selection**: Dropdown with all your installed models
- **URL Configuration**: Support for local and remote Ollama servers
- **Model Management**: Built-in tools to pull and delete models
- **HuggingFace Integration**: Automatic detection and prefix handling
- **Progress Tracking**: Visual feedback for model operations

**Common Ollama URLs:**
```
http://localhost:11434        # Default local installation
http://192.168.1.100:11434   # Remote server on local network
http://your-server.com:11434 # Remote server
```

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

We welcome contributions! Please follow these guidelines:

#### 🚀 Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/ollama-text-sender.git
   cd ollama-text-sender
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/bug-description
   # or  
   git checkout -b chore/task-description
   ```

3. **Make your changes and test thoroughly**

4. **Commit using conventional commit format:**
   ```bash
   git commit -m "feat: add support for multiple AI providers"
   git commit -m "fix: resolve mixed content error on HTTPS sites"
   git commit -m "chore: update dependencies and clean up code"
   git commit -m "docs: improve installation instructions"
   git commit -m "style: format code and fix linting issues"
   git commit -m "refactor: reorganize content script structure"
   git commit -m "test: add unit tests for background script"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Open a Pull Request** with a clear description

#### 📝 Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) specification:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc)
- **refactor**: Code refactoring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **ci**: CI/CD pipeline changes

**Examples:**
```bash
feat: add OpenAI API integration
fix: resolve extension context invalidation error
docs: add troubleshooting section to README
style: fix ESLint warnings and format code
refactor: extract common utilities to separate module
test: add integration tests for XandAI communication
chore: update manifest version to 1.4.0
perf: optimize text selection detection algorithm
feat: add HuggingFace model auto-detection
feat: implement model management with progress tracking
```

#### 🧪 Development Guidelines

- **Code Quality**: Write clean, readable, and well-documented code
- **Testing**: Test your changes on different websites and browsers
- **Performance**: Ensure changes don't impact page load times
- **Compatibility**: Test on Chrome and Edge browsers
- **Security**: Follow security best practices for extensions
- **Accessibility**: Consider accessibility in UI changes

#### 🐛 Reporting Issues

When reporting bugs, please include:

- **Clear title** and description
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Browser version** (Chrome/Edge)
- **Extension version**
- **Console logs** (if applicable)
- **Screenshots** (if UI-related)

**Issue Template:**
```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 120.0.0.0
- Extension Version: 1.4.0
- OS: Windows 11
- Ollama Version: 0.1.17
```

#### 💡 Feature Requests

For new features, please:

- **Check existing issues** and roadmap first
- **Provide clear use case** and benefits
- **Consider implementation complexity**
- **Discuss with maintainers** before large changes

### Code Style

- Use **2 spaces** for indentation
- Use **semicolons** consistently
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Add **JSDoc comments** for functions
- Keep **line length under 100 characters**

### Testing Checklist

Before submitting a PR:

- [ ] Extension loads without errors in Chrome
- [ ] Text selection works on different websites
- [ ] Context menu functionality works
- [ ] Settings can be configured and saved
- [ ] Model dropdown loads available models
- [ ] Connection status updates correctly
- [ ] Model management (pull/delete) works correctly
- [ ] HuggingFace auto-detection adds `hf.co/` prefix
- [ ] Progress bar displays during model downloads
- [ ] No console errors or warnings
- [ ] Works on both HTTP and HTTPS sites
- [ ] Extension reloads properly after changes

## 🔒 Privacy and Security

- ✅ **Local Data**: All settings stay in your browser
- ✅ **No Telemetry**: We don't collect usage data
- ✅ **Open Source**: All code is auditable
- ✅ **HTTPS Safe**: Works on HTTPS sites without compromising security
- ✅ **Minimal Permissions**: Only requests necessary permissions

## 📋 Roadmap

### 🎯 High Priority
- [ ] **Multiple AI providers** - Add support for OpenAI, Claude (Anthropic), Google Gemini, and other LLM APIs
- [ ] **Autonomous actions** - Enable automated interactions like clicking buttons, posting comments, filling forms based on AI responses
- [ ] **Conversation history** - Keep track of previous interactions and maintain context

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

## 🐛 Known Issues & Troubleshooting

### Common Issues

1. **"No model selected" error**
   - Make sure your Ollama server is running
   - Check that the URL in settings is correct
   - Verify you have models installed: `ollama list`

2. **Models not loading in dropdown**
   - Check connection status in extension settings
   - Verify Ollama server is accessible at the configured URL
   - Try clicking "Test" in settings to diagnose connection issues

3. **Extension context invalidated**
   - Reload the extension in `chrome://extensions/`
   - This can happen after Chrome updates or computer sleep

4. **Mixed Content errors** (Resolved)
   - Extension now uses background scripts to bypass HTTPS limitations

### Installing Ollama Models

You can install models in two ways:

#### Option 1: Using XandAI (Recommended)
1. Open the extension and click "🔧 Manage Models"
2. Enter model name in the "Pull New Model" field:
   - Standard models: `llama2`, `mistral`, `phi`
   - HuggingFace models: `theBloke/Llama-2-7B-Chat-GGUF` (auto-adds `hf.co/` prefix)
3. Click "Pull" and watch the real-time progress bar
4. Model will appear in your installed models list

#### Option 2: Using Command Line
```bash
# Popular models to get started
ollama pull llama2          # Good general purpose model
ollama pull codellama       # Great for code-related tasks
ollama pull mistral         # Fast and efficient
ollama pull phi             # Lightweight option

# HuggingFace models (add hf.co/ prefix manually)
ollama pull hf.co/theBloke/Llama-2-7B-Chat-GGUF

# List installed models
ollama list
```

## 📝 Changelog

### v1.4.0 (Current)
- **feat**: Complete rebranding to XandAI
- **feat**: Integrated model management with pull and delete functionality
- **feat**: HuggingFace model auto-detection with `hf.co/` prefix
- **feat**: Real-time progress bar for model downloads
- **feat**: Enhanced model management UI with status indicators
- **feat**: Improved error handling and user feedback
- **fix**: Removed prompt engineering box for cleaner interface
- **docs**: Updated README with model management instructions

### v1.3.0
- **feat**: Dynamic model selection with automatic loading from Ollama API
- **feat**: Real-time connection status and testing
- **feat**: Improved settings interface with model dropdown
- **feat**: Automatic model validation and error handling
- **refactor**: Removed hardcoded IP addresses and models
- **fix**: Enhanced error messages for better user experience
- **docs**: Updated README with new configuration instructions

### v1.2.0
- **feat**: Fixed Mixed Content issue on HTTPS sites
- **feat**: Improved settings interface
- **feat**: Added support for local networks
- **docs**: Updated README with manual configuration

### v1.1.0
- **feat**: Added context menu functionality
- **feat**: Implemented prompt templates
- **feat**: Created settings interface
- **fix**: Improved error handling

### v1.0.0
- **feat**: Initial release
- **feat**: Text selection and Ollama integration
- **feat**: Floating button interface

## 🧪 Testing

### Manual Testing

Test the extension on various websites:
- Simple text websites (Wikipedia, news sites)
- Complex web applications (Gmail, Twitter)
- HTTPS and HTTP sites
- Sites with strict CSP policies

### Automated Testing

We welcome contributions for:
- Unit tests for utility functions
- Integration tests for API communication
- E2E tests for user workflows

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](#mit-license) section below for details.

### MIT License

```
MIT License

Copyright (c) 2024 XandAI

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
- 📧 **Email**: av.souza2018@gmail.com

---

**Made with ❤️ for the XandAI community** 