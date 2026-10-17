import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const atlas = JSON.parse(await readFile('public/models/atlas-fast.json', 'utf8'));
const systems = ['skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary'];
const opening = new Set(atlas.parts.filter(p => systems.includes(p.system)).map(p => atlas.chunks[p.chunk].url));
const muscles = new Set(atlas.parts.filter(p => p.system === 'muscular').map(p => atlas.chunks[p.chunk].url));
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [], requests = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', request => { if (request.url().endsWith('.meshopt.gz')) requests.push(new URL(request.url()).pathname); });
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000');
  assert.match(await page.locator('.atlas-cover').evaluate(e => getComputedStyle(e).fontFamily), /Presque/);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 500000, uploadThroughput: 125000 });
  const started = Date.now();
  await page.getByRole('link', { name: 'Start learning', exact: true }).click();
  await page.locator('.is-streaming').waitFor();
  const firstLayerMs = Date.now() - started;
  assert.match(await page.locator('.studio').evaluate(e => getComputedStyle(e).fontFamily), /DM Sans/);
  assert.equal(await page.locator('.is-streaming').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
  await page.getByRole('button', { name: 'front view', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'front view', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.screenshot({ path: 'artifacts/atlas-streaming.png' });
  await page.locator('.loading-state').waitFor({ state: 'hidden' });
  const openingMs = Date.now() - started;
  assert.deepEqual(new Set(requests), opening, 'Opening must request only visible systems');
  const initialBytes = atlas.chunks.filter(c => opening.has(c.url)).reduce((n, c) => n + c.downloadBytes, 0);
  assert.ok(initialBytes < 8_000_000);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  await page.getByRole('link', { name: 'Anatomy101 home' }).hover();
  assert.equal(await page.locator('.brand').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
  await page.getByRole('button', { name: 'Focus view', exact: true }).click();
  assert.equal(await page.locator('.library').evaluate(e => e.inert), true);
  await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
  assert.equal(await page.locator('.library').evaluate(e => e.inert), false);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  assert.equal(await page.locator('#explode').inputValue(), '45');
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  assert.equal(await page.locator('#explode').inputValue(), '100');
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await page.getByRole('button', { name: 'Show muscles', exact: true }).click();
  await page.locator('.loading-state').waitFor({ state: 'hidden' });
  assert.deepEqual(new Set(requests), new Set([...opening, ...muscles]), 'Enabling muscles must fetch only that system');

  // Return visits must work from the validated geometry cache even when its network URLs fail.
  await page.waitForFunction(async expected => (await (await caches.open('anatomy-geometry-v1')).keys()).length >= expected, new Set([...opening, ...muscles]).size);
  requests.length = 0;
  await page.route('**/*.meshopt.gz', route => route.abort());
  await page.getByRole('link', { name: 'Anatomy101 home' }).click();
  await page.getByRole('link', { name: 'Start learning', exact: true }).click();
  await page.locator('.loading-state').waitFor({ state: 'hidden' });
  assert.deepEqual(requests, [], 'Cached geometry should not hit the network');
  await page.unroute('**/*.meshopt.gz');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.mouse.move(1430, 20);
  await page.screenshot({ path: 'artifacts/atlas-desktop.png' });
  for (const [width, height] of [[1024, 768], [768, 1024], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
    await page.screenshot({ path: `artifacts/atlas-final-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open anatomy library' }).click();
  await page.getByRole('textbox', { name: 'Search anatomy' }).fill('heart');
  await page.locator('.structure-list button').first().click();
  await page.locator('.selection-peek').click();
  await page.waitForFunction(() => { const rect = document.querySelector('.structure-heading h2')?.getBoundingClientRect(); return rect && rect.top >= 68 && rect.top < innerHeight; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.detail-content').evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.deepEqual(errors, []);
  const metrics = { network: '4 Mbps, 100 ms latency; local static server, headless Chromium software WebGL', firstLayerMs, openingMs, initialBytes, requestedOpeningChunks: opening.size, cachedReturnRequests: 0 };
  await writeFile('artifacts/atlas-loading-metrics.json', JSON.stringify(metrics, null, 2));
  console.log(metrics);
} finally { await browser.close(); }
