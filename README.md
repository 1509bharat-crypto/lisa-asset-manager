# Asset Library

An AI-powered asset management system that automatically organizes your images and SVGs using OpenAI's Vision API.

## Features

### 🤖 AI-Powered Organization
- **Auto-categorization**: Automatically sorts into Logos, Icons, Photos, Illustrations, Screenshots, Diagrams
- **Smart Tagging**: AI generates 3-8 relevant keywords per asset
- **Color Detection**: Extracts dominant color palette
- **AI Descriptions**: Brief summaries of each image

### 🔍 Smart Filtering & Search
- **Category Filters**: Click to view specific asset types
- **Tag Filters**: Filter by AI-generated tags
- **Enhanced Search**: Search by name, tags, or description
- **Combined Filters**: Mix categories, tags, and search

### 💎 Core Features
- **Drag & Drop Upload**: Easy bulk uploads
- **Real-time Storage Monitoring**: 2MB per-file limit with quota tracking
- **One-click Download**: Export any asset instantly
- **Dark Theme**: Beautiful black interface optimized for long sessions
- **Fully Responsive**: Works on desktop, tablet, and mobile
- **Local Storage**: All assets stored in your browser

## Demo

[Live Demo](https://yourusername.github.io/asset-library)

## Quick Start

1. **Get OpenAI API Key**: Visit https://platform.openai.com/api-keys

2. **Configure**:
   ```bash
   cd asset-library
   npm install
   ```

   Add your API key to `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

3. **Run**:
   ```bash
   npm start
   ```

4. **Open**: http://localhost:8888

See [SETUP.md](SETUP.md) for detailed instructions.

## Supported Formats

- JPEG/JPG
- PNG
- GIF
- WebP
- SVG

## Storage Limits

- Maximum 2MB per file
- Total storage: ~5MB (localStorage limit)
- Warning shown at 80% capacity

## Browser Compatibility

Works on all modern browsers that support:
- ES6 JavaScript
- localStorage API
- FileReader API
- HTML5 drag & drop

## Roadmap

- [x] Auto-tagging with AI ✅
- [x] Smart categorization ✅
- [ ] Conversational chat interface
- [ ] AI icon generation
- [ ] Web logo search
- [ ] Batch re-tagging
- [ ] Custom categories
- [ ] Cloud storage integration

## License

MIT License - feel free to use this project however you'd like!

## Contributing

Pull requests are welcome! Feel free to improve this project.
