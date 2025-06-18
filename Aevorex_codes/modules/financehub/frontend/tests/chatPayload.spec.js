import { expect, test } from 'vitest';

import ChatCore from '../static/js/components/chat/modules/chat-core.js';

// Helper to create instance without DOM
function createCore() {
  return new ChatCore({ enableStreaming: false });
}

test('sendMessage builds payload with config_override.model', async () => {
  const core = createCore();
  await core.init();
  core.setContext({ ticker: 'AAPL' });
  core.state.currentModelId = 'google/gemini-2.0-flash-001';

  // Mock network
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    expect(body.config_override).toEqual({ model: 'google/gemini-2.0-flash-001' });
    return { ok: true, json: async () => ({ assistant_message: { role: 'assistant', content: 'ok' } }) };
  };

  await core.sendMessage('Hi');
}); 