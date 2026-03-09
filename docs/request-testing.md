# Request Testing

ReqPilot supports JavaScript-based **pre-request** and **post-request** scripts using the `rp` runtime object.

## Runtime Quick Reference

- `rp.env.get(key)` / `rp.env.set(key, value)`
- `rp.request.url` / `rp.request.body`
- `rp.request.headers.set(key, value)`
- `rp.response.status`
- `rp.response.time`
- `rp.response.json()` / `rp.response.text()`
- `rp.response.headers.get(key)`
- `rp.test(name, fn)`
- `rp.expect(value)` with assertions:
  - `toBe`
  - `toBeGreaterThan`
  - `toBeGreaterThanOrEqual`
  - `toBeLessThan`
  - `toBeLessThanOrEqual`
  - `toHaveProperty`
  - `toContain`
  - `toBeTruthy`
  - `toBeFalsy`

Script editor UX:
- JavaScript syntax highlighting in pre/post script editors
- `Format` button for quick script formatting

## Basic Examples

```js
rp.test("status is 200", () => {
  rp.expect(rp.response.status).toBe(200);
});
```

```js
rp.test("status is 2xx", () => {
  rp.expect(rp.response.status).toBeGreaterThanOrEqual(200);
  rp.expect(rp.response.status).toBeLessThan(300);
});
```

## Advanced Generator Examples

### Generate UUID and Reuse in Headers

```js
const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
rp.env.set("uuid", uuid);
rp.request.headers.set("X-Correlation-ID", uuid);
```

### Generate Random Email

```js
const seed = Math.random().toString(36).slice(2, 10);
rp.env.set("random_email", `user_${seed}@example.com`);
```

### Generate Random String / Password

```js
const randomString = (length = 16) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

rp.env.set("random_string", randomString(16));
```

### Use Generated Variable in Same Script + Log It

```js
const randomString = (length = 16) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

rp.env.set("random_string", randomString(16));
console.log(random_string);

rp.test("body has property from variable", () => {
  const body = rp.response.json();
  rp.expect(body).toHaveProperty(random_string);
});
```

### Build Random JSON Request Body

```js
const suffix = Math.random().toString(36).slice(2, 8);
const payload = {
  name: `user_${suffix}`,
  email: `user_${suffix}@example.com`
};

rp.request.body = JSON.stringify(payload, null, 2);
```

## Advanced Test Examples

### Assert Array Response Has Email for Every Row

```js
rp.test("every item has email", () => {
  const body = rp.response.json();
  rp.expect(Array.isArray(body)).toBe(true);
  rp.expect(body.every((item) => typeof item.email === "string" && item.email.length > 0)).toBe(true);
});
```

### Assert Response Header Exists

```js
rp.test("content-type header exists", () => {
  const contentType = rp.response.headers.get("content-type");
  rp.expect(Boolean(contentType)).toBe(true);
});
```

### Save Token from Login Response

```js
const body = rp.response.json();
if (body?.token) rp.env.set("token", body.token);

rp.test("token present", () => {
  rp.expect(Boolean(body?.token)).toBe(true);
});
```

## Console and Observability

- Script `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug` are captured.
- Logs show in:
  - Response Viewer → **Script Console** for the current response
  - Global **Console Drawer** for searchable request-by-request log history

## Built-in Snippet Catalog (UI)

### Pre-request Snippets

- Environment: Set an environment variable
- Environment: Set timestamp variable
- Environment: Set random number variable
- Utility: Generate UUID variable
- Utility: Generate random email variable
- Utility: Generate random string variable
- Request: Inject correlation ID header
- Request: Build random user JSON body

### Post-request Snippets

- Status code is 200
- Status code is 2xx
- Response time < 500ms
- Body contains property
- Body array: every item has email
- Response header exists
- Environment: Save token from response
