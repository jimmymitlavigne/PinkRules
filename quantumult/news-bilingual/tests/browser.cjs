const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {execute, prefix, json} = require('./harness.cjs');
const prefs = {'NewsBilingual.deeplKey': 'TEST_ONLY', 'NewsBilingual.geminiKey': 'TEST_ONLY', 'NewsBilingual.deepseekKey': 'TEST_ONLY'};
const csp = "default-src 'self'; script-src 'nonce-testnonce'; style-src 'unsafe-inline'; connect-src 'self'";
const long = Array.from({length: 850}, (_, i) => 'investment' + i).join(' ');
const paragraphs = [
  'Global markets opened higher on Monday as investors reviewed fresh economic data. The report contained updated estimates for trade and employment.',
  'The central bank said future decisions would depend on inflation and the pace of wage growth, while companies continued to report quarterly earnings.',
  'Yes.',
  long
];
const article = '<article><h1>Markets and the economy</h1><section itemprop="articleBody">' +
  paragraphs.map((p, i) => '<p id="p' + i + '">' + p + '</p>').join('') +
  '<blockquote><p>Officials said that the figures remained preliminary and would be revised after the next survey.</p></blockquote>' +
  '<p hidden>This hidden paywall text must never be sent to a translation service.</p></section></article>';
