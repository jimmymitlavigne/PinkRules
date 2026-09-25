// Outputs counts, hosts and structural evidence only, never cookies/tokens/article text.
const fs = require('node:fs');
const path = require('node:path');
const {readRecord} = require('./capture-reader.cjs');
const root = process.argv[2];
if (!root) throw new Error('Usage: node tools/audit-capture.cjs <export-directory>');
const report = {records: 0, chunksDecoded: 0, brotliDecoded: 0, errors: [],
  publisherHosts: {}, htmlResponses: [], otherJsonWithArticleFields: [], wsjStructures: [], economistReferences: 0};
for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
  if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
  const dir = path.join(root, entry.name);
  report.records++;
  try {
    const r = readRecord(dir), u = new URL(r.url), host = u.hostname;
    if (r.chunked) report.chunksDecoded++;
    if (r.body.length && r.headers['content-encoding'] === 'br') report.brotliDecoded++;
    if (/(?:^|\.)(?:ft\.com|wsj\.com|dowjones\.(?:com|io)|nytimes\.com|economist\.com)$/.test(host)) {
      report.publisherHosts[host] = (report.publisherHosts[host] || 0) + 1;
    }
    const type = (r.headers['content-type'] || '').split(';')[0];
    const summary = {id: entry.name, host, path: u.pathname.slice(0, 100), status: r.statusCode, bytes: r.body.length};
    const s = r.body.toString('utf8');
    if (type === 'text/html' && r.body.length) report.htmlResponses.push(summary);
    if (/economist/i.test(s) && /json|text|javascript/.test(type)) report.economistReferences++;
    if (!r.body.length || !/json/.test(type)) continue;
    const data = JSON.parse(s);
    if (/dowjones/.test(host)) report.wsjStructures.push({...summary, topKeys: Object.keys(data).slice(0, 20)});
    if (host === 'samizdat-graphql.nytimes.com') continue;
    const fields = new Set();
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) return value.forEach(walk);
      for (const [k, v] of Object.entries(value)) {
        if (/^(?:body|bodyHtml|bodyText|articleBody|paragraphs|storyBody|hybridBody|articleText)$/i.test(k)) fields.add(k);
        if (typeof v === 'string' && /<(?:p|article)\b/i.test(v)) fields.add('HTML string');
        if (typeof v === 'object') walk(v);
      }
    };
    walk(data);
    if (fields.size) report.otherJsonWithArticleFields.push({...summary, fields: [...fields]});
  } catch (e) { report.errors.push({id: entry.name, error: e.name}); }
}
console.log(JSON.stringify(report, null, 2));
