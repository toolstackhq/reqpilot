import { describe, expect, test } from 'vitest';
import { formatJavaScript, highlightJavaScript, highlightJson } from '../../src/utils/syntaxHighlight.js';

describe('syntaxHighlight utilities', () => {
  test('highlights javascript tokens', () => {
    const result = highlightJavaScript("const x = rp.env.get('k'); // note");
    expect(result).toContain('class="js-keyword"');
    expect(result).toContain('class="js-builtin"');
    expect(result).toContain('class="js-string"');
    expect(result).toContain('class="js-comment"');
  });

  test('formats compact javascript into readable lines', () => {
    const source = "const a=1;if(a){rp.env.set('x',a);}";
    const formatted = formatJavaScript(source);
    expect(formatted).toContain('\n');
    expect(formatted).toContain("rp.env.set('x',a);");
    expect(formatted).toContain('if(a) {');
  });

  test('highlights json with key/string/bool/null/number classes', () => {
    const result = highlightJson('{"name":"Ava","active":true,"meta":null,"count":12}');
    expect(result).toContain('class="json-key"');
    expect(result).toContain('class="json-string"');
    expect(result).toContain('class="json-bool"');
    expect(result).toContain('class="json-null"');
    expect(result).toContain('class="json-number"');
  });

  test('escapes unsafe html while highlighting javascript', () => {
    const result = highlightJavaScript("const x = '<script>alert(1)</script>';");
    expect(result).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result).not.toContain('<script>alert(1)</script>');
  });

  test('highlights block comments, template strings and literals', () => {
    const source = "/* block */\nconst ok = true;\nconst n = null;\nconst t = `v-${1}`;\nconst count = 42;";
    const result = highlightJavaScript(source);
    expect(result).toContain('class="js-comment"');
    expect(result).toContain('class="js-bool"');
    expect(result).toContain('class="js-null"');
    expect(result).toContain('class="js-string"');
    expect(result).toContain('class="js-number"');
  });

  test('formatJavaScript handles comments, blocks and empty values', () => {
    expect(formatJavaScript('')).toBe('');
    const source = "if(x){/* block */const y='z';}// note";
    const formatted = formatJavaScript(source);
    expect(formatted).toContain("if(x) {");
    expect(formatted).toContain('/* block */');
    expect(formatted).toContain("// note");
  });

  test('formatJavaScript keeps semicolons inside parentheses intact', () => {
    const source = 'for(let i=0;i<2;i++){console.log(i);}';
    const formatted = formatJavaScript(source);
    expect(formatted).toContain('for(let i=0;i<2;i++)');
    expect(formatted).toContain('console.log(i);');
  });
});
