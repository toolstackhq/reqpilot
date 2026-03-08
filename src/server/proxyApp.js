import express from 'express';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

export async function executeProxyRequest({ method, url, headers, body, security }) {
  const start = performance.now();
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
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

  return new Promise((resolve) => {
    const reqHeaders = sanitizeHeaders(headers);
    const normalizedMethod = (method || 'GET').toUpperCase();
    const hasBody = !['GET', 'HEAD'].includes(normalizedMethod) && body !== undefined && body !== null && body !== '';
    const requestBody = hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    const verifySsl = security?.verifySsl !== false;
    const ca = typeof security?.ca === 'string' && security.ca.trim() ? security.ca : undefined;
    const cert = typeof security?.cert === 'string' && security.cert.trim() ? security.cert : undefined;
    const key = typeof security?.key === 'string' && security.key.trim() ? security.key : undefined;
    const passphrase = typeof security?.passphrase === 'string' ? security.passphrase : undefined;

    const requestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      method: normalizedMethod,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      headers: reqHeaders,
      rejectUnauthorized: verifySsl,
      ca,
      cert,
      key,
      passphrase,
    };

    if (hasBody && !requestOptions.headers['Content-Length'] && !requestOptions.headers['content-length']) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody, 'utf8');
    }

    const req = transport.request(requestOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        const responseHeaders = Object.fromEntries(
          Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value ?? '')])
        );
        const time = Math.round(performance.now() - start);

        resolve({
          ok: true,
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: responseHeaders,
          body: text,
          time,
          size: buffer.length,
        });
      });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (error) => {
      const time = Math.round(performance.now() - start);
      resolve({
        ok: false,
        error: error?.message || 'Request failed',
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        body: '',
        time,
        size: 0,
      });
    });

    if (hasBody) {
      req.write(requestBody);
    }

    req.end();
  });
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
