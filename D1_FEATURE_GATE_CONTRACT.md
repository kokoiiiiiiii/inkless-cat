# D1 Feature Gate Contract

## Gate

The App renders M01 only when both conditions are true:

```ts
import.meta.env.DEV && import.meta.env.VITE_ENABLE_M01_PROFILE_SLICE === 'true'
```

When false or unset, the existing `EditorPage` remains the rendered application. No navigation item, URL parameter, query-string shortcut or production route is added. The opt-in page is inside the same I18n, feedback, AI and Store providers as the official editor.

## Test invocation

The dedicated `playwright.m01.config.ts` launches a separate Vite dev server with `VITE_ENABLE_M01_PROFILE_SLICE=true` and a distinct port. The standard Playwright configuration launches the default app without the flag and includes an entry-preservation test.

The experiment does not seed or overwrite Resume state. Browser tests seed only their own new context with a synthetic, Schema-valid resume under the formal test storage key. No PoC storage key is read or written.

## Final verification

- The default production build had no `M01ProfileSliceRuntime` chunk or M01 stylesheet in `dist/`; Vite tree-shook the conditional dynamic import because `import.meta.env.DEV` is false.
- The standard Playwright config ran the default-entry check successfully as part of 87/87 full-suite passes. `/` and `/?m01=1` both retained the existing Editor; the query string did not enable M01.
- `playwright.m01.config.ts` supplied the explicit Vite dev-server flag on isolated port 5175; its four opt-in tests passed.

## Release boundary

Default build is expected to keep the flag false because `DEV` is false in production. The gate must be verified from built output and from default/opt-in isolated browser contexts. It is not an authentication boundary. Visual G3 remains pending and user approval remains false regardless of engineering outcomes.
