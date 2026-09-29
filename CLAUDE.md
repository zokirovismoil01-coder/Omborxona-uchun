# Kassa Nazorati — notes for Claude

The user writes in Uzbek (Latin script): reply in Uzbek. UI strings and code comments are Uzbek too.

## What this is
Shop cash-control app: POS, shifts, receipts, refunds/voids, nasiya (debt book), owner dashboard, reports.
One HTML page built from `src/`, published as a claude.ai Artifact
(https://claude.ai/artifact/LKxLGRcbmwhYNs2KrGmduG) and wrapped as an Android APK (`android/`).

## Commands
- `node build.mjs`: concatenates `src/styles.css` and `src/js/*.js` (filename order) into `kassa-nazorati/index.html`. Rebuild after every `src/` edit and commit both.
- `npm test`: build, then `tests/e2e.cjs` (34 checks), `tests/e2e-extra.cjs` (29), `tests/e2e-android.cjs` (41). Playwright + Chromium, a few minutes. One scenario: `node tests/e2e-extra.cjs localMode`.
- `node android/build-apk.mjs`: builds the APK without the Android SDK (aapt2, dx, apksig fetched from Maven Central into `~/.cache/kassa-apk`). Output `dist/KassaNazorati-<version>.apk`. Bump `VERSION_NAME`/`VERSION_CODE` in the script for a release.

## Rules
- Run `npm test` before every commit. Never commit with failing checks.
- Keep JS at ES2017 (no `??`, `?.`, object spread): old Android WebViews must parse it. Check by parsing the built page with acorn `ecmaVersion: 2017`.
- Never commit the signing key or its password (`*.p12`, `imzo-kaliti/`). Builds read `KASSA_KEYSTORE` and `KASSA_KEYSTORE_PASS`, else `~/.kassa-apk`. APK updates must use the same key or they will not install over the old app.
- Records are an append-only event log with a per-device hash chain (`seq`, `ph`, `h`). Never edit or delete events; corrections are new events.
- Artifact db limits: 5000 docs, about 256 KB per doc. Rules: `cfg/*` write owner, `sec/*` read interact.
- Escape all user data with `esc()` when building HTML.

## Layout
- `src/js/00-util` helpers, SHA-256, PBKDF2 PINs, CSV
- `10-store` localStorage wrapper, `LocalDB` (uses phone SQLite through `window.KassaNative` inside the APK)
- `20-engine` state `S`, emit/chain/queue/push, subscriptions, maintenance
- `30-model` accumulate, periodData, alerts, debtBook
- `40`–`70` UI: base, setup/login, POS, owner views. `75-native` Android bridge (print, share, backup/restore, back button). `80-actions` `ACT`/`IN`/`CH` handlers. `90-boot` `screen()` and boot.
- Test hook: `window.__kn` when `window.__KN_TEST__` is set. Harness: `tests/harness.cjs`, mock db `tests/mockdb.cjs`, mock `window.claude` `tests/mock-claude.js`.
- `android/`: `MainActivity` (WebView at https://app.kassa.local, JS bridge), `DocStore` (SQLite), `ShareProvider`, `tools/Pack.java` (4-byte alignment + v2 signing).
