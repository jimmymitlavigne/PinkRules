// Read a local Quantumult X export. Never copy article bodies or headers to the repo.
// All browser requests are intercepted; translations are local mocks.
const fs = require('node:fs');
const path = require('node:path');
const {readRecord} = require('./capture-reader.cjs');
const assert = require('node:assert/strict');
const {execute, prefix, json} = require('../tests/harness.cjs');

async function main() {
  const root = process.argv[2];
  if (!root) throw new Error('Usage: node tools/replay-capture.cjs <export-directory> [--browser]');
  const rules = fs.readFileSync(path.join(__dirname, '../NewsBilingual.snippet'), 'utf8').split('\n')
    .filter(line => line.includes(' url script-response-body ')).map(line => new RegExp(line.split(' url ')[0]));
  const report = {records: 0, ftImageRequests: 0, ftImageMatches: 0, nytArticles: 0, nytNonArticles: 0, nytEmptyResponses: 0,
    rewritten: 0, browserPages: 0, translatedParagraphs: 0, externalRequestsSent: 0};
  const articles = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    const dir = path.join(root, entry.name);
    const url = fs.readFileSync(path.join(dir, 'basic'), 'utf8').trim();
    const u = new URL(url);
    report.records++;
    if (u.hostname === 'www.ft.com' && u.pathname.startsWith('/__origami/service/image/')) {
      report.ftImageRequests++;
      if (rules.some(r => r.test(url))) report.ftImageMatches++;
    }
    if (u.hostname !== 'samizdat-graphql.nytimes.com' || u.searchParams.get('operationName') !== 'Asset') continue;
    const record = readRecord(dir);
    if (!record.body.length) { report.nytEmptyResponses++; continue; }
    const body = record.body.toString('utf8');
    const original = JSON.parse(body);
    const work = original.data && original.data.anyWork;
    assert.ok(rules.some(r => r.test(url)), 'Asset URL must match the deployed rule');
    const response = {statusCode: record.statusCode, headers: record.headers, body};
    const result = await execute({url, method: 'GET'}, response);
    if (!work || work.__typename !== 'Article') {
      report.nytNonArticles++;
      assert.deepEqual(result, {}, 'Non-article data must stay unchanged');
      continue;
    }
    report.nytArticles++;
    const output = JSON.parse(result.body);
    const html = output.data.anyWork.hybridBody.main.contents;
    assert.equal((html.match(/id="news-bilingual-loader"/g) || []).length, 1);
    output.data.anyWork.hybridBody.main.contents = work.hybridBody.main.contents;
    assert.deepEqual(output, original, 'Every field other than the HTML must remain unchanged');
    assert.deepEqual(await execute({url, method: 'GET'}, {...response, body: result.body}), {});
    report.rewritten++;
    articles.push({id: entry.name, url: work.url, html});
  }
  assert.equal(report.ftImageMatches, 0, 'FT image requests must not invoke the script');
  if (process.argv.includes('--browser')) {
    const {chromium} = require('playwright');
    const browser = await chromium.launch({headless: true,
      executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    try {
      for (const article of articles) {
        const ctx = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
        const page = await ctx.newPage();
        let clientCalls = 0, translationCalls = 0;
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // Publisher scripts and event handlers are not executed in this offline DOM replay.
        const html = article.html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, tag =>
          tag.includes('id="news-bilingual-loader"') ? tag.replace('<script ', '<script nonce="replay-only" ') : '');
        await ctx.route('**/*', async route => {
          const req = route.request(), u = new URL(req.url());
          if (req.isNavigationRequest() && req.url() === article.url) {
            await route.fulfill({status: 200, headers: {'Content-Type': 'text/html',
              'Content-Security-Policy': "default-src 'none'; script-src 'nonce-replay-only'; style-src 'unsafe-inline'; connect-src https://www.nytimes.com; img-src data:"}, body: html});
          } else if (u.origin === 'https://www.nytimes.com' && u.pathname.startsWith(prefix)) {
            if (u.pathname.endsWith('client.js')) clientCalls++;
            if (u.pathname.endsWith('translate')) translationCalls++;
            const result = await execute({url: req.url(), method: req.method(), headers: await req.allHeaders(), body: req.postData() || ''},
              undefined, async options => {
                assert.equal(new URL(options.url).hostname, 'translate.googleapis.com');
                return json([[['离线模拟译文']]]);
              });
            await route.fulfill({status: Number(result.status.split(' ')[1]), headers: result.headers, body: result.body});
          } else await route.abort();
        });
        await page.goto(article.url, {waitUntil: 'domcontentloaded'});
        await page.getByRole('button', {name: '显示双语', exact: true}).waitFor({timeout: 8000});
        assert.equal(await page.locator('#news-bilingual-control').getByRole('button').count(), 1);
        assert.equal(clientCalls, 1, 'Loader must fetch exactly one client');
        assert.equal(translationCalls, 0, 'Opening an article must not translate without a click');
        await page.getByRole('button', {name: '显示双语', exact: true}).click();
        await page.waitForFunction(() => { const s = document.querySelector('#news-bilingual-control').shadowRoot; return s.querySelector('button').textContent === '显示原文' && s.querySelector('.status').textContent === ''; }, null, {timeout: 15000});
        const count = await page.locator('[data-news-bilingual-translation]').count();
        assert.ok(count > 0, 'Article ' + article.id + ' has no translated paragraphs');
        const calls = translationCalls;
        await page.getByRole('button', {name: '显示原文', exact: true}).click();
        assert.equal(await page.locator('[data-news-bilingual-translation]:visible').count(), 0);
        await page.getByRole('button', {name: '显示双语', exact: true}).click();
        await page.waitForFunction(() => { const s = document.querySelector('#news-bilingual-control').shadowRoot; return s.querySelector('button').textContent === '显示原文' && s.querySelector('.status').textContent === ''; });
        assert.equal(translationCalls, calls, 'Cached toggle must not refetch');
        assert.deepEqual(errors, []);
        report.browserPages++;
        report.translatedParagraphs += count;
        console.log('Offline article ' + article.id + ': ' + count + ' paragraphs passed');
        await ctx.close();
      }
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
