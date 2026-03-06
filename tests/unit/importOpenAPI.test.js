import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, test } from 'vitest';
import { importOpenApiDocument } from '../../src/utils/importOpenAPI.js';

function fixtureJson(name) {
  const filePath = path.resolve('tests/fixtures', name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fixtureYaml(name) {
  const filePath = path.resolve('tests/fixtures', name);
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

describe('importOpenAPI', () => {
  test('parses swagger and openapi docs', () => {
    const swagger = importOpenApiDocument(fixtureJson('swagger-2.0.json'));
    const openapi = importOpenApiDocument(fixtureJson('openapi-3.0.json'));

    expect(swagger.collection.requests.length).toBeGreaterThan(0);
    expect(openapi.collection.requests.length).toBeGreaterThan(0);
  });

  test('parses yaml variants', () => {
    const swaggerYaml = importOpenApiDocument(fixtureYaml('swagger-2.0.yaml'));
    const openapiYaml = importOpenApiDocument(fixtureYaml('openapi-3.0.yaml'));
    expect(swaggerYaml.collection.requests.length).toBeGreaterThan(0);
    expect(openapiYaml.collection.requests.length).toBeGreaterThan(0);
  });

  test('maps auth schemes and request body', () => {
    const openapi = importOpenApiDocument(fixtureJson('openapi-3.0.json'));
    const secured = openapi.collection.requests.find((request) => request.auth.type !== 'none');
    const withBody = openapi.collection.requests.find((request) => request.body.type === 'json');
    expect(secured).toBeTruthy();
    expect(withBody.body.raw).toContain('jane');
  });

  test('handles 3.1 webhooks and circular refs', () => {
    const openapi31 = importOpenApiDocument(fixtureJson('openapi-3.1.json'));
    const circular = importOpenApiDocument(fixtureJson('openapi-circular-ref.json'));

    expect(openapi31.collection.requests.some((request) => request.folders.includes('Webhooks'))).toBe(true);
    expect(circular.collection.requests[0].body.raw).toContain('$circular');
  });
});
