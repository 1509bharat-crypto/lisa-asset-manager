// Asset Library Uploader - Figma Plugin
// This code runs in Figma's sandbox environment

// Show the plugin UI
figma.showUI(__html__, { width: 360, height: 520 });

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-selection') {
    await handleGetSelection();
  }

  if (msg.type === 'export-frames') {
    await handleExportFrames(msg.options);
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message);
  }

  if (msg.type === 'close') {
    figma.closePlugin(msg.message);
  }
};

// Get current selection and send preview to UI
async function handleGetSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'selection-update',
      frames: [],
      error: 'No frames selected. Please select frames in Figma.'
    });
    return;
  }

  const frames = [];

  for (const node of selection) {
    // Only allow exportable nodes
    if ('exportAsync' in node) {
      try {
        // Generate small preview thumbnail
        const thumbnail = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'WIDTH', value: 100 }
        });

        frames.push({
          id: node.id,
          name: node.name,
          width: Math.round(node.width),
          height: Math.round(node.height),
          thumbnail: Array.from(thumbnail)
        });
      } catch (e) {
        console.error('Error creating thumbnail:', e);
      }
    }
  }

  figma.ui.postMessage({
    type: 'selection-update',
    frames: frames,
    error: frames.length === 0 ? 'Selected items cannot be exported.' : null
  });
}

// Export selected frames with given options
async function handleExportFrames(options) {
  const { format, scale } = options;
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'export-error',
      error: 'No frames selected'
    });
    return;
  }

  const exportedFrames = [];

  for (const node of selection) {
    if ('exportAsync' in node) {
      try {
        let exportSettings;

        if (format === 'SVG') {
          exportSettings = {
            format: 'SVG',
            svgOutlineText: true,
            svgIdAttribute: false,
            svgSimplifyStroke: true
          };
        } else {
          exportSettings = {
            format: 'PNG',
            constraint: { type: 'SCALE', value: scale }
          };
        }

        const bytes = await node.exportAsync(exportSettings);

        // Convert to base64
        let base64;
        let mimeType;

        if (format === 'SVG') {
          base64 = figma.base64Encode(bytes);
          mimeType = 'image/svg+xml';
        } else {
          base64 = figma.base64Encode(bytes);
          mimeType = 'image/png';
        }

        const dataUrl = `data:${mimeType};base64,${base64}`;

        exportedFrames.push({
          id: node.id,
          name: node.name + (format === 'SVG' ? '.svg' : '.png'),
          type: mimeType,
          size: bytes.length,
          data: dataUrl,
          width: Math.round(node.width * (format === 'SVG' ? 1 : scale)),
          height: Math.round(node.height * (format === 'SVG' ? 1 : scale))
        });

      } catch (e) {
        console.error('Error exporting:', node.name, e);
        figma.notify(`Error exporting ${node.name}`);
      }
    }
  }

  figma.ui.postMessage({
    type: 'export-complete',
    frames: exportedFrames
  });
}


// Listen for selection changes in Figma
figma.on('selectionchange', () => {
  handleGetSelection();
});

// Initial selection check
handleGetSelection();
