function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlightJson(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:)/g, '<span class="json-key">$1</span>')
    .replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")/g, '<span class="json-string">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="json-bool">$1</span>')
    .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
    .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="json-number">$1</span>');
}
