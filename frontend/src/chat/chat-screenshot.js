/**
 * Capture the Three.js canvas as a base64 PNG string.
 * Requires preserveDrawingBuffer: true on the WebGLRenderer.
 */
export function captureCanvas(renderer) {
  const dataUrl = renderer.domElement.toDataURL('image/png');
  // Strip the data:image/png;base64, prefix
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}
