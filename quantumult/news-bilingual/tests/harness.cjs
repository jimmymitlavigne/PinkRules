const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../NewsBilingual.js'), 'utf8');
const origin = 'https://www.ft.com';
const prefix = '/__news_bilingual__/v2/';
function execute(request, response, fetcher, prefs = {}, timeoutScale = 1) {
  return new Promise((resolve, reject) => {
    const timers = new Set();
    const guard = setTimeout(() => reject(new Error('No $done from QX runtime')), 26000);
    const context = {
      $request: request, $prefs: {valueForKey: key => prefs[key] ?? null, setValueForKey: (value, key) => { prefs[key] = value; return true; }},
      $task: {fetch: fetcher || (() => { throw new Error('Unexpected network request'); })},
      setTimeout: (fn, ms) => { const id = setTimeout(fn, ms * timeoutScale); timers.add(id); return id; },
      clearTimeout: id => { clearTimeout(id); timers.delete(id); },
      $done: value => { clearTimeout(guard); timers.forEach(clearTimeout); resolve(JSON.parse(JSON.stringify(value))); }
    };
    if (response !== undefined) context.$response = response;
    try { vm.runInNewContext(source, context, {timeout: 2000}); }
    catch (error) { clearTimeout(guard); timers.forEach(clearTimeout); reject(error); }
  });
}
function request(texts, provider = 'google') {
  return {url: origin + prefix + 'translate', method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: origin}, body: JSON.stringify({texts, provider})};
}
function json(data, statusCode = 200) { return {statusCode, body: JSON.stringify(data)}; }
module.exports = {source, origin, prefix, execute, request, json};
