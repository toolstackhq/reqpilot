# Request Testing and Script Console

ReqPilot supports JavaScript in both pre-request and post-request stages.

## Runtime API

- `rp.env.get(key)` / `rp.env.set(key, value)`
- `rp.request.url`, `rp.request.body`
- `rp.request.headers.set(key, value)`
- `rp.response.status`, `rp.response.time`
- `rp.response.json()`, `rp.response.text()`
- `rp.response.headers.get(key)`
- `rp.test(name, fn)`
- `rp.expect(value)`

Supported assertions include:

- `toBe`
- `toBeGreaterThan`
- `toBeGreaterThanOrEqual`
- `toBeLessThan`
- `toBeLessThanOrEqual`
- `toContain`
- `toHaveProperty`
- `toBeTruthy`
- `toBeFalsy`

## Typical Post-request Tests

```js
rp.test("status is 2xx", () => {
  rp.expect(rp.response.status).toBeGreaterThanOrEqual(200);
  rp.expect(rp.response.status).toBeLessThan(300);
});
```

```js
rp.test("every item has email", () => {
  const body = rp.response.json();
  rp.expect(Array.isArray(body)).toBe(true);
  rp.expect(body.every((item) => typeof item.email === "string" && item.email.length > 0)).toBe(true);
});
```

## Pre-request Utility Example

```js
const randomString = (length = 16) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const generated = randomString(16);
rp.env.set("random_string", generated);
console.log("random_string", generated);
```

## Test Results + Console Visibility

- Response tab `Test Results` shows pass/fail per test.
- Script logs appear in response-level `Script Console`.
- Global `Console` drawer shows request-by-request logs.

<div class="rp-shot">
  <img src="/screenshots/response-test-results.png" alt="Response test results in ReqPilot" />
</div>

## Snippets Included in UI

Pre-request snippets include UUID/email/random generation and payload/header helpers.

Post-request snippets include status tests, response-time checks, property assertions, array/email checks, and header checks.
