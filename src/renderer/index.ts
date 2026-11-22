import { QUILL_STATES, assetFileFor, type QuillState } from './quill-assets.js';

// Provisional screen: switch the character image with buttons.
const img = document.getElementById('quill') as HTMLImageElement;
const buttons = document.getElementById('states') as HTMLDivElement;

function show(state: QuillState): void {
  img.src = `states/${assetFileFor(state)}`;
  img.alt = state;
  for (const button of buttons.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.state === state);
  }
}

for (const state of QUILL_STATES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = state;
  button.dataset.state = state;
  button.addEventListener('click', () => show(state));
  buttons.appendChild(button);
}

show('idle');
