const ESCAPED_OPEN = '__REQPILOT_ESCAPED_OPEN__';
const ESCAPED_CLOSE = '__REQPILOT_ESCAPED_CLOSE__';

export function resolveVariables(input, variables = {}) {
  if (input === null || input === undefined) {
    return input;
  }

  const text = String(input)
    .replace(/\\\{\{/g, ESCAPED_OPEN)
    .replace(/\\\}\}/g, ESCAPED_CLOSE);

  const replaced = text.replace(/\{\{([^{}]*)\}\}/g, (full, key) => {
    const variableName = key.trim();
    if (!variableName) {
      return full;
    }

    if (Object.prototype.hasOwnProperty.call(variables, variableName)) {
      return String(variables[variableName]);
    }

    return full;
  });

  return replaced
    .replace(new RegExp(ESCAPED_OPEN, 'g'), '{{')
    .replace(new RegExp(ESCAPED_CLOSE, 'g'), '}}');
}

export function resolveObjectVariables(value, variables = {}) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveObjectVariables(item, variables));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, resolveObjectVariables(nested, variables)])
    );
  }

  if (typeof value === 'string') {
    return resolveVariables(value, variables);
  }

  return value;
}
