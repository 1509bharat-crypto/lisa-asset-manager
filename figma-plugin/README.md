# Asset Library Uploader - Figma Plugin

Upload selected frames from Figma directly to your Asset Library.

## Setup

### Step 1: Add Your Supabase Credentials

Open `ui.html` and find these lines near the top of the `<script>` section:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual Supabase credentials (same ones from your web app).

### Step 2: Install in Figma

1. Open **Figma Desktop App** (not browser)
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Navigate to this folder and select `manifest.json`
4. The plugin is now installed!

### Step 3: Use the Plugin

1. Select one or more frames in Figma
2. Right-click → **Plugins** → **Asset Library Uploader**
3. Choose your project and folder
4. Select export format (PNG/SVG) and scale
5. Click **Upload to Asset Library**
6. Done! Check your web app to see the uploaded assets.

## Features

- **Multi-select**: Upload multiple frames at once
- **Format options**: PNG or SVG export
- **Scale options**: 1x, 2x, 3x, or 4x (for PNG)
- **Project/Folder selection**: Organize directly from Figma
- **Live preview**: See thumbnails before uploading

## Troubleshooting

### "Failed to load projects"
- Check that your Supabase URL and API key are correct in `ui.html`
- Make sure your Supabase project is running

### Plugin not showing
- Use Figma Desktop app (not browser)
- Re-import the plugin from manifest

### Network error
- Check that `*.supabase.co` is in the allowed domains in `manifest.json`
- Verify your internet connection

## File Structure

```
figma-plugin/
├── manifest.json   # Plugin configuration
├── code.js         # Figma sandbox code (frame export)
├── ui.html         # Plugin UI (project selection, upload)
└── README.md       # This file
```
