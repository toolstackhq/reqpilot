# Request Testing

## Script Runtime

ReqPilot supports post-request JavaScript tests using the `rp` runtime object.

<DocTabs
  :tabs="[
    { id: 'basic', label: 'Basic Assertions' },
    { id: 'array', label: 'Array Checks' },
    { id: 'snippets', label: 'Snippet Ideas' }
  ]"
>
  <template v-slot:basic>
    <pre><code>rp.test('status is 200', () =&gt; {
  rp.expect(rp.response.status).toBe(200);
});</code></pre>
    <pre><code>rp.test('status is 2xx', () =&gt; {
  rp.expect(rp.response.status).toBeGreaterThan(199);
  rp.expect(rp.response.status).toBeLessThan(300);
});</code></pre>

  </template>

  <template v-slot:array>
    <pre><code>rp.test('every item has email', () =&gt; {
  const body = rp.response.json();
  rp.expect(Array.isArray(body)).toBe(true);
  rp.expect(body.every((item) =&gt; typeof item.email === 'string' &amp;&amp; item.email.length &gt; 0)).toBe(true);
});</code></pre>
    <pre><code>rp.test('at least one matching email', () =&gt; {
  const body = rp.response.json();
  rp.expect(body.some((item) =&gt; item.email === 'ava@example.com')).toBe(true);
});</code></pre>

  </template>

  <template v-slot:snippets>
    <ul>
      <li>Status code checks (200, 2xx, etc.).</li>
      <li>Response time checks.</li>
      <li>Body property checks.</li>
      <li>Auth flow checks across chained requests.</li>
    </ul>
    <p>Results are rendered in the <strong>Test Results</strong> tab for each response.</p>

  </template>
</DocTabs>
