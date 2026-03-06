const DATE_TIME_EXAMPLE = '2024-01-01T00:00:00Z';
const UUID_EXAMPLE = '00000000-0000-0000-0000-000000000000';
const EMAIL_EXAMPLE = 'user@example.com';
const URI_EXAMPLE = 'https://example.com';

function pickType(type) {
  if (Array.isArray(type)) {
    return type.find((entry) => entry !== 'null') || type[0];
  }
  return type;
}

export function schemaToExample(schema, { depth = 0, maxDepth = 10 } = {}) {
  if (!schema || depth > maxDepth) {
    return {};
  }

  if (schema.$circular) {
    return { $circular: schema.$circular };
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.enum?.length) {
    return schema.enum[0];
  }

  if (schema.oneOf?.length) {
    return schemaToExample(schema.oneOf[0], { depth: depth + 1, maxDepth });
  }

  if (schema.allOf?.length) {
    return schema.allOf.reduce((acc, part) => {
      const built = schemaToExample(part, { depth: depth + 1, maxDepth });
      if (built && typeof built === 'object' && !Array.isArray(built)) {
        return { ...acc, ...built };
      }
      return acc;
    }, {});
  }

  const type = pickType(schema.type);

  if (type === 'string') {
    if (schema.format === 'email') return EMAIL_EXAMPLE;
    if (schema.format === 'date-time') return DATE_TIME_EXAMPLE;
    if (schema.format === 'uuid') return UUID_EXAMPLE;
    if (schema.format === 'uri') return URI_EXAMPLE;
    return 'string';
  }

  if (type === 'number' || type === 'integer') {
    return 0;
  }

  if (type === 'boolean') {
    return false;
  }

  if (type === 'array') {
    return [schemaToExample(schema.items || { type: 'string' }, { depth: depth + 1, maxDepth })];
  }

  if (type === 'object' || schema.properties) {
    const properties = schema.properties || {};
    return Object.fromEntries(
      Object.entries(properties).map(([key, prop]) => [
        key,
        schemaToExample(prop, { depth: depth + 1, maxDepth }),
      ])
    );
  }

  return {};
}
