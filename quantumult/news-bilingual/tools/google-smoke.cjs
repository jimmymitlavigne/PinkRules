const assert = require('node:assert/strict');
const {execute, request} = require('../tests/harness.cjs');
(async () => {
  const result = await execute(request(['The central bank kept interest rates unchanged.', 'Global trade increased by three percent.']), undefined, async options => {
    const response = await fetch(options.url, {method: options.method, headers: options.headers, body: options.body, redirect: 'manual', signal: AbortSignal.timeout(10000)});
    return {statusCode: response.status, body: await response.text()};
  });
  const data = JSON.parse(result.body);
  if (!/ 200 /.test(result.status)) throw new Error(data.error || result.status);
  assert.equal(data.translations.length, 2);
  assert.ok(data.translations.every(text => /[\u3400-\u9fff]/.test(text)));
  console.log(JSON.stringify({provider: 'Google', result: 'live HTTP passed via Node fetch adapter (not iOS Quantumult X)', translations: data.translations}, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
