# Importing Collections

ReqPilot supports importing API definitions and collections so you can start testing immediately.

## Supported Formats

- Postman Collection v2.0
- Postman Collection v2.1
- OpenAPI 3.x (JSON/YAML)
- Swagger 2.0 (JSON/YAML)

## How to Import

1. Open ReqPilot.
2. Click **Import** in the top area.
3. Choose a file from your system.
4. ReqPilot detects format and parses requests.
5. Imported requests appear in your collections panel.

## What Gets Imported

- Request name
- Method
- URL
- Query parameters
- Headers
- Body payload (where applicable)
- Auth details (when present in source)

## Import Tips

- If a file includes unresolved variables, define them in an environment before sending requests.
- If your source file has unsupported fields, ReqPilot keeps core request data and skips unknown metadata.
