const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function unchunk(raw) {
  let at = 0;
  const chunks = [];
  while (at < raw.length) {
    const end = raw.indexOf('\r\n', at);
    if (end < 0) throw new Error('Truncated HTTP chunk header');
    const line = raw.subarray(at, end).toString('ascii');
    if (!/^[0-9a-f]+(?:;[^\r\n]*)?$/i.test(line)) throw new Error('Invalid HTTP chunk header');
    const size = parseInt(line, 16);
    at = end + 2;
    if (!Number.isSafeInteger(size) || size > raw.length - at) throw new Error('Truncated HTTP chunk body');
    if (!size) return Buffer.concat(chunks);
    chunks.push(raw.subarray(at, at + size));
    at += size;
    if (raw.subarray(at, at + 2).toString() !== '\r\n') throw new Error('Missing HTTP chunk terminator');
    at += 2;
  }
  throw new Error('Missing final HTTP chunk');
}

function readRecord(dir) {
  const url = fs.readFileSync(path.join(dir, 'basic'), 'utf8').trim();
  const rawHeaders = fs.readFileSync(path.join(dir, 'response_headers'), 'utf8');
  const headers = {};
  for (const line of rawHeaders.split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at > 0) headers[line.slice(0, at).toLowerCase()] = line.slice(at + 1).trim();
  }
  const status = /^HTTP\/\S+\s+(\d+)/.exec(rawHeaders);
  const raw = fs.readFileSync(path.join(dir, 'response_body'));
  let body = raw;
  let chunked = false;
  if (/chunked/i.test(headers['transfer-encoding'] || '') && /^[0-9a-f]+(?:;[^\r\n]*)?\r\n/i.test(body.subarray(0, 80).toString('ascii'))) {
    body = unchunk(body); chunked = true;
  }
  if (body.length) {
    if (body[0] === 0x1f && body[1] === 0x8b) body = zlib.gunzipSync(body);
    else if (headers['content-encoding'] === 'br') body = zlib.brotliDecompressSync(body);
    else if (headers['content-encoding'] === 'deflate') body = zlib.inflateSync(body);
  }
  return {url, headers, statusCode: status ? Number(status[1]) : 0, raw, body, chunked};
}
module.exports = {readRecord, unchunk};
