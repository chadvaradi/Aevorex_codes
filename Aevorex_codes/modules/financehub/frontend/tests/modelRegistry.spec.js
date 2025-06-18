import { expect, vi, test, beforeEach } from 'vitest';

// JSDOM global window will be available
beforeEach(() => {
  // Remove cached registry between tests
  delete window.FinHubModels;
});

test('modelRegistry fetches and caches result', async () => {
  // Mock fetch
  const fakeList = [{ id: 'openai/gpt-4o' }];
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => fakeList });

  await import('../static/js/core/modelRegistry.js');
  const list1 = await window.FinHubModels.fetch();
  expect(list1).toEqual(fakeList);

  // Second call should use cache → fetch not called again
  const list2 = await window.FinHubModels.fetch();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(list2).toBe(list1);
}); 