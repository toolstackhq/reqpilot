import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { createProxyApp } from '../../src/server/proxyApp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const proxyPort = 5558;
const securePort = 4448;
const proxyUrl = `http://localhost:${proxyPort}/proxy`;

const certPath = path.resolve(__dirname, '../fixtures/ssl/localhost-cert.pem');
const keyPath = path.resolve(__dirname, '../fixtures/ssl/localhost-key.pem');
const certPem = fs.readFileSync(certPath, 'utf8');
const keyPem = fs.readFileSync(keyPath, 'utf8');

let secureServer;
let proxy;

async function proxyRequest(payload) {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

beforeAll(async () => {
  secureServer = https.createServer({ key: keyPem, cert: certPem }, (req, res) => {
    if (req.url === '/secure') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: '/secure' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });

  await new Promise((resolve) => secureServer.listen(securePort, resolve));
  proxy = createProxyApp().listen(proxyPort);
});

afterAll(async () => {
  if (secureServer) {
    await new Promise((resolve) => secureServer.close(resolve));
  }

  if (proxy) {
    await new Promise((resolve) => proxy.close(resolve));
  }
});

describe('proxy ssl integration', () => {
  test('fails with self-signed cert when ssl verification is enabled', async () => {
    const result = await proxyRequest({
      method: 'GET',
      url: `https://localhost:${securePort}/secure`,
      headers: {},
      body: '',
      security: { verifySsl: true },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  test('succeeds when ssl verification is disabled for the request', async () => {
    const result = await proxyRequest({
      method: 'GET',
      url: `https://localhost:${securePort}/secure`,
      headers: {},
      body: '',
      security: { verifySsl: false },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true, path: '/secure' });
  });

  test('succeeds with ssl verification enabled when CA certificate is provided', async () => {
    const result = await proxyRequest({
      method: 'GET',
      url: `https://localhost:${securePort}/secure`,
      headers: {},
      body: '',
      security: {
        verifySsl: true,
        ca: certPem,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true, path: '/secure' });
  });
});

