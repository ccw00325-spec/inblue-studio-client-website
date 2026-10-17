import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import handler from '../api/inquiries.js';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
process.env.ADMIN_PASSWORD ||= 'preview-password';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/inquiries')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) {
      try { req.body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { req.body = null; }
    }
    req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
    return handler(req, res);
  }

  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    createReadStream(target).pipe(res);
  } catch (_) {
    res.writeHead(404).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('IN BLUE preview: http://127.0.0.1:' + port);
  console.log('Admin preview password: preview-password');
});
