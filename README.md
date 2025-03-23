# 🚀 Chat With Cat Chrome Extension (v2.0)

Welcome to the **new and improved** Chat With Cat Chrome Extension! 🐱✨ This version brings exciting updates, enhanced features, and a more user-friendly experience. Dive into the world of AI-powered insights with just a right-click!

## 🌟 What's New in v2.0?

- **Removed OpenRouter Support**: Focused on Google Gemini and GROQ for better performance and reliability.
- **Media Content Detection**: Automatically skips questions with images or videos and notifies the user. 📸🎥
- **Google Forms Integration**: Special support for answering Google Forms questions with AI. 📝
- **Improved UI**: Enhanced floating response window with better animations and dark/light mode support. 🌗
- **Optimized Performance**: Faster response times with improved caching and retry mechanisms. ⚡
- **Bug Fixes**: Addressed minor issues for a smoother experience. 🛠️

## ✨ Features

- 🔍 Right-click any text to get AI analysis
- 🔄 Support for multiple AI providers:
  - Google Gemini
  - GROQ
- 🎨 Beautiful, responsive floating UI
- 🌓 Automatic dark/light mode
- 🖱️ Draggable response window
- 📝 Markdown formatting for responses
- 🔒 Secure local API key storage
- ⚡ Response caching for performance
- 📝 **Special Google Forms Support**: Answer questions directly in Google Forms.

## 📥 Installation

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/Ns81000/Chat_With_Cat-v2.0-.git
   ```
2. **Get an API key** from one of the supported providers:
   - [Google AI Studio](https://makersuite.google.com/app/apikey) for Gemini
   - [GROQ Console](https://console.groq.com/keys) for GROQ models
3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select this extension folder
4. **Configure the extension**:
   - The setup page will automatically open on first install
   - Or click the extension icon anytime to access settings

## 🚀 Usage

1. **Select any text** on a webpage.
2. **Right-click** and select "Ask AI about: [text]".
3. A **floating window** appears with the AI's response.
4. **Drag** the window by its header to reposition.
5. Use **minimize/close** buttons to control the window.

> **Note**: Questions with media content (images/videos) will not be processed, and a notification will be displayed. 📢

## ⚠️ **Important Message** ⚠️

**❗ If you reload the Google Form page after using the answer feature, please clear your browsing data and then re-reload the page. This will help avoid the "Invalid or empty response received from the AI provider" error.** 🧹🔄

## 📝 Google Forms Integration

Chat With Cat now supports answering Google Forms questions directly! Here's how to use it:

1. Open a Google Form in your browser.
2. Hover over a question to see the AI-generated answer.
3. For multiple-choice questions, the AI will suggest the best option.
4. If the question contains media content (images/videos), the extension will notify you that it cannot process the question.
5. The answer will be automatically copied to your clipboard for easy pasting.

## ⚠️ Document Focus Reminder

If you encounter a "Document is not focused" reminder while using the extension, it means the browser window or tab is not currently active. To resolve this:

1. Ensure the browser tab where the extension is active is in focus.
2. If the issue persists, click anywhere on the webpage to bring it into focus.
3. Retry the action that triggered the reminder.

This reminder is a security measure to ensure clipboard operations are performed only when the document is in focus.

## 🔧 Advanced Configuration

- **Change providers**: Click the extension icon and select a different provider.
- **Update API key**: Access settings through the extension icon.
- **Change models**: Each provider offers different models with varying capabilities.

## 🗂️ Project Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── setup.html          # Configuration UI 
├── images/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── js/
    ├── background.js   # Context menu and API handling
    ├── content.js      # UI injection and display logic
    └── setup.js        # Configuration management
```

## 🔒 Privacy & Security

- All API keys are stored **locally** in your browser storage.
- Selected text is sent only to your chosen AI provider.
- No data is stored on external servers beyond API processing.
- All communication with AI providers uses secure HTTPS.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📜 License

This project is open source and available under the MIT License.
