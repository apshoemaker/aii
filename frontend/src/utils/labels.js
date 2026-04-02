import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

let labelRenderer = null;

/**
 * Initialize the CSS2D label renderer. Call once, passing the canvas container.
 */
export function initLabelRenderer(camera, domElement) {
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  document.body.appendChild(labelRenderer.domElement);

  window.addEventListener('resize', () => {
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
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
