import { describe, expect, test } from 'vitest';
import { highlightJavaScript, formatJavaScript } from '../../src/utils/syntaxHighlight.js';

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
});
