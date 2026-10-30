'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.HV_TEST_URL || 'http://localhost:4323';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], failedRequests = [], rows = [];
  const started = Date.now();
  const deadline = setTimeout(() => browser.close(), 600000);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('/art/rigs/')) failedRequests.push({ url: r.url(), status: r.status() }); });
    await page.goto(base + '/animation-preview.html');
    await page.waitForFunction(() => window.HVRig && document.querySelectorAll('#character option').length === Object.keys(HVRig.registry).length);
    await page.evaluate(async () => {
      await HVRig.ready;
      window.catalogEvictions = [];
      addEventListener('hv-rig-evicted', e => catalogEvictions.push({ key: e.detail.key, selected: document.querySelector('#character').value }));
    });
    const keys = await page.locator('#character option').evaluateAll(options => options.map(o => o.value));
    assert(keys.length > 24, 'Catalog must exceed the cache budget');
    async function select(key) {
      await page.selectOption('#character', key);
      await page.waitForFunction(key => {
        if (!HVRig.assets.has(key) || document.querySelector('#character').value !== key) return false;
        const canvases = [...document.querySelectorAll('#views canvas')];
        return canvases.length === 6 && canvases.every(c => {
          const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let visible = 0;
          for (let i = 3; i < data.length; i += 16) if (data[i] > 20) visible++;
          return visible > 100;
        });
      }, key, { timeout: 20000 });
      return page.evaluate(key => ({ key, sixViews: document.querySelectorAll('#views canvas').length, resident: HVRig.assets.has(key), cacheSize: HVRig.assets.size, failure: HVRig.failures[key] || null, status: document.querySelector('#status').textContent }), key);
    }
    for (const [i, key] of keys.entries()) {
      const row = await select(key);
      assert(!row.failure, key + ': ' + row.failure);
      assert(row.cacheSize <= 24, 'Workshop cache exceeds24: ' + row.cacheSize);
      rows.push(row);
      if ((i + 1) % 20 === 0) console.log('Verified ' + (i + 1) + '/' + keys.length + ' kits');
    }
    const beforeReload = await page.evaluate(() => ({ resident: [...HVRig.assets.keys()], evictions: catalogEvictions.slice(), active: document.querySelector('#character').value }));
    assert(beforeReload.evictions.length > 0, 'No cache eviction exercised');
    assert(beforeReload.evictions.every(e => e.key !== e.selected), 'Selected kit was evicted');
    assert(beforeReload.resident.includes(keys.at(-1)), 'Last selected kit missing');
    const oldKey = keys.find(key => !beforeReload.resident.includes(key));
    assert(oldKey, 'No previously visited kit to reload');
    const reloaded = await select(oldKey);
    assert(reloaded.resident && !reloaded.failure, 'Previously evicted kit did not reload');
    await select(keys.at(-1));
    assert.equal(errors.length, 0, JSON.stringify(errors));
    assert.equal(failedRequests.length, 0, JSON.stringify(failedRequests));
    const report = { testedAt: new Date().toISOString(), elapsedMs: Date.now() - started, catalogCount: keys.length, sixViewKits: rows.length, maxResident: Math.max(...rows.map(r => r.cacheSize)), evictions: beforeReload.evictions.length, selectedKitNeverEvicted: true, reloadedKey: oldKey, errors, failedRequests, rows };
    if (process.env.HV_CATALOG_REPORT) fs.writeFileSync(process.env.HV_CATALOG_REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
  } finally {
    clearTimeout(deadline);
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
