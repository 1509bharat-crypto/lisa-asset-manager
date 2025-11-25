# AI-Powered Asset Library - Setup Guide

Your asset library now has **automatic AI-powered organization** using OpenAI's Vision API!

## What's New

### Smart Auto-Organization
- **Automatic categorization**: Logos, Icons, Photos, Illustrations, Screenshots, Diagrams
- **AI-generated tags**: 3-8 relevant keywords per image
- **Color detection**: Dominant colors extracted from each asset
- **Descriptions**: Brief AI-generated descriptions

### Smart Filtering
- **Category filters**: Click to view only logos, icons, photos, etc.
- **Tag filters**: Click tags to find similar assets
- **Enhanced search**: Search by filename, tags, or description
- **Combine filters**: Use categories + tags + search together

## Quick Start

### 1. Get Your OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy your API key

### 2. Configure the App

Open the `.env` file and add your API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=8888
```

### 3. Start the Server

```bash
cd "/Users/b/Desktop/B/Asset library"
npm start
```

Or use the shortcut:
```bash
./start-server.sh
```

### 4. Open the App

Visit: http://localhost:8888

## How It Works

### Automatic Tagging

When you upload an image:

1. **AI analyzes the image** using GPT-4 Vision
2. **Category assigned**: logo, icon, photo, illustration, etc.
3. **Tags generated**: relevant keywords (e.g., "corporate", "blue", "minimal")
4. **Colors extracted**: dominant color palette
5. **Description created**: brief summary of the image

### Smart Organization

**Category Filters** (Top of page)
- Click any category to filter assets
- See count of assets in each category
- "All" shows everything

**Tag Filters** (Below categories)
- Shows top 20 most common tags
- Click to filter by tag
- Click multiple tags to combine filters
- "✕ Clear filters" to reset

**Search Bar**
- Searches filenames, tags, AND descriptions
- Real-time filtering as you type
- Combines with category and tag filters

### Example Use Cases

**Find all blue logos:**
1. Click "Logos" category
2. Click "blue" tag
3. Done!

**Find corporate designs:**
1. Type "corporate" in search
2. Results show assets with "corporate" in tags or description

**Find minimalist icons:**
1. Click "Icons" category
2. Click "minimal" or "minimalist" tag

## Cost & Performance

### OpenAI API Costs
- **Model**: GPT-4o-mini (fast & cheap)
- **Cost**: ~$0.001-0.002 per image
- **Example**: 100 images ≈ $0.10-0.20

### Processing Time
- **Per image**: 2-5 seconds
- **Bulk uploads**: Processed sequentially
- **Offline mode**: Toggle "Enable AI tagging" off to skip AI

## Features

### Current Features
✅ Drag & drop upload
✅ AI-powered categorization
✅ Automatic tag generation
✅ Color extraction
✅ Category filtering
✅ Tag filtering
✅ Enhanced search
✅ One-click downloads
✅ Storage monitoring
✅ Mobile responsive

### Coming Soon
🔜 Conversational chat interface
🔜 AI icon generation
🔜 Web logo search
🔜 Batch re-tagging
🔜 Custom categories
🔜 Export collections

## Troubleshooting

### "OpenAI Vision: ✗ Disabled"
- Check that your `.env` file exists
- Verify `OPENAI_API_KEY` is set correctly
- Restart the server after changing `.env`

### "AI analysis failed"
- Check your internet connection
- Verify your OpenAI API key is valid
- Check you have credits in your OpenAI account
- Assets will still upload, just without AI tags

### Port already in use
```bash
PORT=3000 npm start  # Use different port
```

### No tags showing
- Upload some images first (with AI enabled)
- Tags appear after AI analysis completes
- Check the checkbox "Enable AI tagging" is checked

## Privacy & Data

- **Images stored locally**: Base64 in localStorage (browser only)
- **AI processing**: Images sent to OpenAI API for analysis only
- **No permanent storage**: OpenAI doesn't retain your images
- **Offline mode**: Disable AI tagging to keep everything local

## Advanced Configuration

### Disable AI for specific uploads
Uncheck "Enable AI tagging" before uploading

### Change AI model
Edit `server.js` line 110:
```javascript
model: "gpt-4o-mini"  // Or "gpt-4o" for better quality (higher cost)
```

### Customize categories
Edit `script.js` line 215-224 to add your own categories

### Adjust tag count
Edit `server.js` line 120:
```
2. Tags (3-8 relevant keywords)  // Change to 5-10, etc.
```

## Support

Need help? Check:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- OpenAI Docs: https://platform.openai.com/docs

## Next Steps

1. **Add your OpenAI API key** to `.env`
2. **Restart the server**
3. **Upload some test images**
4. **Watch the AI organize them automatically**
5. **Try the category and tag filters**

Enjoy your AI-powered asset library! 🚀
