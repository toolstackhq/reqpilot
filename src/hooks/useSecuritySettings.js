import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'reqpilot_security_settings';

const DEFAULT_SETTINGS = {
  verifySslByDefault: true,
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

    if (requestMode === 'enabled') {
      return { verifySsl: true, source: 'request' };
    }

    if (requestMode === 'disabled') {
      return { verifySsl: false, source: 'request' };
    }

    const host = getHostFromUrl(request?.url || '');
    if (host) {
      const matched = sortedHostRules.find((rule) => matchesHost(host, rule.pattern));
      if (matched) {
        return { verifySsl: matched.verifySsl !== false, source: 'host', host, pattern: matched.pattern };
      }
    }

    return { verifySsl: settings.verifySslByDefault !== false, source: 'global', host };
  }

  return {
    settings,
    setVerifySslByDefault,
    addHostRule,
    updateHostRule,
    removeHostRule,
    resolveRequestSecurity,
  };
}

