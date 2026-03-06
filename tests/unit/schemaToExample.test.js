import { describe, expect, test } from 'vitest';
import { schemaToExample } from '../../src/utils/schemaToExample.js';

describe('schemaToExample', () => {
  test('supports primitive types', () => {
    expect(schemaToExample({ type: 'string' })).toBe('string');
    expect(schemaToExample({ type: 'number' })).toBe(0);
    expect(schemaToExample({ type: 'integer' })).toBe(0);
    expect(schemaToExample({ type: 'boolean' })).toBe(false);
  });

  test('supports arrays and objects', () => {
    expect(schemaToExample({ type: 'array', items: { type: 'string' } })).toEqual(['string']);
    expect(
      schemaToExample({ type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } } })
    ).toEqual({ name: 'string', age: 0 });
  });

  test('supports formats enums nullable and combinators', () => {
    expect(schemaToExample({ type: 'string', enum: ['A', 'B'] })).toBe('A');
    expect(schemaToExample({ type: 'string', format: 'email' })).toBe('user@example.com');
    expect(schemaToExample({ type: ['string', 'null'] })).toBe('string');
    expect(
      schemaToExample({ allOf: [{ type: 'object', properties: { a: { type: 'string' } } }, { type: 'object', properties: { b: { type: 'number' } } }] })
    ).toEqual({ a: 'string', b: 0 });
    expect(schemaToExample({ oneOf: [{ type: 'string' }, { type: 'number' }] })).toBe('string');
  });

  test('handles empty schema', () => {
    expect(schemaToExample({})).toEqual({});
  });
});
