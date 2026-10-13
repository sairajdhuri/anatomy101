import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Synthetic triangles are only a renderer test fixture, never application anatomy assets.
const specs = [['heart', 'cardiac'], ['aortic valve', 'cardiac'], ['right ventricle', 'cardiac'],
  ['left atrium', 'cardiac'], ['brain', 'nervous'], ['femur', 'skeletal']];
const binary = Buffer.alloc(specs.length * 68);
const parts = specs.map(([name, system], i) => {
  const offset = i * 68, x = (i - 2.5) * .1;
  new Float32Array(binary.buffer, binary.byteOffset + offset, 9).set([x - .05, .65, 0, x + .05, .65, 0, x, .9, 0]);
  new Int16Array(binary.buffer, binary.byteOffset + offset + 36, 9).set([0, 0, 32767, 0, 0, 32767, 0, 0, 32767]);
  new Uint32Array(binary.buffer, binary.byteOffset + offset + 56, 3).set([0, 1, 2]);
  return { id: `p-${i}`, conceptId: `c-${i}`, name, system, chunk: 0, positions: offset, normals: offset + 36,
    indices: offset + 56, vertexCount: 3, indexCount: 3, bounds: [[x - .05, .65, 0], [x + .05, .9, 0]] };
});
const atlas = { version: 'browser-test-only', parts,
  concepts: parts.map(part => ({ id: part.conceptId, name: part.name, elements: [part.id] })),
  chunks: [{ url: '/models/body-0.bin', bytes: binary.length }], triangles: parts.length };

const browser = await chromium.launch({ headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()); });
await context.route('**/models/atlas.json', route => route.fulfill({ json: atlas }));
await context.route('**/models/body-0.bin', route => route.fulfill({ body: binary, contentType: 'application/octet-stream' }));
await mkdir('artifacts', { recursive: true });

try {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start exploring', exact: true }).first().click();
  await page.locator('canvas').waitFor();
  await page.getByRole('heading', { name: 'Preparing the anatomy' }).waitFor({ state: 'hidden' });
  assert.equal(await page.locator('canvas').count(), 1);
  await page.getByRole('button', { name: 'Hide skeleton', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Show skeleton', exact: true }).getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', { name: 'Show skeleton', exact: true }).click();
  await page.getByRole('button', { name: 'Full body', exact: true }).click();

  await page.getByRole('textbox', { name: 'Search anatomy' }).fill('heart');
  await page.locator('.structure-list button').first().click();
  await page.getByRole('heading', { name: 'heart', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Isolate structure', exact: true }).click();
  await page.getByRole('button', { name: 'Show surrounding anatomy', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save structure', exact: true }).click();
  await page.getByRole('tab', { name: 'My notes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your revision notes' }).fill('Review coronary dominance.');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start exploring', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Preparing the anatomy' }).waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: /Saved/ }).click();
  await page.locator('.structure-list button').first().click();
  assert.equal(await page.getByRole('button', { name: 'Remove bookmark' }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('tab', { name: 'My notes' }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Your revision notes' }).inputValue(), 'Review coronary dominance.');

  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.locator('#explode').fill('100');
  assert.equal(await page.locator('output[for=explode]').innerText(), '100%');
  assert.equal(await page.getByRole('button', { name: 'side view', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await page.locator('#explode').inputValue(), '0');
  await page.getByRole('button', { name: 'Revise', exact: true }).click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('heading', { name: 'Which structure is this?' }).waitFor();
  assert.equal(await page.locator('.structure-heading').count(), 0);
  assert.equal(await page.locator('#explode').isDisabled(), true);
  await page.locator('.quiz-choices button').first().click();
  await page.getByRole('button', { name: 'Next structure', exact: true }).waitFor();
  assert.match(await page.locator('.revision-score strong').innerText(), /^[01]\/1$/);
  assert.equal(await page.locator('.quiz-choices .correct').count(), 1);
  await page.getByRole('button', { name: 'Next structure', exact: true }).click();
  assert.equal(await page.locator('.structure-heading').count(), 0);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();

  await page.getByRole('button', { name: 'About this atlas' }).click();
  assert.equal(await page.locator('dialog').evaluate(element => element.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').evaluate(element => element.open), false);
  await page.keyboard.press('/');
  assert.equal(await page.getByRole('textbox', { name: 'Search anatomy' }).evaluate(element => element === document.activeElement), true);
  await page.getByRole('textbox', { name: 'Search anatomy' }).fill('');
  await page.getByRole('tab', { name: 'Systems', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');

  for (const [width, height] of [[1440, 1000], [1024, 768], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `artifacts/studio-test-${width}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open anatomy library' }).click();
  await page.getByRole('textbox', { name: 'Search anatomy' }).fill('brain');
  await page.locator('.structure-list button').first().click();
  await page.getByRole('heading', { name: 'brain', exact: true }).waitFor();
  assert.equal(await page.locator('.library').isVisible(), false);
  assert.equal(await page.locator('.context-note').count(), 1);

  await page.evaluate(() => localStorage.setItem('human-atlas-study-v1', '{broken'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start exploring', exact: true }).first().click();
  await page.locator('.storage-notice').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('human-atlas-study-v1')), '{broken');

  assert.deepEqual(errors, []);
  console.log('Browser checks passed: renderer fixture, layers, search, isolation, separation, bookmarks, notes, quiz, keyboard, dialog, six viewport sizes.');
} catch (error) {
  await page.screenshot({ path: 'artifacts/browser-failure.png', fullPage: true });
  console.error('Browser errors:', errors);
  throw error;
} finally { await browser.close(); }
