import { describe, it, expect, vi } from 'vitest';
import ChatUI from '../static/js/components/chat/modules/chat-ui.js';

// jsdom environment is already provided by vitest config

describe('ChatUI – deep insight button', () => {
  it('emits deep-request when button clicked', async () => {
    // Arrange DOM container
    const container = document.createElement('div');
    container.id = 'test-chat-container';
    document.body.appendChild(container);

    const ui = new ChatUI('test-chat-container');
    await ui.init();

    const handler = vi.fn();
    ui.on('deep-request', handler);

    const btn = container.querySelector('#chat-deep-btn');
    expect(btn).not.toBeNull();

    btn.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });
}); 