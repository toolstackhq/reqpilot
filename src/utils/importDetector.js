import yaml from 'js-yaml';

function parseInput(content) {
  if (content === null || content === undefined || content === '') {
    return { parsed: null, error: null };
  }

  if (typeof content === 'object') {
    return { parsed: content, error: null };
  }

  const text = String(content).trim();
  if (!text) {
    return { parsed: null, error: null };
  }

  try {
    return { parsed: JSON.parse(text), error: null, format: 'json' };
  } catch {
    try {
      return { parsed: yaml.load(text), error: null, format: 'yaml' };
    } catch (error) {
      return { parsed: null, error: error.message || 'Unable to parse file' };
    }
  }
}

export function detectImportFormat(content) {
  const { parsed, error } = parseInput(content);

  if (error) {
    return { type: 'unknown', error, parsed: null };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { type: 'unknown', parsed };
  }

  const schema = parsed.info?.schema || '';
  if (schema.includes('/collection/v2.0.0/')) {
    return { type: 'postman-v2.0', parsed };
  }

  if (schema.includes('/collection/v2.1.0/')) {
    return { type: 'postman-v2.1', parsed };
  }

  if (parsed._postman_variable_scope === 'environment') {
    return { type: 'postman-environment', parsed };
  }

  if (parsed.swagger === '2.0') {
    return { type: 'swagger-2.0', parsed };
  }

  if (typeof parsed.openapi === 'string' && parsed.openapi.startsWith('3.0')) {
    return { type: 'openapi-3.0', parsed };
  }

  if (typeof parsed.openapi === 'string' && parsed.openapi.startsWith('3.1')) {
    return { type: 'openapi-3.1', parsed };
  }

  return { type: 'unknown', parsed };
}
