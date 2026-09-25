function browserMain(config) {
  'use strict';
  if (window.__newsBilingualV2) return;
  window.__newsBilingualV2 = true;
  var root = null, identity = '', entries = [], generation = 0, active = null;
  var enabled = false, busy = false, paused = false, scheduled = null;
  var provider = config.provider;
  var cache = new Map();
  var marker = 'data-news-bilingual-translation';
  var host = document.createElement('div');
  host.id = 'news-bilingual-control';
  var shadow = host.attachShadow({mode: 'open'});
  var style = document.createElement('style');
  style.textContent = ':host{all:initial!important}*{box-sizing:border-box}.box{position:fixed;z-index:2147483647;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));font:14px -apple-system,BlinkMacSystemFont,sans-serif;color:#182b45;background:#fffffff5;border:1px solid #cad4e0;border-radius:15px;box-shadow:0 6px 24px #14294030;padding:8px;max-width:calc(100vw - 24px)}.row{display:flex;gap:5px;align-items:center}button,select{font:inherit;border:0;border-radius:9px;min-height:40px;padding:7px 10px;color:inherit;background:#eef2f7}button{cursor:pointer}button.primary{background:#1756a9;color:white;min-width:60px}button:focus-visible,select:focus-visible{outline:3px solid #70a8ec;outline-offset:2px}.status{display:block;font-size:12px;padding:5px 3px 1px;max-width:260px;line-height:1.4}.status:empty{display:none}[hidden]{display:none!important}@media(prefers-color-scheme:dark){.box{background:#152234f5;color:#eef3fb;border-color:#42556d}button,select{background:#2c3d54}button.primary{background:#397bd3}}';
  var box = document.createElement('div'); box.className = 'box'; box.hidden = true;
  var button = document.createElement('button'); button.className = 'primary'; button.type = 'button'; button.textContent = '显示双语';
  button.title = '点击翻译；完成后再次点击显示原文';
  var status = document.createElement('span'); status.className = 'status'; status.setAttribute('role', 'status');
  box.appendChild(button); box.appendChild(status); shadow.appendChild(style); shadow.appendChild(box);
  (document.body || document.documentElement).appendChild(host);

  function pageId() { return location.origin + location.pathname + location.search; }
  function textOf(node) { return (node.textContent || '').replace(/\s+/g, ' ').trim(); }
  function candidates(node) {
    return Array.prototype.filter.call(node.querySelectorAll('p,h2,h3'), function (p) {
      if (p.closest('nav,aside,footer,form,figure,[hidden],[aria-hidden="true"],[' + marker + ']')) return false;
      var text = textOf(p);
      if (!text || !/[A-Za-z]/.test(text) || !p.getClientRects().length) return false;
      var css = getComputedStyle(p);
      if (css.visibility === 'hidden' || css.display === 'none') return false;
      var linkText = Array.prototype.reduce.call(p.querySelectorAll('a'), function (n, a) { return n + textOf(a).length; }, 0);
      return linkText < text.length * 0.8;
    });
  }
  function findRoot() {
    var selectors = ['[itemprop="articleBody"]', 'section[name="articleBody"]', '[data-testid="article-body"]',
      '[data-testid="story-body"]', '[data-testid="BodyWrapper"]', '#article-body', '.article__content-body', '.article-body', 'article'];
    // main alone is insufficient: homepages also have paragraphs.
    if (document.querySelector('meta[property="og:type"][content="article"]')) selectors.push('main');
    for (var i = 0; i < selectors.length; i++) {
      var best = null, score = 0;
      Array.prototype.forEach.call(document.querySelectorAll(selectors[i]), function (candidate) {
        var nodes = candidates(candidate), size = nodes.reduce(function (n, p) { return n + textOf(p).length; }, 0);
        if (size > score && nodes.length >= 1) { score = size; best = candidate; }
      });
      if (best && score >= 100) return best;
    }
    return null;
  }
  function chunks(text) {
    var result = [], remaining = text;
    while (remaining.length > config.limits.part) {
      var end = config.limits.part;
      if (/^[\uDC00-\uDFFF]$/.test(remaining.charAt(end))) end--;
      var space = remaining.lastIndexOf(' ', end);
      if (space > end * 0.5) end = space;
      result.push(remaining.slice(0, end).trim()); remaining = remaining.slice(end).trim();
    }
    if (remaining) result.push(remaining);
    return result;
  }
  function stop() {
    generation++; busy = false;
    if (active) { active.abort(); active = null; }
    button.textContent = '显示双语';
  }
  function remove(entry) { if (entry.output) { entry.output.remove(); entry.output = null; } }
  function reset() {
    stop(); entries.forEach(remove); entries = []; enabled = false; paused = false; status.textContent = '';
  }
  function cacheKey(text) { return provider + '|' + config.cacheScope + '|' + text; }
  function remember(key, value) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    while (cache.size > 500) cache.delete(cache.keys().next().value);
  }
  function render(entry) {
    if (!entry.node.isConnected || textOf(entry.node) !== entry.text) return;
    var translations = entry.parts.map(function (part) { return cache.get(cacheKey(part)); });
    if (translations.some(function (part) { return !part; })) return;
    if (!entry.output || !entry.output.isConnected) {
      entry.output = document.createElement('div'); entry.output.setAttribute(marker, ''); entry.output.lang = 'zh-CN';
      entry.output.style.cssText = 'font:inherit;line-height:1.75;color:#244b72;background:#edf4fb;border-left:3px solid #83a8d0;padding:9px 12px;margin:8px 0 18px;white-space:pre-wrap;';
      entry.node.insertAdjacentElement('afterend', entry.output);
    }
    var text = translations.join(' ');
    if (entry.output.textContent !== text) entry.output.textContent = text;
    entry.output.hidden = !enabled;
  }
  function scan() {
    scheduled = null;
    if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
    var id = pageId(), found = findRoot();
    if (identity !== id || root !== found) { reset(); identity = id; root = found; }
    box.hidden = !root;
    if (!root) return;
    var nodes = candidates(root);
    var changed = nodes.length !== entries.length || nodes.some(function (node, i) { return !entries[i] || entries[i].node !== node || entries[i].text !== textOf(node); });
    if (!changed) { if (enabled) entries.forEach(render); return; }
    var old = entries;
    stop();
    entries = nodes.map(function (node) {
      var text = textOf(node), kept = old.find(function (entry) { return entry.node === node && entry.text === text; });
      return kept || {node: node, text: text, parts: chunks(text), output: null};
    });
    old.forEach(function (entry) { if (entries.indexOf(entry) < 0) remove(entry); });
    if (enabled && !paused) run();
    else if (enabled) button.textContent = '显示原文';
  }
  function schedule() { if (!scheduled) scheduled = setTimeout(scan, 180); }
  function fetchBatch(texts, provider, runId) {
    var controller = new AbortController(), timedOut = false;
    active = controller;
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, 22000);
    return fetch((config.apiOrigin || '') + config.prefix + 'translate', {method: 'POST', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: {'Content-Type': 'application/json'}, body: JSON.stringify({texts: texts, provider: provider})
    }).then(function (response) {
      return response.json().catch(function () { throw new Error('重写接口未返回 JSON，请检查规则是否启用'); }).then(function (data) {
        if (!response.ok) throw new Error(data.error || '翻译请求失败');
        if (!Array.isArray(data.translations) || data.translations.length !== texts.length || data.translations.some(function (s) { return typeof s !== 'string' || !s.trim(); })) throw new Error('译文不完整');
        return data.translations;
      });
    }).catch(function (error) {
      if (timedOut) throw new Error('翻译超时，已完成的译文仍然保留');
      throw error;
    }).finally(function () { clearTimeout(timer); if (runId === generation) active = null; });
  }
  function run() {
    if (!root || busy) return;
    if (!config.configured[provider]) { status.textContent = '请在 BoxJS 中配置 ' + provider + ' API Key'; return; }
    enabled = true; busy = true; paused = false;
    var runId = ++generation, runRoot = root, runUrl = pageId();
    var pending = [], seen = new Set();
    entries.forEach(function (entry) {
      render(entry);
      entry.parts.forEach(function (text) { var key = cacheKey(text); if (!cache.has(key) && !seen.has(key)) { seen.add(key); pending.push({key: key, text: text}); } });
    });
    var total = pending.length, completedParts = 0;
    button.textContent = '显示原文';
    function valid() { return generation === runId && root === runRoot && runRoot.isConnected && pageId() === runUrl; }
    function next() {
      if (!valid()) return Promise.resolve();
      if (!pending.length) { busy = false; status.textContent = ''; return Promise.resolve(); }
      var batch = [], length = 0;
      while (pending.length && batch.length < config.limits.items && length + pending[0].text.length <= config.limits.total) {
        var item = pending.shift(); length += item.text.length; batch.push(item);
      }
      status.textContent = '翻译中 ' + completedParts + ' / ' + total;
      return fetchBatch(batch.map(function (item) { return item.text; }), provider, runId).then(function (texts) {
        if (!valid()) return;
        texts.forEach(function (text, i) { remember(batch[i].key, text); });
        entries.forEach(render); completedParts += batch.length;
        return next();
      });
    }
    next().catch(function (error) {
      if (!valid()) return;
      busy = false; paused = true; status.textContent = (error.message || '翻译失败') + '；切回原文后可再试';
    });
  }
  button.addEventListener('click', function () {
    if (enabled) {
      stop(); enabled = false; paused = true;
      entries.forEach(function (entry) { if (entry.output) entry.output.hidden = true; }); status.textContent = '';
    }
    else { scan(); run(); }
  });
  new MutationObserver(function (records) {
    // Ignore our output mutations; otherwise translating a paragraph would restart its own job.
    if (records.some(function (record) {
      var target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target && (target === host || target.closest('[' + marker + ']'))) return false;
      if (record.type === 'attributes') return true;
      if (record.type === 'characterData') return true;
      return Array.prototype.some.call(record.addedNodes, function (n) { return n.nodeType !== 1 || !n.hasAttribute(marker); }) ||
        Array.prototype.some.call(record.removedNodes, function (n) { return n.nodeType !== 1 || !n.hasAttribute(marker); });
    })) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'class', 'style']});
  window.addEventListener('popstate', schedule);
  // pushState may change URL without changing the DOM or firing popstate.
  setInterval(function () { if (pageId() !== identity) schedule(); }, 500);
  scan();
}
