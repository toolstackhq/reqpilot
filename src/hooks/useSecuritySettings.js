import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'reqpilot_security_settings';

const DEFAULT_SETTINGS = {
  verifySslByDefault: true,
  useSystemProxy: true,
  hostRules: [],
};

function normalizePattern(pattern = '') {
  return pattern.trim().toLowerCase();
}

function makeRule(pattern = '', verifySsl = true) {
  return {
    id: `ssl-rule-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    pattern: normalizePattern(pattern),
    verifySsl: verifySsl !== false,
    enabled: true,
  };
}

function loadSettings() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      verifySslByDefault: parsed.verifySslByDefault !== false,
      useSystemProxy: parsed.useSystemProxy !== false,
      hostRules: Array.isArray(parsed.hostRules)
        ? parsed.hostRules.map((rule) => ({
            id: rule.id || `ssl-rule-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            pattern: normalizePattern(rule.pattern || ''),
            verifySsl: rule.verifySsl !== false,
            enabled: rule.enabled !== false,
          }))
        : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getHostFromUrl(value = '') {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function matchesHost(host, pattern) {
  if (!host || !pattern) return false;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }
  return host === pattern;
}

function includeTlsMaterial(base, request = {}) {
  const security = request.security || {};
  const next = { ...base };

  if (typeof security.ca === 'string' && security.ca.trim()) {
    next.ca = security.ca.trim();
  }

  if (typeof security.cert === 'string' && security.cert.trim()) {
    next.cert = security.cert.trim();
  }

  if (typeof security.key === 'string' && security.key.trim()) {
    next.key = security.key.trim();
  }

  if (typeof security.passphrase === 'string' && security.passphrase) {
    next.passphrase = security.passphrase;
  }

  return next;
}

export function useSecuritySettings() {
  const [settings, setSettings] = useState(() => (typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings()));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const sortedHostRules = useMemo(
    () =>
      [...(settings.hostRules || [])]
        .filter((rule) => rule.enabled !== false && rule.pattern)
        .sort((a, b) => b.pattern.length - a.pattern.length),
    [settings.hostRules]
  );

  function setVerifySslByDefault(value) {
    setSettings((prev) => ({ ...prev, verifySslByDefault: value !== false }));
  }

  function setUseSystemProxy(value) {
    setSettings((prev) => ({ ...prev, useSystemProxy: value !== false }));
  }

  function addHostRule(pattern, verifySsl = true) {
    const normalized = normalizePattern(pattern);
    if (!normalized) return null;

    const rule = makeRule(normalized, verifySsl);
    setSettings((prev) => ({
      ...prev,
      hostRules: [rule, ...(prev.hostRules || [])],
    }));
    return rule;
  }

  function updateHostRule(ruleId, patch) {
    setSettings((prev) => ({
      ...prev,
      hostRules: (prev.hostRules || []).map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...patch,
              pattern: patch.pattern !== undefined ? normalizePattern(patch.pattern) : rule.pattern,
            }
          : rule
      ),
    }));
  }

  function removeHostRule(ruleId) {
    setSettings((prev) => ({
      ...prev,
      hostRules: (prev.hostRules || []).filter((rule) => rule.id !== ruleId),
    }));
  }

  function resolveRequestSecurity(request = {}) {
    const requestMode = request?.security?.sslVerification || 'inherit';
    const requestProxyMode = request?.security?.proxyUsage || 'inherit';
    const defaultUseProxy = settings.useSystemProxy !== false;

    const useProxy =
      requestProxyMode === 'enabled'
        ? true
        : requestProxyMode === 'disabled'
          ? false
          : defaultUseProxy;

    if (requestMode === 'enabled') {
      return includeTlsMaterial({ verifySsl: true, useProxy, source: 'request' }, request);
    }

    if (requestMode === 'disabled') {
      return includeTlsMaterial({ verifySsl: false, useProxy, source: 'request' }, request);
    }

    const host = getHostFromUrl(request?.url || '');
    if (host) {
      const matched = sortedHostRules.find((rule) => matchesHost(host, rule.pattern));
      if (matched) {
        return includeTlsMaterial(
          {
            verifySsl: matched.verifySsl !== false,
            useProxy,
            source: 'host',
            host,
            pattern: matched.pattern,
          },
          request
        );
      }
    }

    return includeTlsMaterial(
      {
        verifySsl: settings.verifySslByDefault !== false,
        useProxy,
        source: 'global',
        host,
      },
      request
    );
  }

  return {
    settings,
    setVerifySslByDefault,
    setUseSystemProxy,
    addHostRule,
    updateHostRule,
    removeHostRule,
    resolveRequestSecurity,
  };
}
