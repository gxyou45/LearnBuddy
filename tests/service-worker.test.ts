import { runInNewContext } from 'node:vm';
import { expect, test, vi } from 'vitest';
import config from '../apps/web/vite.config';

// Exercise the actual generated worker, including the GitHub Pages subpath.
function worker() {
  const plugin = config.plugins![0] as {
    generateBundle: (this: { emitFile: (asset: { source: string }) => void }, options: object, bundle: object) => void;
  };
  let source = '';
  plugin.generateBundle.call({ emitFile: asset => { source = asset.source; } }, {}, {});
  const handlers: Record<string, (event: unknown) => void> = {};
  const cache = { match: vi.fn(), put: vi.fn() };
  const open = vi.fn(async () => cache);
  const fetch = vi.fn(async () => new Response('recording'));
  runInNewContext(source, {
    self: { addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
    location: { origin: 'https://example.test' }, URL, caches: { open }, fetch,
  });
  const request = (range?: string) => {
    const req = new Request(`https://example.test${config.base}static-content/files/assets/audio/test.wav`, {
      headers: range ? { Range: range } : {},
    });
    const respondWith = vi.fn();
    handlers.fetch({ request: req, respondWith });
    return respondWith;
  };
  return { cache, open, fetch, request };
}

test('media range requests bypass the worker, even when a whole file is cached', () => {
  const w = worker();
  w.cache.match.mockResolvedValue(new Response('whole recording'));
  for (const range of ['bytes=0-1', 'bytes=2-', 'bytes=-100']) {
    expect(w.request(range)).not.toHaveBeenCalled();
  }
  expect(w.open).not.toHaveBeenCalled();
  expect(w.fetch).not.toHaveBeenCalled();
});

test('full recordings are cached and remain available offline', async () => {
  const w = worker();
  const response = await w.request().mock.calls[0][0];
  expect(await response.text()).toBe('recording');
  expect(w.cache.put).toHaveBeenCalledOnce();
  w.cache.match.mockResolvedValue(new Response('cached recording'));
  w.fetch.mockRejectedValue(new Error('offline'));
  expect(await (await w.request().mock.calls[0][0]).text()).toBe('cached recording');
  expect(w.fetch).toHaveBeenCalledOnce();
});

test('partial responses are returned without attempting to cache them', async () => {
  const w = worker();
  w.fetch.mockResolvedValue(new Response('RI', { status: 206 }));
  expect((await w.request().mock.calls[0][0]).status).toBe(206);
  expect(w.cache.put).not.toHaveBeenCalled();
});

test.each(['open', 'match', 'put'] as const)('cache %s failure does not interrupt online playback', async operation => {
  const w = worker();
  (operation === 'open' ? w.open : w.cache[operation]).mockRejectedValue(new Error('storage unavailable'));
  expect(await (await w.request().mock.calls[0][0]).text()).toBe('recording');
});
