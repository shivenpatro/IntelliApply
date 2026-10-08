# IntelliApply frontend

React 19, TypeScript, Vite 8 and Tailwind 4. Node 24 is the supported toolchain.

From this directory:

```bash
npm ci
npm run dev
npm run lint -- --max-warnings 0
npm test
```

The development API proxy targets the local backend on port 8000. [.env.production](.env.production) records the existing public Render API and Neon auth destinations; host variables override it. Use dedicated API/auth destinations for staging; see [.env.example](.env.example). Every `VITE_*` value is public browser configuration, so keep provider keys and database credentials in the backend environment.

Browser tests build and serve the frontend with synthetic auth/API responses. They do not send email, call a paid model or prove live provider configuration. A Chromium installation is required; use `npx playwright install chromium` or set `CHROMIUM_PATH` to a compatible system browser.

See the [project README](../README.md), [remediation report](../docs/REMEDIATION.md) and [release guide](../docs/RELEASE.md) for setup, all test commands and the staging acceptance walkthrough.
