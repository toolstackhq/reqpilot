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

const JS_KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'typeof',
  'instanceof',
  'await',
  'async',
  'class',
  'extends',
  'import',
  'from',
  'export',
  'default',
  'in',
  'of',
]);

const JS_BUILTINS = new Set(['rp', 'console', 'Math', 'Date', 'JSON', 'globalThis']);

const JS_TOKEN_REGEX =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|await|async|class|extends|import|from|export|default|in|of)\b|\b(?:true|false)\b|\b(?:null|undefined)\b|\b(?:rp|console|Math|Date|JSON|globalThis)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

export function highlightJavaScript(text = '') {
  const source = String(text || '');
  let cursor = 0;
  let output = '';

  source.replace(JS_TOKEN_REGEX, (match, offset) => {
    output += escapeHtml(source.slice(cursor, offset));
    cursor = offset + match.length;

    let cls = 'js-number';
    if (match.startsWith('//') || match.startsWith('/*')) {
      cls = 'js-comment';
    } else if (match.startsWith('"') || match.startsWith("'") || match.startsWith('`')) {
      cls = 'js-string';
    } else if (match === 'true' || match === 'false') {
      cls = 'js-bool';
    } else if (match === 'null' || match === 'undefined') {
      cls = 'js-null';
    } else if (JS_KEYWORDS.has(match)) {
      cls = 'js-keyword';
    } else if (JS_BUILTINS.has(match)) {
      cls = 'js-builtin';
    }

    output += `<span class="${cls}">${escapeHtml(match)}</span>`;
    return match;
  });

  output += escapeHtml(source.slice(cursor));
  return output;
}

function nextNonWhitespaceChar(source, fromIndex) {
  for (let index = fromIndex; index < source.length; index += 1) {
    const char = source[index];
    if (!/\s/.test(char)) return char;
  }
  return '';
}

export function formatJavaScript(text = '') {
  const source = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!source) return '';

  let output = '';
  let indent = 0;
  let parenDepth = 0;
  const indentUnit = '  ';
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  function appendIndent() {
    output += indentUnit.repeat(Math.max(0, indent));
  }

  function appendSpaceIfNeeded() {
    if (!output || output.endsWith('\n') || output.endsWith(' ')) return;
    output += ' ';
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      output += char;
      if (char === '\n') {
        inLineComment = false;
        appendIndent();
      }
      continue;
    }

    if (inBlockComment) {
      output += char;
      if (char === '*' && next === '/') {
        output += '/';
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      output += char;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (inSingle && char === "'") inSingle = false;
      if (inDouble && char === '"') inDouble = false;
      if (inTemplate && char === '`') inTemplate = false;
      continue;
    }

    if (char === '/' && next === '/') {
      appendSpaceIfNeeded();
      output += '//';
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      appendSpaceIfNeeded();
      output += '/*';
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      output += char;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      output += char;
      continue;
    }

    if (char === '`') {
      inTemplate = true;
      output += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      output += char;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      output += char;
      continue;
    }

    if (char === '{') {
      output = output.replace(/[ \t]+$/g, '');
      appendSpaceIfNeeded();
      output += '{\n';
      indent += 1;
      appendIndent();
      continue;
    }

    if (char === '}') {
      indent = Math.max(0, indent - 1);
      output = output.replace(/[ \t]+$/g, '');
      if (!output.endsWith('\n')) output += '\n';
      appendIndent();
      output += '}';

      const nextToken = nextNonWhitespaceChar(source, index + 1);
      if (nextToken && ![';', ',', ')', '}'].includes(nextToken)) {
        output += '\n';
        appendIndent();
      }
      continue;
    }

    if (char === ';' && parenDepth === 0) {
      output += ';\n';
      appendIndent();
      continue;
    }

    if (char === '\n' || char === '\r' || char === '\t') {
      appendSpaceIfNeeded();
      continue;
    }

    if (char === ' ') {
      appendSpaceIfNeeded();
      continue;
    }

    output += char;
  }

  return output
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
