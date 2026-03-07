function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlightJson(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, _stringLiteral, keySuffix) => {
      let cls = 'json-number';
      if (match.startsWith('"')) {
        cls = keySuffix ? 'json-key' : 'json-string';
      } else if (match === 'true' || match === 'false') {
        cls = 'json-bool';
      } else if (match === 'null') {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
