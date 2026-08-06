import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT ?? 8080);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = createServer((request, response) => {
  const pathname = request.url?.split('?')[0] ?? '/';
  const route = pathname === '/camera' ? '/examples/camera/index.html'
    : pathname === '/barcode' ? '/examples/barcode/index.html' : pathname;
  const relative = normalize(route).replace(/^([/\\])+/, '');
  const file = join(root, relative);
  try {
    if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Examples available at http://localhost:${port}/camera and /barcode`);
});

function shutdown(signal) {
  console.log(`${signal} received, stopping server`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
