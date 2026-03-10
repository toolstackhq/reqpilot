# Environments and Variables

Use environments to avoid hardcoding hosts, tokens, or tenant IDs.

## Variable Syntax

```text
{{variable_name}}
```

Example URL:

```bash
http://{{host}}:4444/api/users/{{user_id}}
```

## Create and Use an Environment

1. Open `Environments`.
2. Create environment (for example, `local` or `staging`).
3. Add key/value rows.
4. Save and switch active environment.
5. Send requests using template variables with double-curly syntax.

<div class="rp-shot">
  <img src="/screenshots/environment-manager.png" alt="Environment manager with variable editor" />
</div>

## Resolution Behavior

- Resolved variables show in green.
- Missing variables show in red.

<div class="rp-shot">
  <img src="/screenshots/variable-resolution.png" alt="Resolved and unresolved variables in status bar" />
</div>

## Where Variables Work

### URL

```bash
http://{{host}}:4444/api/users/{{user_id}}
```

### Headers

```http
Authorization: Bearer {{token}}
X-Tenant: {{tenant_id}}
```

### JSON Body

```json
{
  "email": "{{email}}",
  "role": "{{role}}"
}
```

### Authorization Fields

```text
Bearer {{token}}
```

## Troubleshooting

- Red variable chip: key missing in active environment.
- Wrong value used: check current active environment in footer.
- URL failed after replacement: validate host/protocol and resolved path.
