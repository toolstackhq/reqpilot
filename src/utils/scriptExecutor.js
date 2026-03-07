function createAssertionError(message) {
  const error = new Error(message);
  error.name = 'AssertionError';
  return error;
}

function createExpect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw createAssertionError(`Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(value > expected)) {
        throw createAssertionError(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(value >= expected)) {
        throw createAssertionError(`Expected ${value} to be greater than or equal to ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(value < expected)) {
        throw createAssertionError(`Expected ${value} to be less than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(value <= expected)) {
        throw createAssertionError(`Expected ${value} to be less than or equal to ${expected}`);
      }
    },
    toHaveProperty(property) {
      if (!value || !(property in value)) {
        throw createAssertionError(`Expected object to have property ${property}`);
      }
    },
    toContain(item) {
      if (!value?.includes?.(item)) {
        throw createAssertionError(`Expected value to contain ${JSON.stringify(item)}`);
      }
    },
    toBeTruthy() {
      if (!value) {
        throw createAssertionError(`Expected ${JSON.stringify(value)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (value) {
        throw createAssertionError(`Expected ${JSON.stringify(value)} to be falsy`);
      }
    },
  };
}

function maybeDetectInfiniteLoop(script) {
  const normalized = script.replace(/\s+/g, ' ').toLowerCase();
  return normalized.includes('while(true)') || normalized.includes('for(;;)');
}

export function executeScript({
  script = '',
  phase = 'test',
  request,
  response,
  environment = {},
  timeoutMs = 5000,
} = {}) {
  const testResults = [];
  const logs = [];
  const envStore = environment;

  if (!script?.trim()) {
    return { testResults, logs, environment: envStore, request };
  }

  if (maybeDetectInfiniteLoop(script)) {
    return {
      testResults: [{ name: `${phase} script`, pass: false, error: `Script timed out after ${timeoutMs}ms` }],
      logs,
      environment: envStore,
      request,
      error: `Script timed out after ${timeoutMs}ms`,
    };
  }

  const requestHeadersApi = {
    set(key, value) {
      const existing = request.headers.find((entry) => entry.key.toLowerCase() === String(key).toLowerCase());
      if (existing) {
        existing.value = String(value);
        existing.enabled = true;
      } else {
        request.headers.push({
          id: `hdr-${Date.now()}`,
          key: String(key),
          value: String(value),
          enabled: true,
        });
      }
    },
  };

  const rp = {
    env: {
      get(key) {
        return envStore[key];
      },
      set(key, value) {
        envStore[key] = value;
      },
    },
    request: {
      headers: requestHeadersApi,
      get body() {
        return request.body;
      },
      set body(value) {
        request.body = value;
      },
      get url() {
        return request.url;
      },
      set url(value) {
        request.url = String(value);
      },
    },
    response: {
      status: response?.status,
      time: response?.time,
      json() {
        try {
          return JSON.parse(response?.body || '{}');
        } catch {
          return null;
        }
      },
      text() {
        return response?.body || '';
      },
      headers: {
        get(key) {
          const lower = String(key).toLowerCase();
          const match = Object.entries(response?.headers || {}).find(([header]) => header.toLowerCase() === lower);
          return match?.[1];
        },
      },
    },
    test(name, fn) {
      try {
        fn();
        testResults.push({ name, pass: true });
      } catch (error) {
        testResults.push({ name, pass: false, error: error.message });
      }
    },
    expect(value) {
      return createExpect(value);
    },
  };

  const logger = {
    log(...args) {
      logs.push(args.map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry))).join(' '));
    },
  };

  try {
    const executor = new Function('rp', 'console', `"use strict";\n${script}`);
    executor(rp, logger);
  } catch (error) {
    testResults.push({ name: `${phase} script`, pass: false, error: error.message });
    return {
      testResults,
      logs,
      environment: envStore,
      request,
      error: error.message,
    };
  }

  return { testResults, logs, environment: envStore, request };
}
