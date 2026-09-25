const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {origin, prefix, execute, request, json} = require('./harness.cjs');
const html = '<!doctype html><html><body><article><p>A real article would go here.</p></article></body></html>';
const response = {statusCode: 200, headers: {'content-type': 'text/html', 'content-security-policy': "script-src 'nonce-original123'"}, body: html};
const page = {method: 'GET', url: origin + '/content/example'};
const keys = {'NewsBilingual.deeplKey': 'DEEPL_SECRET', 'NewsBilingual.geminiKey': 'GEMINI_SECRET', 'NewsBilingual.deepseekKey': 'DEEPSEEK_SECRET'};

test('HTML injection preserves nonce, content and idempotence; non-HTML passes through', async () => {
  const result = await execute(page, response);
  assert.match(result.body, /nonce="original123"/);
  assert.match(result.body, /news-bilingual-loader/);
  assert.ok(result.body.includes('<p>A real article would go here.</p>'));
  assert.deepEqual(await execute(page, {...response, body: result.body}), {});
  assert.deepEqual(await execute(page, {...response, headers: {'content-type': 'application/json'}}), {});
  assert.deepEqual(await execute(page, {...response, statusCode: 401}), {});
  assert.deepEqual(await execute({...page, url: 'https://ft.com.evil.test/content/test'}, response), {});
});
test('NYT App Asset GraphQL response receives one loader inside hybrid HTML', async () => {
  const url = 'https://samizdat-graphql.nytimes.com/graphql/v2?operationName=Asset&variables=%7B%7D';
  const article = '<!doctype html><html><body><article><p>Native app hybrid article text.</p></article></body></html>';
  const payload = {data: {anyWork: {__typename: 'Article', headline: 'Test', hybridBody: {main: {contents: article}}}}};
  const response = {statusCode: 200, headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)};
  const result = await execute({url, method: 'GET'}, response);
  const parsed = JSON.parse(result.body);
  assert.match(parsed.data.anyWork.hybridBody.main.contents,
    /<script id="news-bilingual-loader" src="https:\/\/www\.nytimes\.com\/__news_bilingual__\/v2\/client\.js\?v=0\.3\.1" defer><\/script>/);
  assert.ok(parsed.data.anyWork.hybridBody.main.contents.includes('Native app hybrid article text.'));
  assert.deepEqual(await execute({url, method: 'GET'}, {...response, body: result.body}), {});
  assert.deepEqual(await execute({url: url.replace('Asset', 'SectionFront'), method: 'GET'}, response), {});
  assert.deepEqual(await execute({url: url.replace('/graphql/v2', '/other'), method: 'GET'}, response), {});
  const collection = JSON.parse(response.body);
  collection.data.anyWork.__typename = 'LegacyCollection';
  assert.deepEqual(await execute({url, method: 'GET'}, {...response, body: JSON.stringify(collection)}), {});
  const reordered = 'https://samizdat-graphql.nytimes.com:443/graphql/v2?variables=%7B%7D&operationName=Asset';
  assert.ok((await execute({url: reordered, method: 'GET'}, response)).body);
});
test('diagnostic state distinguishes injection, client load and provider errors without article text or keys', async () => {
  const prefs = {...keys};
  await execute(page, response, undefined, prefs);
  await execute({url: origin + prefix + 'client.js?v=0.3.1', method: 'GET'}, undefined, undefined, prefs);
  await execute(request(['PRIVATE_ARTICLE_CONTENT']), undefined, async () => json({}, 429), prefs);
  const status = await execute({url: origin + prefix + 'status', method: 'GET'}, undefined, undefined, prefs);
  const recent = JSON.parse(status.body).recent;
  assert.equal(recent.injection.format, 'html');
  assert.equal(recent.client.host, 'www.ft.com');
  assert.equal(recent.translation.state, 'error');
  assert.equal(recent.translation.code, 429);
  assert.doesNotMatch(status.body, /PRIVATE_ARTICLE_CONTENT|SECRET|content\/example/);
  await execute(page, {...response, statusCode: 403}, undefined, prefs);
  const skipped = JSON.parse((await execute({url: origin + prefix + 'status', method: 'GET'}, undefined, undefined, prefs)).body).recent;
  assert.equal(skipped.response.code, 403);
  assert.equal(skipped.response.state, 'skipped');
  assert.equal(skipped.injection.format, 'html');
});
test('client endpoint contains browser code and public settings without API keys', async () => {
  const result = await execute({url: origin + prefix + 'client.js', method: 'GET'}, undefined, undefined, keys);
  assert.match(result.headers['Content-Type'], /application\/javascript/);
  assert.doesNotMatch(result.body, /DEEPL_SECRET|GEMINI_SECRET|DEEPSEEK_SECRET|LOCAL_CONFIG/);
  new (require('node:vm').Script)(result.body);
  const status = await execute({url: origin + prefix + 'status', method: 'GET'}, undefined, undefined, keys);
  assert.equal(JSON.parse(status.body).configured.deepl, true);
  assert.doesNotMatch(status.body, /SECRET/);
  const diagnostic = await execute({url: origin + prefix + 'diagnostic', method: 'GET'}, undefined, undefined, keys);
  assert.match(diagnostic.headers['Content-Type'], /text\/html/);
  assert.match(diagnostic.body, /NewsBilingual 诊断/);
  assert.match(diagnostic.body, /测试翻译/);
  assert.doesNotMatch(diagnostic.body, /DEEPL_SECRET|GEMINI_SECRET|DEEPSEEK_SECRET/);
});
test('Google keeps order, limits concurrency and does not forward publisher credentials', async () => {
  let active = 0, max = 0;
  const result = await execute(request(['First', 'Second', 'Third', 'Fourth']), undefined, async options => {
    active++; max = Math.max(active, max);
    await new Promise(r => setTimeout(r, 5)); active--;
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.opts['auto-cookie'], false);
    assert.equal(options.opts.redirection, false);
    return json([[[new URL(options.url).searchParams.get('q') + '中文']]]);
  });
  assert.deepEqual(JSON.parse(result.body).translations, ['First中文', 'Second中文', 'Third中文', 'Fourth中文']);
  assert.ok(max <= 2);
});
test('DeepL, Gemini and DeepSeek authenticated request/response contracts', async () => {
  for (const provider of ['deepl', 'gemini', 'deepseek']) {
    const result = await execute(request(['One', 'Two'], provider), undefined, async options => {
      const body = JSON.parse(options.body);
      if (provider === 'deepl') {
        assert.equal(options.headers.Authorization, 'DeepL-Auth-Key DEEPL_SECRET');
        assert.deepEqual(body.text, ['One', 'Two']);
        return json({translations: [{text: '一'}, {text: '二'}]});
      }
      if (provider === 'gemini') {
        assert.equal(options.headers['x-goog-api-key'], 'GEMINI_SECRET');
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        return json({candidates: [{finishReason: 'STOP', content: {parts: [{text: '{"translations":["一","二"]}' }]}}]});
      }
      assert.equal(options.headers.Authorization, 'Bearer DEEPSEEK_SECRET');
      assert.equal(body.thinking.type, 'disabled');
      return json({choices: [{finish_reason: 'stop', message: {content: '{"translations":["一","二"]}'}}]});
    }, keys);
    assert.deepEqual(JSON.parse(result.body).translations, ['一', '二']);
  }
});
test('unconfigured, malformed, oversized and cross-origin requests make no network calls', async () => {
  const bad = [request(['hello'], 'deepl'), request(['a'.repeat(1201)]), request(['x'.repeat(1100), 'x'.repeat(1100), 'x'.repeat(1100), 'x'.repeat(1100)]),
    {...request(['hello']), body: '{'}, {...request(['hello']), headers: {'Content-Type': 'application/json', Origin: 'https://evil.test'}},
    request(['hello'], '__proto__')];
  for (const req of bad) {
    const result = await execute(req);
    assert.doesNotMatch(result.status, / 200 /);
    assert.equal(typeof JSON.parse(result.body).error, 'string');
  }
});
test('service errors, truncated and incomplete AI results fail visibly', async () => {
  for (const payload of [json({}, 429), json({choices: [{finish_reason: 'length', message: {content: '{"translations":["一"]}'}}]}),
    json({choices: [{finish_reason: 'stop', message: {content: '{"translations":[]}'}}]})]) {
    const result = await execute(request(['hello'], 'deepseek'), undefined, async () => payload, keys);
    assert.doesNotMatch(result.status, / 200 /);
    assert.ok(JSON.parse(result.body).error);
  }
});
test('stalled provider returns timeout', async () => {
  const result = await execute(request(['hello']), undefined, () => new Promise(() => {}), {}, 0.001);
  assert.match(result.status, / 504 /);
});
test('snippet endpoints match each supported host and all use one JS', () => {
  const text = fs.readFileSync(path.join(__dirname, '../NewsBilingual.snippet'), 'utf8');
  const rules = text.split('\n').filter(s => s.startsWith('^')).map(s => {
    const [pattern, operation] = s.split(' url '); return {regex: new RegExp(pattern), operation};
  });
  assert.equal(rules.length, 4);
  for (const host of ['www.wsj.com', 'www.nytimes.com', 'www.ft.com', 'app.ft.com', 'www.economist.com']) {
    assert.ok(rules[0].regex.test('https://' + host + prefix + 'translate'));
    assert.ok(rules[1].regex.test('https://' + host + prefix + 'client.js'));
    assert.ok(rules[1].regex.test('https://' + host + prefix + 'diagnostic'));
    assert.ok(rules[3].regex.test('https://' + host + '/content/example'));
    assert.equal(rules[3].regex.test('https://' + host + prefix + 'client.js'), false);
    assert.equal(rules[3].regex.test('https://' + host + '/_origami/service/image/v2/images/raw/test'), false);
    assert.equal(rules[3].regex.test('https://' + host + '/__origami/service/image/v2/images/raw/test?source=app'), false);
    assert.equal(rules[3].regex.test('https://' + host + '/vi-assets/static-assets/app'), false);
    assert.equal(rules[3].regex.test('https://' + host + '/assets/app.js'), false);
    assert.equal(rules[3].regex.test('https://' + host + '/photo.webp?width=402'), false);
  }
  assert.ok(rules[2].regex.test('https://samizdat-graphql.nytimes.com/graphql/v2?operationName=Asset&variables=%7B%7D'));
  assert.ok(rules[2].regex.test('https://samizdat-graphql.nytimes.com:443/graphql/v2?variables=%7B%7D&operationName=Asset'));
  assert.equal(rules[2].regex.test('https://samizdat-graphql.nytimes.com/graphql/v2?operationName=SectionFront'), false);
  const scripts = rules.map(r => r.operation.split(' ').pop());
  assert.equal(new Set(scripts).size, 1);
  assert.ok(scripts.every(s => /(?:^|\/)NewsBilingual\.js(?:\?v=[\d.]+)?$/.test(s)));
  assert.ok(rules.every(r => !r.regex.test('https://ft.com.evil.test/content/example')));
});
