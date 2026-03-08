# Environments and Variables

Use environments to avoid hardcoding hostnames, tokens, and IDs in requests.

## Variable Syntax

Use double-curly syntax:

```text
{{variable_name}}
```

Example:

```text
http://{{host}}:4444/api/users
```

## Create and Use an Environment

1. Open the Environments panel.
2. Create a new environment (for example: `local`, `staging`, `prod`).
3. Add key-value pairs like:
   - `host = localhost`
   - `token = abc123`
4. Select the active environment from the main UI.
5. Send requests with variables.

Resolved variables are shown in green and unresolved variables in red.

## Where Variables Work

<DocTabs
  :tabs="[
    { id: 'url', label: 'URL' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Authorization' }
  ]"
>
  <template v-slot:url>
    <h3>URL Variables</h3>
    <pre><code>http://&#123;&#123;host&#125;&#125;:4444/api/users/&#123;&#123;user_id&#125;&#125;</code></pre>
    <p>Use this for host switching and path parameters.</p>
  </template>

  <template v-slot:headers>
    <h3>Header Variables</h3>
    <pre><code>Authorization: Bearer &#123;&#123;token&#125;&#125;
X-Tenant: &#123;&#123;tenant_id&#125;&#125;</code></pre>
    <p>Useful for auth and multi-tenant headers.</p>
  </template>

  <template v-slot:body>
    <h3>Body Variables</h3>
    <pre><code>{
  "name": "&#123;&#123;username&#125;&#125;",
  "email": "&#123;&#123;email&#125;&#125;",
  "tenant": "&#123;&#123;tenant_id&#125;&#125;"
}</code></pre>
    <p>Use this for reusable payload templates across environments.</p>
  </template>

  <template v-slot:auth>
    <h3>Authorization Variables</h3>
    <pre><code>Bearer Token: &#123;&#123;token&#125;&#125;</code></pre>
    <p>Works with authorization settings so tokens can rotate by environment.</p>
  </template>
</DocTabs>

## Troubleshooting

- Variable shows red: key is missing in the active environment.
- Value not changing: verify you switched to the intended environment.
- URL fails after replacement: check protocol (`http`/`https`) and host value.
