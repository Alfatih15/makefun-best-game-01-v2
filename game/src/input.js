// LUMENFALL — keyboard and pointer input. One job: turn browser events into
// a small state the game reads each frame (held keys, just-pressed keys,
// mouse position and clicks). Nothing here knows about the game.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, rightDown: false, clicked: false, rightClicked: false },
    anyKey: false,
  };

  const updateMouse = (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - rect.left;
    input.mouse.y = e.clientY - rect.top;
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      input.keys.add(e.code);
      input.pressed.add(e.code);
      input.anyKey = true;
    }
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
    input.mouse.rightDown = false;
  });
  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (e) => {
    updateMouse(e);
    if (e.button === 0) {
      input.mouse.down = true;
      input.mouse.clicked = true;
    } else if (e.button === 2) {
      input.mouse.rightDown = true;
      input.mouse.rightClicked = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouse.down = false;
    if (e.button === 2) input.mouse.rightDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  input.isDown = (...codes) => codes.some((c) => input.keys.has(c));
  input.wasPressed = (...codes) => codes.some((c) => input.pressed.has(c));

  // Call once per frame after the game has read the input: edge flags clear.
  input.endFrame = () => {
    input.pressed.clear();
    input.mouse.clicked = false;
    input.mouse.rightClicked = false;
    input.anyKey = false;
  };

  return input;
}
