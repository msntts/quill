import { describe, expect, it } from 'vitest';
import { bindQuillImage } from './bind-quill-image';

function setup() {
  let notify: (state: unknown) => void = () => {};
  const img = { src: '', alt: '' };
  bindQuillImage((cb) => (notify = cb), img);
  return { img, notify: (state: unknown) => notify(state) };
}

describe('bindQuillImage', () => {
  it('QS-09 起動直後', () => {
    const { img } = setup();

    expect(img.src).toBe('states/quill-idle.svg');
    expect(img.alt).toBe('idle');
  });

  it('QS-07 状態に対応する画像を表示する', () => {
    const { img, notify } = setup();

    notify('fetching');
    expect(img.src).toBe('states/quill-fetching.svg');
    notify('error');
    expect(img.src).toBe('states/quill-error.svg');
    expect(img.alt).toBe('error');
  });

  it('QS-08 知らない状態名は無視する', () => {
    const { img, notify } = setup();
    notify('fetching');

    notify('sleeping');

    expect(img.src).toBe('states/quill-fetching.svg');
  });
});
