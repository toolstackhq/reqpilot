import express from 'express';
import { createServer } from 'node:http';

function nowISO() {
  return new Date().toISOString();
}

function parseMultipartBody(raw) {
  if (!raw || typeof raw !== 'string') return {};
  const parts = raw.split('\r\n').filter(Boolean);
  const payload = {};

  let currentKey = null;
  for (const part of parts) {
    const keyMatch = part.match(/name="([^"]+)"/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      continue;
    }

    if (currentKey && !part.startsWith('--') && !part.startsWith('Content-Disposition')) {
      payload[currentKey] = part;
      currentKey = null;
    }
  }

  return payload;
}

export function createMockServer() {
  const app = express();
  const users = [
    { id: 1, name: 'Ava', email: 'ava@example.com' },
    { id: 2, name: 'Noah', email: 'noah@example.com' },
    { id: 3, name: 'Kai', email: 'kai@example.com' },
  ];

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    const end = _res.end;
    _res.end = function (...args) {
      console.log(`[MOCK] ${req.method} ${req.originalUrl} → ${_res.statusCode}`);
      return end.call(this, ...args);
    };
    next();
  });

  app.get('/api/users', (_req, res) => {
    res.json(users);
  });

  app.get('/api/users/:id', (req, res) => {
    const id = Number(req.params.id);
    if (id > 100) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json({ id, name: `User ${id}` });
  });

  app.post('/api/users', (req, res) => {
    res.status(201).json({ ...req.body, id: Math.floor(Math.random() * 1000) + 10, createdAt: nowISO() });
  });

  app.put('/api/users/:id', (req, res) => {
    res.json({ id: Number(req.params.id), ...req.body });
  });

  app.patch('/api/users/:id', (req, res) => {
    res.json({ id: Number(req.params.id), ...req.body, partial: true });
  });

  app.delete('/api/users/:id', (_req, res) => {
    res.status(204).end();
  });

  app.head('/api/users', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end();
  });

  app.options('/api/users', (_req, res) => {
    res.setHeader('Allow', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
    res.status(204).end();
  });

  app.get('/api/status/:code', (req, res) => {
    const code = Number(req.params.code);
    res.status(code).json({ status: code });
  });

  app.get('/api/echo/headers', (req, res) => {
    res.json(req.headers);
  });

  app.get('/api/auth/bearer', (req, res) => {
    const auth = req.headers.authorization;
    if (auth === 'Bearer test-token-123') {
      return res.json({ user: 'admin' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  });

  app.get('/api/auth/basic', (req, res) => {
    if (req.headers.authorization === 'Basic YWRtaW46cGFzc3dvcmQ=') {
      return res.json({ user: 'admin' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  });

  app.get('/api/auth/apikey', (req, res) => {
    if (req.headers['x-api-key'] === 'key-abc-123') {
      return res.json({ user: 'apikey' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  });

  app.post('/api/echo/json', (req, res) => {
    res.json({
      received: true,
      contentType: req.headers['content-type'],
      parsedBody: req.body,
    });
  });

  app.post('/api/echo/form', (req, res) => {
    res.json({
      received: true,
      parsedBody: req.body,
    });
  });

  app.post('/api/echo/multipart', express.text({ type: '*/*' }), (req, res) => {
    res.json({
      received: true,
      fields: parseMultipartBody(req.body),
    });
  });

  app.post('/api/echo/raw', express.text({ type: '*/*' }), (req, res) => {
    res.type('text/plain').send(req.body || '');
  });

  app.get('/api/echo/params', (req, res) => {
    res.json({ params: req.query });
  });

  app.get('/api/response/json', (_req, res) => {
    res.json({ message: 'ok', features: ['json', 'headers'] });
  });

  app.get('/api/response/html', (_req, res) => {
    res.type('text/html').send('<html><body><h1>ReqPilot</h1><p>HTML response</p></body></html>');
  });

  app.get('/api/response/xml', (_req, res) => {
    res.type('application/xml').send('<root><message>xml</message></root>');
  });

  app.get('/api/response/text', (_req, res) => {
    res.type('text/plain').send('plain-text-response');
  });

  app.get('/api/response/large', (_req, res) => {
    const payload = {
      data: 'x'.repeat(2 * 1024 * 1024),
    };
    res.json(payload);
  });

  app.get('/api/response/empty', (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/slow/:ms', async (req, res) => {
    const ms = Number(req.params.ms);
    await new Promise((resolve) => setTimeout(resolve, ms));
    res.json({ waited: ms });
  });

  app.get('/api/cookies/set', (_req, res) => {
    res.setHeader('Set-Cookie', ['session=abc123; Path=/', 'theme=dark; Path=/']);
    res.json({ ok: true });
  });

  app.get('/api/cookies/read', (req, res) => {
    const cookie = req.headers.cookie || '';
    const parsed = Object.fromEntries(
      cookie
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.split('='))
    );

    res.json({ cookies: parsed });
  });

  app.get('/api/error/malformed-json', (_req, res) => {
    res.type('application/json').send('{ invalid json');
  });

  app.get('/api/error/connection-reset', (_req, res) => {
    res.socket.destroy();
  });

  app.get('/api/error/timeout', () => {
    // intentionally never resolves
  });

  app.post('/api/chain/login', (_req, res) => {
    res.json({ token: 'jwt-token-xyz-123' });
  });

  app.get('/api/chain/protected', (req, res) => {
    if (req.headers.authorization === 'Bearer jwt-token-xyz-123') {
      return res.json({ data: 'secret' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  });

  app.get('/api/headers/custom', (_req, res) => {
    res.setHeader('X-Request-Id', 'req-001');
    res.setHeader('X-RateLimit-Limit', '1000');
    res.setHeader('X-RateLimit-Remaining', '999');
    res.json({ ok: true });
  });

  let server;
  let baseUrl = 'http://localhost:4444';

  return {
    app,
    start(port = 4444) {
      return new Promise((resolve) => {
        baseUrl = `http://localhost:${port}`;
        server = createServer(app);
        server.listen(port, () => resolve(baseUrl));
      });
    },
    stop() {
      return new Promise((resolve) => {
        if (!server) {
          resolve();
          return;
        }

        server.close(() => resolve());
      });
    },
    get baseUrl() {
      return baseUrl;
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mock = createMockServer();
  mock.start(4444);

  const shutdown = async () => {
    await mock.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
