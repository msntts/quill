import { bindQuillImage } from './bind-quill-image.js';

declare global {
  interface Window {
    quill: { onStatus(callback: (state: unknown) => void): void };
  }
}

bindQuillImage((callback) => window.quill.onStatus(callback), document.getElementById('quill') as HTMLImageElement);
