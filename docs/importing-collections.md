# Importing Collections

ReqPilot can bootstrap your workspace from existing API definitions quickly.

## Supported Formats

- Postman Collection `v2.0` and `v2.1`
- OpenAPI `3.x` (JSON or YAML)
- Swagger `2.0` (JSON or YAML)

## Import Flow

1. Click `Import` from the top bar.
2. Choose file.
3. ReqPilot detects and parses the format.
4. Imported requests appear under Collections.

## What Gets Mapped

- Request name
- Method
- URL and query params
- Headers
- Body payload
- Authorization (where supported)

## Practical Tips

- Define variables in an environment after import when placeholders exist.
- Keep source collections under version control; re-import after major upstream changes.
- Use workspace isolation when testing imports from multiple teams.
