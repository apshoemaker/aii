import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

let labelRenderer = null;

/**
 * Initialize the CSS2D label renderer.
 * Appends the overlay as a sibling of the canvas inside a shared wrapper.
 */
export function initLabelRenderer(camera, domElement) {
  labelRenderer = new CSS2DRenderer();

  const canvas = domElement;

  // Create a wrapper around the canvas so the label overlay is positioned relative to it
  const wrapper = document.createElement('div');
  wrapper.id = 'scene-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.width = canvas.style.width || '100%';
  wrapper.style.height = canvas.style.height || '100%';
  canvas.parentNode.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);

  labelRenderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  wrapper.appendChild(labelRenderer.domElement);

  window.addEventListener('resize', () => {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    labelRenderer.setSize(w, h);
  });

  return labelRenderer;
}

/**
 * Create a text label that tracks a 3D object.
 */
export function createLabel(text, { color = '#ffffff', fontSize = '12px', offsetY = 0 } = {}) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.color = color;
  div.style.fontSize = fontSize;
  div.style.fontFamily = "'Courier New', monospace";
  div.style.fontWeight = 'bold';
  div.style.letterSpacing = '1px';
  div.style.textShadow = '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)';
  div.style.pointerEvents = 'none';
  div.style.userSelect = 'none';
  div.style.whiteSpace = 'nowrap';

  const label = new CSS2DObject(div);
  label.position.set(0, offsetY, 0);
  return label;
}
