import express from 'express';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

export async function executeProxyRequest({ method, url, headers, body }) {
  const start = performance.now();
  let parsedUrl;
  try {
    parsedUrl = new URL(url).toString();
  } catch {
    return {
      ok: false,
      error: 'Invalid URL',
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      body: '',
      time: 0,
      size: 0,
    };
  }

  try {
    const reqHeaders = sanitizeHeaders(headers);
    const fetchOpts = {
      method: method || 'GET',
      headers: reqHeaders,
    };

    if (!['GET', 'HEAD'].includes((method || 'GET').toUpperCase()) && body !== undefined && body !== null && body !== '') {
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(parsedUrl, fetchOpts);
    const text = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const time = Math.round(performance.now() - start);

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: text,
      time,
      size: Buffer.byteLength(text || '', 'utf8'),
    };
  } catch (error) {
    const time = Math.round(performance.now() - start);
    return {
      ok: false,
      error: error?.message || 'Request failed',
      status: 502,
      statusText: 'Bad Gateway',
      headers: {},
      body: '',
      time,
      size: 0,
    };
  }
}

export function createProxyApp({ staticDir } = {}) {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.post('/proxy', async (req, res) => {
    const result = await executeProxyRequest(req.body || {});
    const code = result.ok ? 200 : result.status || 500;
    res.status(code).json(result);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/proxy') || req.path.startsWith('/health')) {
        return next();
      }
      return res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
}
