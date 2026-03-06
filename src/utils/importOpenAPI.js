import { schemaToExample } from './schemaToExample.js';

function resolveRef(ref, document, visited = new Set()) {
  if (!ref?.startsWith('#/')) {
    return {};
  }

  if (visited.has(ref)) {
    return { $circular: ref.split('/').at(-1) || 'circular' };
  }

  visited.add(ref);
  const path = ref.slice(2).split('/');
  let current = document;

  for (const segment of path) {
    current = current?.[segment];
    if (!current) return {};
  }

  if (current.$ref) {
    return resolveRef(current.$ref, document, visited);
  }

  if (current.properties) {
    const resolvedProperties = Object.fromEntries(
      Object.entries(current.properties).map(([key, value]) => {
        if (value.$ref) {
          return [key, resolveRef(value.$ref, document, new Set(visited))];
        }
        return [key, value];
      })
    );

    return { ...current, properties: resolvedProperties };
  }

  return current;
}

function buildSwaggerUrl(spec, routePath) {
  const scheme = spec.schemes?.[0] || 'https';
  const host = spec.host || 'localhost';
  const basePath = spec.basePath || '';
  return `${scheme}://${host}${basePath}${routePath}`;
}

function buildOpenApiUrl(spec, routePath) {
  const server = spec.servers?.[0]?.url || 'http://localhost';
  const normalized = server.replace(/\{([^}]+)\}/g, '{{$1}}');
  return `${normalized}${routePath}`;
}

function normalizePath(path) {
  return path.replace(/\{([^}]+)\}/g, '{{$1}}');
}

function mapSecurity(security, spec) {
  if (!security?.length) {
    return { type: 'none' };
  }

  const securityName = Object.keys(security[0])[0];
  const scheme = spec.components?.securitySchemes?.[securityName] || spec.securityDefinitions?.[securityName];

  if (!scheme) {
    return { type: 'none' };
  }

  if (scheme.type === 'apiKey') {
    return {
      type: 'apikey',
      key: scheme.name || 'X-API-Key',
      value: '',
      addTo: scheme.in === 'query' ? 'query' : 'header',
    };
  }

  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return { type: 'bearer', token: '' };
  }

  if ((scheme.type === 'http' && scheme.scheme === 'basic') || scheme.type === 'basic') {
    return { type: 'basic', username: '', password: '' };
  }

  if (scheme.type === 'oauth2') {
    return { type: 'bearer', token: '', note: 'Imported OAuth2 as bearer token placeholder' };
  }

  return { type: 'none' };
}

function parseParameters(parameters = []) {
  const params = [];
  const headers = [];

  for (const parameter of parameters) {
    const row = {
      id: `${parameter.name}-${Math.random().toString(36).slice(2)}`,
      key: parameter.name,
      value: parameter.example !== undefined ? String(parameter.example) : '',
      enabled: true,
    };

    if (parameter.in === 'query' || parameter.in === 'path') {
      params.push(row);
    }

    if (parameter.in === 'header') {
      headers.push(row);
    }
  }

  return { params, headers };
}

function parseBody(operation, spec) {
  if (operation.requestBody?.content?.['application/json']) {
    const jsonContent = operation.requestBody.content['application/json'];
    if (jsonContent.example !== undefined) {
      return { type: 'json', raw: JSON.stringify(jsonContent.example, null, 2), form: [] };
    }

    const schema = jsonContent.schema?.$ref
      ? resolveRef(jsonContent.schema.$ref, spec)
      : jsonContent.schema || { type: 'object' };

    return {
      type: 'json',
      raw: JSON.stringify(schemaToExample(schema), null, 2),
      form: [],
    };
  }

  const swaggerBody = (operation.parameters || []).find((entry) => entry.in === 'body');
  if (swaggerBody) {
    const schema = swaggerBody.schema?.$ref ? resolveRef(swaggerBody.schema.$ref, spec) : swaggerBody.schema || {};
    return {
      type: 'json',
      raw: JSON.stringify(schemaToExample(schema), null, 2),
      form: [],
    };
  }

  return { type: 'none', raw: '', form: [] };
}

export function importOpenApiDocument(spec) {
  const collection = {
    id: `openapi-${Date.now()}`,
    name: spec.info?.title || 'Imported API',
    requests: [],
  };

  const warnings = [];
  const paths = spec.paths || {};

  for (const [routePath, operations] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(operations || {})) {
      const upperMethod = method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(upperMethod)) {
        continue;
      }

      const allParameters = [...(operations.parameters || []), ...(operation.parameters || [])];
      const { params, headers } = parseParameters(allParameters);

      const consumes = spec.consumes?.[0];
      const produces = spec.produces?.[0];
      if (consumes) {
        headers.push({ id: `consume-${Date.now()}`, key: 'Content-Type', value: consumes, enabled: true });
      }
      if (produces) {
        headers.push({ id: `produce-${Date.now()}`, key: 'Accept', value: produces, enabled: true });
      }

      const url = spec.swagger
        ? buildSwaggerUrl(spec, normalizePath(routePath))
        : buildOpenApiUrl(spec, normalizePath(routePath));

      collection.requests.push({
        id: `${upperMethod}-${routePath}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name: operation.operationId || operation.summary || `${upperMethod} ${routePath}`,
        folders: operation.tags?.slice(0, 1) || [],
        method: upperMethod,
        url,
        params,
        headers,
        body: parseBody(operation, spec),
        auth: mapSecurity(operation.security || spec.security, spec),
        scripts: { preRequest: '', tests: '', postRequest: '' },
      });
    }
  }

  if (!collection.requests.length) {
    warnings.push('No operations found in specification');
  }

  if (spec.webhooks) {
    for (const [hookPath, operations] of Object.entries(spec.webhooks)) {
      for (const [method, operation] of Object.entries(operations || {})) {
        collection.requests.push({
          id: `webhook-${Date.now()}`,
          name: operation.operationId || `${method.toUpperCase()} webhook ${hookPath}`,
          folders: ['Webhooks'],
          method: method.toUpperCase(),
          url: normalizePath(hookPath),
          params: [],
          headers: [],
          body: parseBody(operation, spec),
          auth: { type: 'none' },
          scripts: { preRequest: '', tests: '', postRequest: '' },
        });
      }
    }
  }

  return { collection, warnings };
}
