// Sirve el Worker real en Node (como `wrangler dev`) apuntando a los emuladores.
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const workerPath = process.argv[2];
const env = { FIREBASE_EMULATOR: '1', FIREBASE_DB_URL: 'http://127.0.0.1:9000', FIREBASE_DB_NS: 'demo-geometrics-default-rtdb', FIREBASE_PROJECT_ID: 'demo-geometrics' };
const worker = (await import(pathToFileURL(workerPath).href)).default;

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request('http://127.0.0.1:8787' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : body });
  const r = await worker.fetch(request, env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, '127.0.0.1', () => console.log('worker listo en http://127.0.0.1:8787'));
