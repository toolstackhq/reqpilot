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

### URL Variables

```bash
http://{{host}}:4444/api/users/{{user_id}}
```

Use this for host switching and path parameters.

### Header Variables

```http
Authorization: Bearer {{token}}
X-Tenant: {{tenant_id}}
```

Useful for auth and multi-tenant headers.

### Body Variables

```json
{
  "name": "{{username}}",
  "email": "{{email}}",
  "tenant": "{{tenant_id}}"
}
```

Use this for reusable payload templates across environments.

### Authorization Variables

```bash
Bearer {{token}}
```

Works with authorization settings so tokens can rotate by environment.

## Troubleshooting

- Variable shows red: key is missing in the active environment.
- Value not changing: verify you switched to the intended environment.
- URL fails after replacement: check protocol (`http`/`https`) and host value.
