import { describe, expect, test } from 'vitest';
import { detectImportFormat } from '../../src/utils/importDetector.js';

describe('importDetector', () => {
  test('detects postman, openapi, swagger and environment', () => {
    expect(
      detectImportFormat('{"info":{"schema":"https://schema.getpostman.com/json/collection/v2.0.0/collection.json"}}').type
    ).toBe('postman-v2.0');

    expect(
      detectImportFormat('{"_postman_variable_scope":"environment","values":[]}').type
    ).toBe('postman-environment');

    expect(detectImportFormat('{"swagger":"2.0"}').type).toBe('swagger-2.0');
    expect(detectImportFormat('{"openapi":"3.0.3"}').type).toBe('openapi-3.0');
    expect(detectImportFormat('{"openapi":"3.1.0"}').type).toBe('openapi-3.1');
  });

  test('detects yaml and unknown/malformed', () => {
    expect(detectImportFormat('openapi: 3.0.1').type).toBe('openapi-3.0');
    expect(detectImportFormat('not-valid').type).toBe('unknown');
    expect(detectImportFormat('')).toEqual(expect.objectContaining({ type: 'unknown' }));
    expect(detectImportFormat(null)).toEqual(expect.objectContaining({ type: 'unknown' }));
  });
});