let bridgeCalls = 0, providerCalls = [], failAt = 0, delay = 0;
function fixture(body = article) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{font:18px Georgia;margin:24px;color:#17233a}p{line-height:1.65}h1{font-size:32px}blockquote{margin:15px}</style></head><body>' + body + '</body></html>';
}
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1});
    const errors = [];
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const qxRequest = {url: req.url(), method: req.method(), headers: await req.allHeaders(), body: req.postData() || ''};
      let result;
      if (url.pathname.startsWith(prefix)) {
        if (url.pathname.endsWith('translate')) {
          bridgeCalls++;
          const batch = JSON.parse(qxRequest.body).texts;
          assert.ok(batch.length <= 4 && batch.join('').length <= 4000 && batch.every(s => s.length <= 1200));
          assert.ok(batch.every(s => !s.includes('hidden paywall')));
          if (failAt === bridgeCalls) { await route.fulfill({status: 429, contentType: 'application/json', body: '{"error":"模拟限流，请重试"}'}); return; }
        }
        result = await execute(qxRequest, undefined, async options => {
          providerCalls.push(options);
          if (delay) await new Promise(r => setTimeout(r, delay));
          if (options.url.includes('translate.googleapis.com')) return json([[['中文译文：' + new URL(options.url).searchParams.get('q').slice(0,30)]]]);
          const body = JSON.parse(options.body);
          if (options.url.includes('deepl.com')) return json({translations: body.text.map(() => ({text: 'DeepL 中文译文'}))});
          if (options.url.includes('generativelanguage')) {
            const texts = JSON.parse(body.contents[0].parts[0].text);
            return json({candidates: [{finishReason: 'STOP', content: {parts: [{text: JSON.stringify({translations: texts.map(() => 'Gemini 中文译文')})}]}}]});
          }
          const texts = JSON.parse(body.messages[1].content);
          return json({choices: [{finish_reason: 'stop', message: {content: JSON.stringify({translations: texts.map(() => 'DeepSeek 中文译文')})}}]});
        }, prefs);
      } else {
        const body = fixture(url.pathname === '/home' ? '<main><p>' + paragraphs[0] + '</p><p>' + paragraphs[1] + '</p></main>' : article);
        const original = {statusCode: 200, headers: {'Content-Type': 'text/html', 'Content-Security-Policy': csp}, body};
        result = await execute(qxRequest, original);
        result = {status: 'HTTP/1.1 200 OK', headers: original.headers, body: result.body || body};
      }
      try { await route.fulfill({status: Number(result.status.split(' ')[1]), headers: result.headers, body: result.body}); }
      catch (error) { if (!/closed|intercept|handled/i.test(error.message)) throw error; }
    });
    for (const domain of ['www.wsj.com', 'www.nytimes.com', 'www.ft.com', 'www.economist.com']) {
      await page.goto('https://' + domain + '/content/test');
      await page.getByRole('button', {name: '显示双语', exact: true}).waitFor({state: 'visible'});
    }
    await page.getByRole('button', {name: '显示双语', exact: true}).click();
    await page.waitForFunction(() => { const s = document.querySelector('#news-bilingual-control').shadowRoot; return s.querySelector('button').textContent === '显示原文' && s.querySelector('.status').textContent === ''; });
    assert.equal(await page.locator('#news-bilingual-control').getByRole('button').count(), 1);
    assert.equal(await page.locator('[data-news-bilingual-translation]').count(), 5);
    assert.equal(await page.locator('#p3').innerText(), long);
    const calls = bridgeCalls;
    await page.getByRole('button', {name: '显示原文', exact: true}).click();
    assert.equal(await page.locator('[data-news-bilingual-translation]:visible').count(), 0);
    await page.getByRole('button', {name: '显示双语', exact: true}).click();
    await page.waitForFunction(() => { const s = document.querySelector('#news-bilingual-control').shadowRoot; return s.querySelector('button').textContent === '显示原文' && s.querySelector('.status').textContent === ''; });
    assert.equal(bridgeCalls, calls, 'showing cached translations must not refetch');
    for (const provider of ['deepl', 'gemini', 'deepseek']) {
      prefs['NewsBilingual.provider'] = provider;
      await page.goto('https://www.economist.com/content/' + provider);
      await page.getByRole('button', {name: '显示双语', exact: true}).click();
      await page.waitForFunction(() => { const s = document.querySelector('#news-bilingual-control').shadowRoot; return s.querySelector('button').textContent === '显示原文' && s.querySelector('.status').textContent === ''; });
      assert.equal(await page.locator('[data-news-bilingual-translation]').count(), 5);
    }
    // A fresh article: second batch fails, first batch remains and is reused on retry.
    prefs['NewsBilingual.provider'] = 'google';
    await page.goto('https://www.ft.com/content/fresh');
    await page.evaluate(() => {
      history.pushState({}, '', '/content/retry');
      document.querySelector('section').innerHTML = Array.from({length: 9}, (_, i) => '<p>Unique paragraph ' + i + ': The economy continued to expand as households increased their spending and companies invested in new projects.</p>').join('');
    });
    await page.waitForTimeout(750);
    failAt = bridgeCalls + 2;
    await page.getByRole('button', {name: '显示双语', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#news-bilingual-control').shadowRoot.querySelector('.status').textContent.includes('模拟限流'));
    assert.equal(await page.locator('[data-news-bilingual-translation]').count(), 4);
    const before = providerCalls.length;
    await page.getByRole('button', {name: '显示原文', exact: true}).click();
    await page.getByRole('button', {name: '显示双语', exact: true}).click();
    await page.waitForFunction(() => { const s = document.querySelector('#news-bilingual-control').shadowRoot; return s.querySelector('button').textContent === '显示原文' && s.querySelector('.status').textContent === ''; });
    assert.equal(providerCalls.length - before, 5, 'retry should request only missing segments');
    // Navigation cancels the old job and must not append stale translations to the new article.
    await page.evaluate(() => { history.pushState({}, '', '/content/slow'); document.querySelector('section').innerHTML = '<p>A slow article begins here, with enough original text to activate the bilingual button and test navigation while a translation request is still pending.</p>'; });
    await page.waitForTimeout(750); delay = 1000;
    await page.getByRole('button', {name: '显示双语', exact: true}).click();
    await page.waitForTimeout(100);
    await page.evaluate(() => { history.pushState({}, '', '/content/new'); document.querySelector('section').innerHTML = '<p>A newly opened article must keep its own content and must never display a translation left over from the previous article, even if the older request finishes later.</p>'; });
    await page.waitForTimeout(1500); delay = 0;
    assert.equal(await page.locator('[data-news-bilingual-translation]').count(), 0);
    await page.getByRole('button', {name: '显示双语', exact: true}).waitFor({state: 'visible'});
    // A hybrid app may remove our host or reveal its initially hidden article after startup.
    await page.evaluate(() => document.getElementById('news-bilingual-control').remove());
    await page.getByRole('button', {name: '显示双语', exact: true}).waitFor({state: 'visible'});
    await page.evaluate(() => document.querySelector('article').hidden = true);
    await page.getByRole('button', {name: '显示双语', exact: true}).waitFor({state: 'hidden'});
    await page.evaluate(() => document.querySelector('article').hidden = false);
    await page.getByRole('button', {name: '显示双语', exact: true}).waitFor({state: 'visible'});
    await page.goto('https://www.ft.com/home');
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole('button', {name: '显示双语', exact: true}).isVisible(), false);
    await page.goto('https://www.ft.com' + prefix + 'diagnostic');
    await page.getByRole('heading', {name: '最近运行状态'}).waitFor();
    await page.waitForFunction(() => document.getElementById('health').textContent.includes('正文注入'));
    await page.getByRole('button', {name: '测试翻译'}).click();
    await page.waitForFunction(() => document.getElementById('result').textContent.includes('中文译文'));
    assert.deepEqual(errors, []);
    console.log('Browser integration passed: four HTML host fixtures, nonce CSP, long paragraphs, quotes, hidden content, four providers, cached toggle, retry and SPA race.');
    console.log('Provider calls (mocked): ' + providerCalls.length + '; bridge calls: ' + bridgeCalls);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
